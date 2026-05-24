// The Receipts engine: dedup -> config gate -> resolve reason -> compose -> deliver -> audit.
import { settings } from "@devvit/web/server";
import type { RemovalEvent, ReceiptRecord } from "../core/types.ts";
import { parseConfig, shouldExplain } from "../core/config.ts";
import { resolveReason } from "../core/reasonResolver.ts";
import { composeExplanation } from "../core/explanationComposer.ts";
import { makeReasonLookups } from "./reasonSources.ts";
import { deliver } from "./delivery.ts";
import { claimUnseen, writeRecord } from "./audit.ts";

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

  let deliveredVia = "suppressed";
  if (!optedOut) {
    const body = composeExplanation({
      reason,
      itemType: event.itemType,
      subreddit: event.subreddit,
      template: cfg.template,
      appealInstructions: cfg.appealInstructions,
      appealsEnabled: cfg.appealsEnabled,
    });
    deliveredVia = await deliver({
      channel: cfg.deliveryChannel,
      itemId: event.itemId,
      itemType: event.itemType,
      subreddit: event.subreddit,
      username: event.author,
      body,
    });
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
  };
  await writeRecord(record);
  console.log(`[receipts] ${event.source} ${event.itemType} ${event.itemId} -> ${reason.tier} -> ${deliveredVia}`);
}
