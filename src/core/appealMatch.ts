import type { ReceiptRecord } from './types.ts';

export function isAppealReply(o: { hasRecentReceipt: boolean; isFromModerator: boolean; isInternal: boolean }): boolean {
  if (o.isFromModerator || o.isInternal) return false;
  return o.hasRecentReceipt;
}

export function pickReceiptToFlag(records: ReceiptRecord[], now: number, windowMs: number): ReceiptRecord | undefined {
  return records
    .filter(r => r.appealStatus === 'none' && now - r.ts <= windowMs)
    .sort((a, b) => b.ts - a.ts)[0];
}
