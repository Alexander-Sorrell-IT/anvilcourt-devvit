// The Receipts engine: dedup -> config gate -> resolve reason -> compose -> deliver -> audit.
import { settings } from "@devvit/web/server";
import type { RemovalEvent, ReceiptRecord } from "../core/types.ts";
import { parseConfig, shouldExplain } from "../core/config.ts";
import { resolveReason } from "../core/reasonResolver.ts";
import { composeExplanation } from "../core/explanationComposer.ts";
import { makeReasonLookups } from "./reasonSources.ts";
import { deliver } from "./delivery.ts";
import { bumpAuthorFilterCounter, claimUnseen, rememberConv, writeRecord } from "./audit.ts";

export async function processRemoval(event: RemovalEvent): Promise<void> {
  if (!event.itemId || !event.author) return;

  // Dedup: ModAction and AutomoderatorFilter can both fire for one item.
  if (!(await claimUnseen(event.itemId))) return;

  // Load mod config; fall back to all-defaults if settings are unavailable.
  let raw: Record<string, unknown> = {};
  try {
    raw = (await settings.getAll()) as Record<string, unknown>;
  } catch (err) {
    console.error("[receipts] settings.getAll failed; using defaults:", err);
  }
  const cfg = parseConfig(raw);
  if (!shouldExplain(event.source, cfg)) return;

  const reason = await resolveReason(event, makeReasonLookups(event.subreddit));

  const optedOut = cfg.perReasonOptOut.some(
    (o) => reason.ruleRef === o || reason.text.toLowerCase().includes(o.toLowerCase()),
  );

  // Per-author daily rate cap on AutoMod silent-filter explanations: prevents the silent
  // filter from becoming a spammer feedback channel. Applies only to automod-filter source.
  let rateLimited = false;
  if (!optedOut && event.source === "automod-filter" && cfg.automodFilterDailyCap > 0) {
    const count = await bumpAuthorFilterCounter(event.subreddit, event.author, event.ts);
    if (count > cfg.automodFilterDailyCap) {
      rateLimited = true;
    }
  }

  let deliveredVia = "suppressed";
  let modmailConvId: string | undefined;
  if (!optedOut && !rateLimited) {
    const body = composeExplanation({
      reason,
      itemType: event.itemType,
      subreddit: event.subreddit,
      template: cfg.template,
      appealInstructions: cfg.appealInstructions,
      appealsEnabled: cfg.appealsEnabled,
    });
    const result = await deliver({
      channel: cfg.deliveryChannel,
      itemId: event.itemId,
      itemType: event.itemType,
      subreddit: event.subreddit,
      username: event.author,
      body,
    });
    deliveredVia = result.tag;
    modmailConvId = result.modmailConversationId;
  } else if (rateLimited) {
    deliveredVia = "rate-limited";
  }

  const record: ReceiptRecord = {
    itemId: event.itemId,
    author: event.author,
    itemType: event.itemType,
    source: event.source,
    reasonText: reason.text,
    reasonTier: reason.tier,
    ruleRef: reason.ruleRef,
    deliveredVia,
    modName: event.modName,
    ts: event.ts,
    appealStatus: "none",
    subreddit: event.subreddit,
  };
  await writeRecord(record);
  if (modmailConvId) {
    await rememberConv(modmailConvId, { itemId: event.itemId, user: event.author });
  }
  console.log(`[receipts] ${event.source} ${event.itemType} ${event.itemId} -> ${reason.tier} -> ${deliveredVia}`);
}
