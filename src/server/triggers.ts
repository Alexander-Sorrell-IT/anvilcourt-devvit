// Thin adapters: parse Devvit trigger payloads into a RemovalEvent and run the
// pipeline. Payload field paths confirmed via the day-1 spike (see SPIKE_RESULTS.md).
import { reddit } from "@devvit/web/server";
import type { RemovalEvent, RemovalSource, ItemType } from "../core/types.ts";
import { processRemoval } from "./pipeline.ts";
import { getUserRecords, setAppealStatus } from "./audit.ts";
import { isAppealReply, pickReceiptToFlag } from "../core/appealMatch.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Payload = Record<string, any>;

const REMOVE_ACTIONS = new Set(["removelink", "removecomment", "spamlink", "spamcomment"]);

export async function handleModAction(p: Payload): Promise<void> {
  const action: string = p?.action ?? "";
  if (!REMOVE_ACTIONS.has(action)) return;

  const isComment = action.endsWith("comment");
  const modName: string | undefined = p?.moderator?.name || undefined;
  const isAutomod = modName === "AutoModerator";
  const isSpam = action.startsWith("spam");
  const source: RemovalSource = isAutomod ? "automod-remove" : isSpam ? "spam" : "mod";

  let itemId = "";
  let author = "";
  if (isComment) {
    itemId = p?.targetComment?.id ?? "";
    author = p?.targetComment?.author ?? p?.targetUser?.name ?? "";
  } else {
    itemId = p?.targetPost?.id ?? "";
    author = p?.targetUser?.name ?? "";
    const authorId: string | undefined = p?.targetPost?.authorId;
    if (!author && authorId) {
      const u = await reddit.getUserById(authorId as `t2_${string}`).catch(() => undefined);
      author = u?.username ?? "";
    }
  }
  if (!itemId || !author) return;

  const event: RemovalEvent = {
    itemId,
    itemType: (isComment ? "comment" : "post") as ItemType,
    author,
    subreddit: p?.subreddit?.name ?? "",
    source,
    modName,
    ts: Date.now(),
  };
  await processRemoval(event);
}

export async function handleAutomodFilter(p: Payload, itemType: ItemType): Promise<void> {
  const target = itemType === "post" ? p?.post : p?.comment;
  const itemId: string = target?.id ?? "";
  const author: string = p?.author ?? target?.author ?? target?.authorName ?? "";
  if (!itemId || !author) return;

  const event: RemovalEvent = {
    itemId,
    itemType,
    author,
    subreddit: p?.subreddit?.name ?? "",
    source: "automod-filter",
    rawReason: typeof p?.reason === "string" ? p.reason : undefined,
    modName: "AutoModerator",
    ts: Date.now(),
  };
  await processRemoval(event);
}

const APPEAL_WINDOW_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

// Basic v1: a user's modmail reply with a recent receipt is flagged "appealed".
// The reply already lands in the mod inbox, so mods see it; we only add tracking.
export async function handleModMail(p: Payload): Promise<void> {
  const author: string | undefined = p?.messageAuthor?.name ?? p?.author?.name;
  const isFromModerator = Boolean(p?.messageAuthor?.isMod ?? p?.isModerator);
  const isInternal = p?.conversationType === "internal" || p?.isInternal === true;
  if (!author) return;

  const records = await getUserRecords(author, 25);
  if (!isAppealReply({ hasRecentReceipt: records.length > 0, isFromModerator, isInternal })) return;

  const target = pickReceiptToFlag(records, Date.now(), APPEAL_WINDOW_MS);
  if (target) await setAppealStatus(target.itemId, "appealed", Date.now());
}
