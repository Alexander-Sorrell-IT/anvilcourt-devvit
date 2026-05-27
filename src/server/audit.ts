// Redis-backed audit store for Anvil Court: dedup, decision records, per-user and
// recent indexes, per-rule index, appeal status. Uses the @devvit/web/server redis client.
import { redis } from "@devvit/web/server";
import type { ReceiptRecord, AppealStatus } from "../core/types.ts";
import { ruleKey } from "../core/caseLaw.ts";
import { sanitizeRuleLabel } from "../core/mirror.ts";

const SEEN = "receipt:seen"; // hash: itemId -> "1" (dedup)
const ITEM = (id: string): string => `receipt:item:${id}`; // hash: the record
const USER = (u: string): string => `receipt:user:${u.toLowerCase()}`; // zset ts->itemId
const RECENT = "receipt:recent"; // zset ts->itemId
const RULE = (sub: string, key: string): string => `receipt:rule:${sub.toLowerCase()}:${key}`; // zset ts->itemId
const RULE_LABEL = (sub: string, key: string): string => `receipt:rulelabel:${sub.toLowerCase()}:${key}`; // string: display label
const RULE_INDEX = (sub: string): string => `receipt:rules:${sub.toLowerCase()}`; // zset ts->ruleKey (first-seen)
const CONV = (id: string): string => `receipt:conv:${id}`; // hash: conversationId -> {itemId, user}
const WELCOMED = "receipt:welcomed"; // hash: subreddit -> "1" (welcome modmail idempotency)
const PANELS = "receipt:panels"; // hash: conversationId -> "1" (precedent-panel emit idempotency)
const RECENT_MAX = 500;
const RULE_RECENT_MAX = 200;

/** Atomically claim an item the first time it's seen. Returns true if THIS call
 *  is the first to see it (both ModAction and filter triggers can fire for one item). */
export async function claimUnseen(itemId: string): Promise<boolean> {
  const res = await redis.hSetNX(SEEN, itemId, "1");
  return res === 1;
}

export async function writeRecord(r: ReceiptRecord): Promise<void> {
  await redis.hSet(ITEM(r.itemId), {
    author: r.author,
    itemType: r.itemType,
    source: r.source,
    reasonText: r.reasonText,
    reasonTier: r.reasonTier,
    ruleRef: r.ruleRef ?? "",
    deliveredVia: r.deliveredVia,
    modName: r.modName ?? "",
    ts: String(r.ts),
    appealStatus: r.appealStatus,
    appealedAt: r.appealedAt ? String(r.appealedAt) : "",
    subreddit: r.subreddit ?? "",
  });
  await redis.zAdd(USER(r.author), { member: r.itemId, score: r.ts });
  await redis.zAdd(RECENT, { member: r.itemId, score: r.ts });

  const sub = (r.subreddit ?? "").trim();
  if (sub) {
    const key = ruleKey({ ruleRef: r.ruleRef, reasonText: r.reasonText });
    await redis.zAdd(RULE(sub, key), { member: r.itemId, score: r.ts });
    // Display label is rendered on the PUBLIC wiki mirror — strip usernames + URLs from any
    // mod free-text reason text before it can be exposed there.
    const rawLabel = (r.ruleRef && r.ruleRef.trim()) || r.reasonText.slice(0, 80);
    const label = sanitizeRuleLabel(rawLabel);
    await redis.set(RULE_LABEL(sub, key), label);
    await redis.zAdd(RULE_INDEX(sub), { member: key, score: r.ts });
    const ruleCount = await redis.zCard(RULE(sub, key));
    if (ruleCount > RULE_RECENT_MAX) {
      await redis.zRemRangeByRank(RULE(sub, key), 0, ruleCount - RULE_RECENT_MAX - 1);
    }
  }

  const count = await redis.zCard(RECENT);
  if (count > RECENT_MAX) {
    await redis.zRemRangeByRank(RECENT, 0, count - RECENT_MAX - 1);
  }
}

export async function getRecord(itemId: string): Promise<ReceiptRecord | undefined> {
  const h = await redis.hGetAll(ITEM(itemId));
  if (!h || !h.author) return undefined;
  return {
    itemId,
    author: h.author,
    itemType: h.itemType as ReceiptRecord["itemType"],
    source: h.source as ReceiptRecord["source"],
    reasonText: h.reasonText ?? "",
    reasonTier: h.reasonTier as ReceiptRecord["reasonTier"],
    ruleRef: h.ruleRef || undefined,
    deliveredVia: h.deliveredVia ?? "",
    modName: h.modName || undefined,
    ts: Number(h.ts ?? 0),
    appealStatus: (h.appealStatus as AppealStatus) || "none",
    appealedAt: h.appealedAt ? Number(h.appealedAt) : undefined,
    subreddit: h.subreddit || undefined,
  };
}

async function idsNewestFirst(key: string, limit: number): Promise<string[]> {
  const count = await redis.zCard(key);
  if (count === 0) return [];
  const all = await redis.zRange(key, 0, count - 1); // ascending by score
  return all
    .map((e) => e.member)
    .reverse()
    .slice(0, limit);
}

export async function getUserRecords(username: string, limit = 25): Promise<ReceiptRecord[]> {
  const out: ReceiptRecord[] = [];
  for (const id of await idsNewestFirst(USER(username), limit)) {
    const r = await getRecord(id);
    if (r) out.push(r);
  }
  return out;
}

export async function getRecent(limit = 25): Promise<ReceiptRecord[]> {
  const out: ReceiptRecord[] = [];
  for (const id of await idsNewestFirst(RECENT, limit)) {
    const r = await getRecord(id);
    if (r) out.push(r);
  }
  return out;
}

/** Read up to `limit` receipts for a rule in a subreddit, newest first. */
export async function getRuleRecords(subreddit: string, ruleSlug: string, limit = 50): Promise<ReceiptRecord[]> {
  const sub = subreddit.trim();
  if (!sub) return [];
  const out: ReceiptRecord[] = [];
  for (const id of await idsNewestFirst(RULE(sub, ruleSlug), limit)) {
    const r = await getRecord(id);
    if (r) out.push(r);
  }
  return out;
}

/** Recent overturned (reversed) receipts for a rule. */
export async function getRecentReversals(subreddit: string, ruleSlug: string, limit = 5): Promise<ReceiptRecord[]> {
  const all = await getRuleRecords(subreddit, ruleSlug, 100);
  return all.filter((r) => r.appealStatus === "overturned").slice(0, limit);
}

/** List of (ruleSlug, displayLabel, count) for a subreddit, newest-first by first-seen. */
export async function listRules(subreddit: string, limit = 50): Promise<Array<{ slug: string; label: string; count: number }>> {
  const sub = subreddit.trim();
  if (!sub) return [];
  const slugs = await idsNewestFirst(RULE_INDEX(sub), limit);
  const out: Array<{ slug: string; label: string; count: number }> = [];
  for (const slug of slugs) {
    const [label, count] = await Promise.all([redis.get(RULE_LABEL(sub, slug)), redis.zCard(RULE(sub, slug))]);
    out.push({ slug, label: label || slug, count: count ?? 0 });
  }
  return out;
}

export async function setAppealStatus(itemId: string, status: AppealStatus, when: number): Promise<void> {
  await redis.hSet(ITEM(itemId), { appealStatus: status, appealedAt: String(when) });
}

/** Mark a receipt as overturned (the mod ran /reverse). */
export async function markReversed(itemId: string, when: number): Promise<void> {
  await setAppealStatus(itemId, "overturned", when);
}

/** Remember which Anvil Court modmail thread corresponds to which user/item, so a mod's
 *  later /reverse reply can be routed back to the correct removal record. */
export async function rememberConv(conversationId: string, info: { itemId: string; user: string }): Promise<void> {
  if (!conversationId) return;
  await redis.hSet(CONV(conversationId), { itemId: info.itemId, user: info.user.toLowerCase() });
}

export async function lookupConv(conversationId: string): Promise<{ itemId: string; user: string } | undefined> {
  if (!conversationId) return undefined;
  const h = await redis.hGetAll(CONV(conversationId));
  if (!h || !h.itemId) return undefined;
  return { itemId: h.itemId, user: h.user ?? "" };
}

const RATE_CAP = (sub: string, user: string, ymd: string): string =>
  `receipt:ratecap:${sub.toLowerCase()}:${user.toLowerCase()}:${ymd}`;

/** Increment per-author per-sub daily counter for AutoMod-filter explanations.
 *  Returns the new counter value. Counter auto-expires after ~48h. */
export async function bumpAuthorFilterCounter(subreddit: string, user: string, now: number = Date.now()): Promise<number> {
  if (!subreddit || !user) return 0;
  const ymd = new Date(now).toISOString().slice(0, 10);
  const key = RATE_CAP(subreddit, user, ymd);
  const n = await redis.incrBy(key, 1);
  if (n === 1) {
    // First bump today — set a 2-day expiry so old counters self-clean.
    await redis.expire(key, 60 * 60 * 48);
  }
  return n;
}

/** Returns true exactly once per subreddit — used to gate the welcome modmail so
 *  reinstalls / app updates don't clutter the mod inbox with duplicate welcomes. */
export async function claimWelcomedOnce(subreddit: string): Promise<boolean> {
  if (!subreddit) return true;
  const res = await redis.hSetNX(WELCOMED, subreddit.toLowerCase(), "1");
  return res === 1;
}

/** Returns true exactly once per modmail conversation — used to gate the precedent
 *  panel emission so chatty appellants don't get N stacked panels in one thread. */
export async function claimPanelEmitOnce(conversationId: string): Promise<boolean> {
  if (!conversationId) return false;
  const res = await redis.hSetNX(PANELS, conversationId, "1");
  return res === 1;
}
