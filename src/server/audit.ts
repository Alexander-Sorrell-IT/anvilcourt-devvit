// Redis-backed audit store for Receipts: dedup, decision records, per-user and
// recent indexes, appeal status. Uses the @devvit/web/server redis client.
import { redis } from "@devvit/web/server";
import type { ReceiptRecord, AppealStatus } from "../core/types.ts";

const SEEN = "receipt:seen"; // hash: itemId -> "1" (dedup)
const ITEM = (id: string): string => `receipt:item:${id}`; // hash: the record
const USER = (u: string): string => `receipt:user:${u.toLowerCase()}`; // zset ts->itemId
const RECENT = "receipt:recent"; // zset ts->itemId
const RECENT_MAX = 500;

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
  });
  await redis.zAdd(USER(r.author), { member: r.itemId, score: r.ts });
  await redis.zAdd(RECENT, { member: r.itemId, score: r.ts });
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

export async function setAppealStatus(itemId: string, status: AppealStatus, when: number): Promise<void> {
  await redis.hSet(ITEM(itemId), { appealStatus: status, appealedAt: String(when) });
}
