import { describe, it, expect } from 'vitest';
import { resolveReason } from '../../src/core/reasonResolver';
import type { RemovalEvent } from '../../src/core/types';

const evt = (over: Partial<RemovalEvent> = {}): RemovalEvent => ({
  itemId: 't1_x', itemType: 'comment', author: 'u', subreddit: 's',
  source: 'automod-filter', ts: 0, ...over,
});
const noLookups = { modLogReason: async () => undefined, ruleConfigText: async () => undefined, deriveReason: async () => undefined };

describe('resolveReason', () => {
  it('tier 1: uses rawReason from the payload', async () => {
    const r = await resolveReason(evt({ rawReason: 'spam keyword' }), noLookups);
    expect(r).toEqual({ text: 'spam keyword', tier: 'filter-reason', ruleRef: undefined });
  });
  it('tier 2: falls back to mod log', async () => {
    const r = await resolveReason(evt(), { ...noLookups, modLogReason: async () => 'removed: low effort' });
    expect(r.tier).toBe('mod-log');
    expect(r.text).toBe('removed: low effort');
  });
  it('tier 4: derived when nothing else', async () => {
    const r = await resolveReason(evt(), { ...noLookups, deriveReason: async () => 'new account + keyword' });
    expect(r.tier).toBe('derived');
  });
  it('tier 5: generic fallback', async () => {
    const r = await resolveReason(evt(), noLookups);
    expect(r.tier).toBe('generic');
    expect(r.text.length).toBeGreaterThan(0);
  });
  it('skips empty/whitespace reasons', async () => {
    const r = await resolveReason(evt({ rawReason: '   ' }), { ...noLookups, modLogReason: async () => 'real' });
    expect(r.tier).toBe('mod-log');
  });
});
