// Cold-start backfill: when Receipts is freshly installed on a sub, walk recent
// moderation log entries and seed the case-law corpus. Records ONLY — no
// delivery (we don't notify the user about a removal that happened weeks ago).
import { context, reddit } from "@devvit/web/server";
import type { ReceiptRecord, RemovalSource, ItemType } from "../core/types.ts";
import { claimUnseen, writeRecord } from "./audit.ts";

// ModActionType values from @devvit/reddit/models/ModAction. Hard-coded as a set
// to avoid importing the union at runtime (it's a type-only export).
const REMOVE_ACTION_TYPES: ReadonlySet<string> = new Set([
  "removelink",
  "removecomment",
  "spamlink",
  "spamcomment",
]);

const BACKFILL_WINDOW_DAYS = 90;
const BACKFILL_MAX_ENTRIES = 1000; // ceiling to keep install fast and Redis writes bounded

type AnyEntry = Record<string, unknown> & {
  type?: string;
  moderatorName?: string;
  createdAt?: Date | string;
  target?: { id?: string; author?: string };
  details?: string;
  description?: string;
};

function itemTypeForAction(action: string): ItemType {
  return action.endsWith("comment") ? "comment" : "post";
}

function sourceForAction(action: string, modName?: string): RemovalSource {
  if (modName === "AutoModerator") return "automod-remove";
  if (action.startsWith("spam")) return "spam";
  return "mod";
}

function asNumberTs(input: unknown): number {
  if (input instanceof Date) return input.getTime();
  if (typeof input === "string") {
    const t = Date.parse(input);
    if (Number.isFinite(t)) return t;
  }
  if (typeof input === "number") return input;
  return Date.now();
}

/** Run a best-effort backfill. Idempotent — uses claimUnseen so re-runs skip
 *  items already on file. Logs progress; never throws. */
export async function backfillOnInstall(): Promise<{ scanned: number; written: number }> {
  const sub = (context as unknown as { subredditName?: string }).subredditName ?? "";
  if (!sub) {
    console.log("[receipts] backfill skipped: no subreddit context");
    return { scanned: 0, written: 0 };
  }
  const cutoff = Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  let scanned = 0;
  let written = 0;
  try {
    // Listing returns ModAction entries newest-first; we cap and stop at cutoff.
    const listing = reddit.getModerationLog({ subredditName: sub, limit: BACKFILL_MAX_ENTRIES });
    const entries = (await listing.all()) as unknown as AnyEntry[];
    for (const e of entries) {
      scanned++;
      const action = String(e.type ?? "");
      if (!REMOVE_ACTION_TYPES.has(action)) continue;
      const ts = asNumberTs(e.createdAt);
      if (ts < cutoff) break; // entries are newest-first; older from here doesn't matter
      const itemId = e.target?.id;
      const author = e.target?.author;
      if (!itemId || !author) continue;

      // Dedup against any record already on file (real triggers or earlier backfill).
      if (!(await claimUnseen(itemId))) continue;

      const reasonText = (e.details && e.details.trim())
        || (e.description && e.description.trim())
        || "Your content was removed by the moderators of this community.";
      const record: ReceiptRecord = {
        itemId,
        author,
        itemType: itemTypeForAction(action),
        source: sourceForAction(action, e.moderatorName),
        reasonText,
        reasonTier: "mod-log",
        // We don't have ruleRef structurally from the modlog; the precedent
        // panel will key by slugified reasonText, which is acceptable for backfill.
        deliveredVia: "backfill",
        modName: e.moderatorName,
        ts,
        appealStatus: "none",
        subreddit: sub,
      };
      await writeRecord(record);
      written++;
    }
  } catch (err) {
    console.error("[receipts] backfill failed:", err);
  }
  console.log(`[receipts] backfill r/${sub}: scanned ${scanned}, wrote ${written} receipt(s)`);
  return { scanned, written };
}
