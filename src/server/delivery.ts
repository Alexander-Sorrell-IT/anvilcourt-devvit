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

/** Returns the conversationId on success so callers can index modmail threads → records. */
export async function deliverModmail(
  subreddit: string,
  username: string,
  subject: string,
  body: string,
): Promise<string | undefined> {
  try {
    const res = await reddit.modMail.createConversation({
      subredditName: subreddit,
      to: username,
      subject,
      body,
      isAuthorHidden: true, // send as the subreddit, not the app account
    });
    // The Devvit response wraps the conversation object; pluck the id defensively.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const anyRes = res as any;
    const id: string | undefined =
      anyRes?.conversation?.id ?? anyRes?.conversationId ?? anyRes?.id;
    return id;
  } catch (e) {
    console.error(`[receipts] modmail delivery failed for u/${username}:`, e);
    return undefined;
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

export interface DeliverResult {
  /** Short tag describing which channels actually delivered, e.g. "comment+modmail". */
  tag: string;
  /** Set when a modmail conversation was successfully created. */
  modmailConversationId?: string;
}

export async function deliver(opts: DeliverInput): Promise<DeliverResult> {
  const parts: string[] = [];
  let modmailConversationId: string | undefined;
  const wantComment = opts.channel === "comment" || opts.channel === "both";
  const wantModmail = opts.channel === "modmail" || opts.channel === "both";
  if (wantComment && opts.itemId && (await deliverComment(opts.itemId, opts.body))) {
    parts.push("comment");
  }
  if (wantModmail && opts.username) {
    const convId = await deliverModmail(opts.subreddit, opts.username, "Your content was removed", opts.body);
    if (convId !== undefined) {
      parts.push("modmail");
      modmailConversationId = convId;
    }
  }
  return { tag: parts.length ? parts.join("+") : "none", modmailConversationId };
}
