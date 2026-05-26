// Thin adapters: parse Devvit trigger payloads into a RemovalEvent and run the
// pipeline. Payload field paths confirmed via the day-1 spike (see SPIKE_RESULTS.md).
import { context, reddit } from "@devvit/web/server";
import type { RemovalEvent, RemovalSource, ItemType, ReceiptRecord } from "../core/types.ts";
import { processRemoval } from "./pipeline.ts";
import {
  getRecord,
  getRuleRecords,
  getRecentReversals,
  getUserRecords,
  lookupConv,
  markReversed,
  setAppealStatus,
} from "./audit.ts";
import { isAppealReply, pickReceiptToFlag } from "../core/appealMatch.ts";
import {
  composePrecedentPanel,
  composeReversalModConfirm,
  composeReversalUserDM,
  composeUserReceiptsList,
  computeRuleStats,
  parseModCommand,
  parseUserCommand,
  ruleKey,
  ruleLabel,
} from "../core/caseLaw.ts";
import { deliverModmail } from "./delivery.ts";
import { backfillOnInstall } from "./backfill.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Payload = Record<string, any>;

// On install, post a one-time welcome to the mod team explaining the app is active.
export async function handleAppInstall(): Promise<void> {
  try {
    const subredditId = context.subredditId;
    if (!subredditId) return;
    await reddit.modMail.createModDiscussionConversation({
      subject: "Anvil Court is now active",
      bodyMarkdown:
        "**Anvil Court is installed and running.** The case-law engine for r/" + (context as unknown as { subredditName?: string }).subredditName + ".\n\n" +
        "When a post or comment is removed — by a mod, by AutoModerator's silent filter, by an AutoMod remove rule, or by Reddit's spam filter — the author now automatically gets a clear, rule-cited explanation with an appeal option, and the decision is logged.\n\n" +
        "**Case law for moderation, three surfaces, one substrate:**\n" +
        "- **Triage:** mod menu on any post or comment → *Anvil Court: precedent for this item* — see the rule's prior outcomes before you decide.\n" +
        "- **Appeal:** when a user appeals via modmail, Anvil Court auto-renders an internal note in the same thread showing the rule's reversal rate and recent reversals. Reply **`/reverse [note]`** to one-click restore the content, DM the user, and log the reversal as precedent.\n" +
        "- **Public ledger:** mod menu → *Anvil Court: publish public mirror* — refresh an aggregate, anonymized case-law page at /wiki/anvil-court. Counts only, no usernames or links.\n" +
        "- **Look up:** menu → *Anvil Court: look up user* / *recent removals* / *case file by rule*.\n" +
        "- **Self-serve:** users can DM the sub with `/my-receipts` to see their own history.\n" +
        "- **Cold-start:** we've backfilled the last 90 days of your mod log so precedent works from day one.\n\n" +
        "Appeals come to *you* — Anvil Court never overturns a removal automatically.",
      subredditId: subredditId as `t5_${string}`,
    });
  } catch (e) {
    console.error("[anvilcourt] welcome modmail failed:", e);
  }
  // Cold-start: backfill the last 90 days of modlog so the precedent panel has
  // a populated corpus on the first appeal. Errors are logged inside, not thrown.
  try {
    await backfillOnInstall();
  } catch (e) {
    console.error("[anvilcourt] backfill threw:", e);
  }
}

const REMOVE_ACTIONS = new Set(["removelink", "removecomment", "spamlink", "spamcomment"]);

function isT2(s: string): boolean {
  return /^t2_/.test(s);
}

// ModAction payloads carry the author as a t2_ id (even in fields named "author"),
// but modmail's `to` needs a username — resolve it. Pass through a real username.
async function resolveUsername(rawName: string, fallbackId: string | undefined): Promise<string> {
  if (rawName && !isT2(rawName)) return rawName;
  const id = isT2(rawName) ? rawName : fallbackId;
  if (id) {
    const u = await reddit.getUserById(id as `t2_${string}`).catch(() => undefined);
    if (u?.username) return u.username;
  }
  return "";
}

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
    author = await resolveUsername(p?.targetComment?.author ?? "", p?.targetUser?.id);
  } else {
    itemId = p?.targetPost?.id ?? "";
    author = await resolveUsername(p?.targetUser?.name ?? "", p?.targetPost?.authorId ?? p?.targetUser?.id);
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
  const rawAuthor: string = p?.author ?? target?.author ?? target?.authorName ?? "";
  const author = await resolveUsername(rawAuthor, target?.authorId);
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

// Fetch the conversation and locate the latest message body + the non-mod participant.
async function readConversation(conversationId: string): Promise<{
  participantName?: string;
  latestMessageBody?: string;
  latestMessageId?: string;
  isFromMod?: boolean;
  subredditName?: string;
}> {
  if (!conversationId) return {};
  try {
    const res = (await reddit.modMail.getConversation({ conversationId })) as any;
    const conv = res?.conversation ?? res;
    const participant = conv?.participant ?? conv?.user;
    const participantName: string | undefined = participant?.name;
    const subredditName: string | undefined = conv?.subreddit?.displayName ?? conv?.subreddit?.name;
    const messagesObj: Record<string, any> = conv?.messages ?? {};
    // messages may be an object keyed by id; pick the newest by date.
    const messages = Object.values(messagesObj);
    messages.sort((a, b) => {
      const da = Date.parse(a?.date ?? a?.createdAt ?? "") || 0;
      const db = Date.parse(b?.date ?? b?.createdAt ?? "") || 0;
      return db - da; // newest first
    });
    const m = messages[0];
    const body: string | undefined = m?.bodyMarkdown ?? m?.body;
    const isFromMod = Boolean(m?.author?.isMod ?? m?.isInternal);
    return {
      participantName,
      latestMessageBody: body,
      latestMessageId: m?.id,
      isFromMod,
      subredditName,
    };
  } catch (e) {
    console.error("[anvilcourt] getConversation failed:", e);
    return {};
  }
}

async function postInternalNote(conversationId: string, body: string): Promise<void> {
  try {
    await reddit.modMail.reply({ conversationId, body, isInternal: true });
  } catch (e) {
    console.error("[anvilcourt] internal modmail reply failed:", e);
  }
}

async function postPublicReply(conversationId: string, body: string): Promise<void> {
  try {
    await reddit.modMail.reply({ conversationId, body, isInternal: false, isAuthorHidden: true });
  } catch (e) {
    console.error("[anvilcourt] public modmail reply failed:", e);
  }
}

// Render the precedent panel for the target receipt and post it as an internal mod note.
async function emitPrecedentPanel(
  conversationId: string,
  target: ReceiptRecord,
  subreddit: string,
): Promise<void> {
  const slug = ruleKey({ ruleRef: target.ruleRef, reasonText: target.reasonText });
  const display = ruleLabel({ ruleRef: target.ruleRef, reasonText: target.reasonText });
  const [ruleRecords, recentReversals, appellantRecords] = await Promise.all([
    getRuleRecords(subreddit, slug, 100),
    getRecentReversals(subreddit, slug, 3),
    getUserRecords(target.author, 100),
  ]);
  const stats = computeRuleStats(ruleRecords);
  const appellantPriorTotal = appellantRecords.length;
  const appellantPriorOverturned = appellantRecords.filter((r) => r.appealStatus === "overturned").length;
  const body = composePrecedentPanel({
    subreddit,
    ruleDisplay: display,
    stats,
    recentReversals,
    appellantUser: target.author,
    appellantPriorTotal,
    appellantPriorOverturned,
  });
  await postInternalNote(conversationId, body);
}

// Mod issued /reverse: approve the item, DM the user, log overturned, confirm in-thread.
async function performReversal(
  conversationId: string,
  target: ReceiptRecord,
  subreddit: string,
  note: string,
): Promise<void> {
  // 1. Restore content on Reddit.
  try {
    await reddit.approve(target.itemId as `t1_${string}` | `t3_${string}`);
  } catch (e) {
    console.error(`[anvilcourt] approve failed for ${target.itemId}:`, e);
    await postInternalNote(
      conversationId,
      `Anvil Court: tried to reverse ${target.itemId} but **approve failed** — see logs. The item may already be approved or no longer exist.`,
    );
    return;
  }

  // 2. DM the user with a fresh modmail (separate thread, clean subject for the user).
  const ruleDisplay = ruleLabel({ ruleRef: target.ruleRef, reasonText: target.reasonText });
  const dmBody = composeReversalUserDM({
    subreddit,
    itemType: target.itemType,
    ruleDisplay,
    note,
    itemId: target.itemId,
  });
  await deliverModmail(subreddit, target.author, "Your removed content has been restored", dmBody);

  // 3. Log overturned (feeds future precedent panels).
  await markReversed(target.itemId, Date.now());

  // 4. Confirm in the appeal thread (internal).
  await postInternalNote(
    conversationId,
    composeReversalModConfirm({ itemId: target.itemId, appellantUser: target.author, note }),
  );
}

// Resolve which receipt a modmail conversation is about, prioritizing the explicit
// conversation→record mapping written at outbound time.
async function resolveTargetReceipt(
  conversationId: string,
  participantName: string | undefined,
): Promise<ReceiptRecord | undefined> {
  if (conversationId) {
    const conv = await lookupConv(conversationId);
    if (conv?.itemId) {
      const r = await getRecord(conv.itemId);
      if (r) return r;
    }
  }
  if (!participantName) return undefined;
  // Fall back to the participant's most-recent receipt within the appeal window.
  const records = await getUserRecords(participantName, 25);
  return pickReceiptToFlag(records, Date.now(), APPEAL_WINDOW_MS) ?? records[0];
}

// ModMail trigger v2: user reply → flag appeal + render precedent panel + handle /my-receipts.
// Mod reply with /reverse → execute reversal flow.
export async function handleModMail(p: Payload): Promise<void> {
  const conversationId: string = p?.conversationId ?? "";
  const messageAuthorType: string = p?.messageAuthorType ?? "";
  const isAutoGenerated: boolean = Boolean(p?.isAutoGenerated);
  const conversationType: string = p?.conversationType ?? "";
  if (isAutoGenerated) return;
  // Mod-internal discussions never carry user appeals or /reverse from us.
  if (conversationType === "internal") return;

  const triggerAuthor: string | undefined = p?.messageAuthor?.name;
  const triggerSaysMod: boolean = messageAuthorType === "moderator";

  // Fetch the full conversation to get the latest message body and the participant user.
  const conv = await readConversation(conversationId);
  const isFromMod = triggerSaysMod || Boolean(conv.isFromMod);
  const body = conv.latestMessageBody ?? "";
  const participantName = conv.participantName;
  const subredditName = conv.subredditName ?? p?.conversationSubreddit?.name ?? p?.subreddit?.name ?? "";

  if (isFromMod) {
    // Look for /reverse (or /uphold) command.
    const cmd = parseModCommand(body);
    if (cmd.kind === "none") return;
    const target = await resolveTargetReceipt(conversationId, participantName);
    if (!target) {
      await postInternalNote(
        conversationId,
        "Anvil Court: couldn't find a logged removal for this conversation. (Reversal commands work on appeal threads created by Anvil Court.)",
      );
      return;
    }
    if (cmd.kind === "reverse") {
      await performReversal(conversationId, target, subredditName || target.subreddit || "", cmd.note);
    } else {
      // /uphold = explicitly mark upheld, no Reddit-side action.
      await setAppealStatus(target.itemId, "upheld", Date.now());
      await postInternalNote(
        conversationId,
        `Anvil Court: marked ${target.itemId} as **upheld**.${cmd.note ? ` Note: "${cmd.note}"` : ""}`,
      );
    }
    return;
  }

  // User reply path: existing appeal flagging + new precedent panel + /my-receipts.
  if (!triggerAuthor && !participantName) return;
  const author = triggerAuthor ?? participantName ?? "";

  // /my-receipts keyword — answer in the same conversation as a public reply.
  const userCmd = parseUserCommand(body);
  if (userCmd.kind === "my-receipts") {
    const records = await getUserRecords(author, 20);
    await postPublicReply(conversationId, composeUserReceiptsList({ username: author, records }));
    // Don't fall through to appeal flagging on a self-info request.
    return;
  }

  // Appeal flagging (legacy behavior, preserved).
  const records = await getUserRecords(author, 25);
  if (!isAppealReply({ hasRecentReceipt: records.length > 0, isFromModerator: false, isInternal: false })) return;

  const target =
    (await resolveTargetReceipt(conversationId, author)) ??
    pickReceiptToFlag(records, Date.now(), APPEAL_WINDOW_MS);
  if (!target) return;

  if (target.appealStatus === "none") {
    await setAppealStatus(target.itemId, "appealed", Date.now());
  }

  // Emit the precedent panel as an internal mod note (skip if we've already rendered for this thread).
  const sub = subredditName || target.subreddit || "";
  if (sub) {
    await emitPrecedentPanel(conversationId, target, sub);
  }
}
