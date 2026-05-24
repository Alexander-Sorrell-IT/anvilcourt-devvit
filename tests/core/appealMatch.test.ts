import { describe, it, expect } from 'vitest';
import { isAppealReply, pickReceiptToFlag } from '../../src/core/appealMatch';
import type { ReceiptRecord } from '../../src/core/types';

const rec = (over: Partial<ReceiptRecord>): ReceiptRecord => ({
  itemId: 't1_a', author: 'u', itemType: 'comment', source: 'mod', reasonText: 'r',
  reasonTier: 'mod-log', deliveredVia: 'modmail', ts: 0, appealStatus: 'none', ...over,
});

describe('isAppealReply', () => {
  it('true for a user reply with a recent receipt', () => {
    expect(isAppealReply({ hasRecentReceipt: true, isFromModerator: false, isInternal: false })).toBe(true);
  });
  it('false for moderator messages', () => {
    expect(isAppealReply({ hasRecentReceipt: true, isFromModerator: true, isInternal: false })).toBe(false);
  });
  it('false for internal mod discussions', () => {
    expect(isAppealReply({ hasRecentReceipt: true, isFromModerator: false, isInternal: true })).toBe(false);
  });
  it('false when no recent receipt', () => {
    expect(isAppealReply({ hasRecentReceipt: false, isFromModerator: false, isInternal: false })).toBe(false);
  });
});

describe('pickReceiptToFlag', () => {
  it('picks the most recent un-appealed receipt in the window', () => {
    const picked = pickReceiptToFlag(
      [rec({ itemId: 'old', ts: 100 }), rec({ itemId: 'new', ts: 900 })], 1000, 1000);
    expect(picked?.itemId).toBe('new');
  });
  it('ignores already-appealed and out-of-window receipts', () => {
    const picked = pickReceiptToFlag(
      [rec({ itemId: 'appealed', ts: 900, appealStatus: 'appealed' }), rec({ itemId: 'stale', ts: 1 })], 5000, 1000);
    expect(picked).toBeUndefined();
  });
});
