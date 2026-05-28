// Moderator menu actions: look up a user's removal history, view the recent log,
// and (new) open the Case File view — every removal grouped by rule, with outcomes.
import { context, redis } from "@devvit/web/server";
import {
  getRecent,
  getRecord,
  getRuleRecords,
  getUserRecords,
  listRules,
  markReversed,
  writeRecord,
} from "./audit.ts";
import type { ReceiptRecord } from "../core/types.ts";
import { computeRuleStats, ruleKey, ruleLabel } from "../core/caseLaw.ts";
import { publishMirror } from "./mirror.ts";

type Payload = Record<string, unknown>;

function fmtDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function activeSubName(): string {
  // context.subredditName is the runtime sub for the menu invocation.
  const anyCtx = context as unknown as { subredditName?: string };
  return anyCtx.subredditName ?? "";
}

export async function lookupUserMenu(): Promise<unknown> {
  return {
    showForm: {
      name: "lookupUser",
      form: {
        title: "Anvil Court — look up a user",
        acceptLabel: "Search",
        fields: [{ type: "string", name: "username", label: "Username (without u/)" }],
      },
    },
  };
}

export async function lookupUserForm(p: Payload): Promise<unknown> {
  const values = (p?.["values"] ?? {}) as Record<string, unknown>;
  const username = String(values["username"] ?? "")
    .replace(/^u\//, "")
    .trim();
  if (!username) return { showToast: "Enter a username." };

  const records = await getUserRecords(username, 10);
  if (!records.length) return { showToast: `No records for u/${username}.` };

  const lines = records.map(
    (r) =>
      `${fmtDate(r.ts)} ${r.itemType} — ${r.reasonText.slice(0, 60)}` +
      (r.appealStatus !== "none" ? ` [${r.appealStatus}]` : ""),
  );
  return { showToast: `u/${username}: ${records.length} removal(s)\n${lines.join("\n")}` };
}

export async function recentLogMenu(): Promise<unknown> {
  const records = await getRecent(15);
  if (!records.length) return { showToast: "No removals logged yet." };
  const lines = records.map((r) => `u/${r.author} ${r.itemType} — ${r.reasonText.slice(0, 50)}`);
  return { showToast: lines.join("\n") };
}

/** Opens a form that lets a mod pick a rule (by display label) and view its case file. */
export async function caseFileMenu(): Promise<unknown> {
  const sub = activeSubName();
  const rules = sub ? await listRules(sub, 30) : [];
  if (!rules.length) {
    return { showToast: "No rules have logged records yet." };
  }
  // Build a select with up-to-30 rules; show counts inline so mods can spot the heavy hitters.
  const options = rules.slice(0, 30).map((r) => ({
    label: `${r.label}  (${r.count})`,
    value: r.slug,
  }));
  const first = options[0];
  if (!first) return { showToast: "No rules to show." };
  return {
    showForm: {
      name: "caseFile",
      form: {
        title: "Anvil Court — case file by rule",
        acceptLabel: "Open",
        fields: [
          {
            type: "select",
            name: "ruleSlug",
            label: "Rule",
            options,
            defaultValue: [first.value],
          },
        ],
      },
    },
  };
}

export async function caseFileForm(p: Payload): Promise<unknown> {
  const values = (p?.["values"] ?? {}) as Record<string, unknown>;
  const raw = values["ruleSlug"];
  const slug = String(Array.isArray(raw) ? raw[0] : (raw ?? "")).trim();
  if (!slug) return { showToast: "Pick a rule." };
  const sub = activeSubName();
  if (!sub) return { showToast: "Subreddit context unavailable." };

  const records = await getRuleRecords(sub, slug, 100);
  const head = records[0];
  if (!head) return { showToast: "No records for that rule." };
  // Resolve display label from the first record (newest-first ordering).
  const display = head.ruleRef || head.reasonText.slice(0, 60);
  const stats = computeRuleStats(records);
  const rate = stats.total > 0 ? Math.round((stats.overturned / stats.total) * 100) : 0;
  const lines: string[] = [];
  lines.push(
    `${display}: ${stats.total} total, ${stats.overturned} reversed (${rate}%), ${stats.upheld} upheld, ${stats.appealed} open, ${stats.none} not appealed.`,
  );
  for (const r of records.slice(0, 15)) {
    const tag = r.appealStatus !== "none" ? ` [${r.appealStatus}]` : "";
    lines.push(`${fmtDate(r.ts)} u/${r.author} ${r.itemType}${tag} — ${r.reasonText.slice(0, 60)}`);
  }
  return { showToast: lines.join("\n") };
}

/** Extract the targeted item id from a post- or comment-scoped menu payload.
 *  Devvit hasn't pinned the exact field name across versions — try the common ones. */
export function extractTargetItemId(p: Payload): string | undefined {
  const candidates = [
    p?.["targetId"],
    p?.["postId"],
    p?.["commentId"],
    p?.["thingId"],
    (p?.["target"] as Record<string, unknown> | undefined)?.["id"],
    (p?.["post"] as Record<string, unknown> | undefined)?.["id"],
    (p?.["comment"] as Record<string, unknown> | undefined)?.["id"],
    (p?.["location"] as Record<string, unknown> | undefined)?.["postId"],
    (p?.["location"] as Record<string, unknown> | undefined)?.["commentId"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^t[13]_/.test(c)) return c;
  }
  return undefined;
}

/** Menu handler: precedent for the item this menu was opened on (post or comment).
 *  Surfaces case law at the *triage* moment, not just at appeal. */
export async function precedentForItemMenu(p: Payload): Promise<unknown> {
  const itemId = extractTargetItemId(p);
  if (!itemId) {
    return {
      showToast:
        "Anvil Court: couldn't read the item id from this menu invocation. (Try the subreddit-level 'Anvil Court: case file by rule' instead.)",
    };
  }
  const record = await getRecord(itemId);
  if (!record) {
    return {
      showToast:
        `Anvil Court: no logged removal yet for ${itemId}. The case file is per-rule; this item may not have been removed (or was removed before the app was installed and didn't appear in backfill).`,
    };
  }
  const sub = (record.subreddit ?? activeSubName() ?? "").trim();
  if (!sub) {
    return { showToast: "Anvil Court: subreddit context unavailable." };
  }
  const slug = ruleKey({ ruleRef: record.ruleRef, reasonText: record.reasonText });
  const display = ruleLabel({ ruleRef: record.ruleRef, reasonText: record.reasonText });
  const records = await getRuleRecords(sub, slug, 100);
  const stats = computeRuleStats(records);
  const rate = stats.total > 0 ? Math.round((stats.overturned / stats.total) * 100) : 0;
  const status = record.appealStatus && record.appealStatus !== "none"
    ? ` This receipt: ${record.appealStatus}.`
    : "";
  const ageDays = Math.max(0, Math.round((Date.now() - record.ts) / (24 * 60 * 60 * 1000)));
  return {
    showToast:
      `${display}: ${stats.total} removals, ${stats.overturned} reversed (${rate}%), ${stats.upheld} upheld.${status} ` +
      `This removal: ${ageDays}d ago by ${record.modName ?? "unknown"}.`,
  };
}

/** Menu handler: SANDBOX — load 13 sample records (3 reversed) under "No spam" so a mod
 *  evaluating Anvil Court for the first time can see the precedent surfaces working
 *  immediately, without waiting for real removals to accumulate. Click "Sandbox: clear
 *  demo data" to remove them when done evaluating. */
export async function loadSandboxMenu(): Promise<unknown> {
  const sub = activeSubName();
  if (!sub) return { showToast: "Anvil Court: subreddit context unavailable." };
  const items = sandboxItemIds();
  // Idempotency: check if first item already exists
  const existing = await getRecord(items[0]!);
  if (existing) {
    return {
      showToast:
        "Sandbox already loaded. Clear it first with 'Sandbox: clear demo data' if you want to reload.",
    };
  }
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  for (let i = 0; i < items.length; i++) {
    const record: ReceiptRecord = {
      itemId: items[i]!,
      author: `demo_user_${String(i + 1).padStart(2, "0")}`,
      itemType: "post",
      source: "automod-filter",
      reasonText: "No spam",
      reasonTier: "filter-reason",
      deliveredVia: "sandbox",
      modName: "AutoModerator",
      ts: now - (items.length - i) * (DAY / 2),
      appealStatus: "none",
      subreddit: sub,
    };
    await writeRecord(record);
  }
  // Mark 3 records as overturned so the headline reads 3/13 = 23%
  for (const idx of [1, 5, 9]) {
    await markReversed(items[idx]!, now - (items.length - idx) * (DAY / 2) + 1000);
  }
  return {
    showToast:
      `Sandbox loaded: 13 sample 'No spam' records, 3 marked reversed (23%). ` +
      `Try: case file by rule → 'No spam', or publish public mirror.`,
  };
}

/** Menu handler: SANDBOX — clear the 13 sample records loaded by loadSandboxMenu. */
export async function clearSandboxMenu(): Promise<unknown> {
  const sub = activeSubName();
  if (!sub) return { showToast: "Anvil Court: subreddit context unavailable." };
  let cleared = 0;
  for (const id of sandboxItemIds()) {
    const r = await getRecord(id);
    if (!r) continue;
    // Best-effort wipe: remove the hash, the seen flag, the user/rule/recent indexes.
    // Devvit redis client doesn't expose a "delete record" helper; do it inline.
    const ITEM_KEY = `receipt:item:${id}`;
    const SEEN_KEY = "receipt:seen";
    const USER_KEY = `receipt:user:${r.author.toLowerCase()}`;
    const RECENT_KEY = "receipt:recent";
    await redis.del(ITEM_KEY).catch(() => undefined);
    await redis.hDel(SEEN_KEY, [id]).catch(() => undefined);
    await redis.zRem(USER_KEY, [id]).catch(() => undefined);
    await redis.zRem(RECENT_KEY, [id]).catch(() => undefined);
    if (r.subreddit) {
      const slug = ruleKey({ ruleRef: r.ruleRef, reasonText: r.reasonText });
      const RULE_KEY = `receipt:rule:${r.subreddit.toLowerCase()}:${slug}`;
      await redis.zRem(RULE_KEY, [id]).catch(() => undefined);
    }
    cleared++;
  }
  return { showToast: `Sandbox cleared: ${cleared} sample record(s) removed.` };
}

function sandboxItemIds(): string[] {
  return Array.from({ length: 13 }, (_, i) => `t3_demo${String(i + 1).padStart(2, "0")}`);
}

/** Menu handler: publish (or refresh) the public Mod Mirror wiki page. */
export async function publishMirrorMenu(): Promise<unknown> {
  const result = await publishMirror();
  if (!result.ok) {
    return { showToast: `Mirror publish failed: ${result.reason ?? "unknown error"}` };
  }
  if (result.totalReceipts === 0) {
    return { showToast: `Mirror published to /wiki/anvil-court. (Page is empty — no records logged yet.)` };
  }
  return {
    showToast: `Mirror published to /wiki/anvil-court — ${result.ruleCount} rule(s), ${result.totalReceipts} record(s).`,
  };
}

// Re-export for symmetry — referenced by other module imports if any.
export { ruleKey };
