// Delivers the removal explanation to the user: an in-place stickied+distinguished
// comment and/or a modmail (the two-way appeal channel). Per-channel failures are
// logged loudly and degrade (e.g. comment fails on a removed comment -> modmail still sends).
import { reddit } from "@devvit/web/server";
import type { ItemType } from "../core/types.ts";

export async function deliverComment(itemId: string, body: string): Promise<boolean> {
  try {
    const comment = await reddit.submitComment({
      id: itemId as `t1_${string}` | `t3_${string}`,
      text: body,
    });
    await comment.distinguish(true); // sticky + distinguish (matches native removal-reason pattern)
    return true;
  } catch (e) {
    console.error(`[receipts] comment delivery failed for ${itemId}:`, e);
    return false;
  }
}

export async function deliverModmail(
  subreddit: string,
  username: string,
  subject: string,
  body: string,
): Promise<boolean> {
  try {
    await reddit.modMail.createConversation({
      subredditName: subreddit,
      to: username,
      subject,
      body,
      isAuthorHidden: true, // send as the subreddit, not the app account
    });
    return true;
  } catch (e) {
    console.error(`[receipts] modmail delivery failed for u/${username}:`, e);
    return false;
  }
}

export interface DeliverInput {
  channel: "comment" | "modmail" | "both" | "off";
  itemId: string;
  itemType: ItemType;
  subreddit: string;
  username: string;
  body: string;
}

/** Returns a short tag describing which channels actually delivered, e.g. "comment+modmail". */
export async function deliver(opts: DeliverInput): Promise<string> {
  const parts: string[] = [];
  const wantComment = opts.channel === "comment" || opts.channel === "both";
  const wantModmail = opts.channel === "modmail" || opts.channel === "both";
  if (wantComment && opts.itemId && (await deliverComment(opts.itemId, opts.body))) {
    parts.push("comment");
  }
  if (wantModmail && opts.username && (await deliverModmail(opts.subreddit, opts.username, "Your content was removed", opts.body))) {
    parts.push("modmail");
  }
  return parts.length ? parts.join("+") : "none";
}
