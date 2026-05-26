import { describe, expect, it } from 'vitest';
import {
  composePrecedentPanel,
  composeReversalUserDM,
  composeReversalModConfirm,
  composeUserReceiptsList,
  computeRuleStats,
  parseModCommand,
  parseUserCommand,
  ruleKey,
  ruleLabel,
} from '../../src/core/caseLaw.ts';
import type { ReceiptRecord } from '../../src/core/types.ts';

const baseRec = (over: Partial<ReceiptRecord> = {}): ReceiptRecord => ({
  itemId: 't3_abc',
  author: 'alice',
  itemType: 'post',
  source: 'mod',
  reasonText: 'No low-effort posts',
  reasonTier: 'mod-log',
  deliveredVia: 'comment+modmail',
  ts: 1700000000000,
  appealStatus: 'none',
  ...over,
});

describe('ruleKey', () => {
  it('prefers ruleRef over reasonText', () => {
    expect(ruleKey({ ruleRef: 'Rule 1', reasonText: 'Something else' })).toBe('rule-1');
  });
  it('falls back to reasonText when ruleRef is missing or empty', () => {
    expect(ruleKey({ reasonText: 'No low-effort posts' })).toBe('no-low-effort-posts');
    expect(ruleKey({ ruleRef: '   ', reasonText: 'Spam!' })).toBe('spam');
  });
  it('returns __generic__ for empty input', () => {
    expect(ruleKey({})).toBe('__generic__');
    expect(ruleKey({ ruleRef: '', reasonText: '' })).toBe('__generic__');
  });
  it('slugifies non-alphanumerics and lowercases', () => {
    expect(ruleKey({ ruleRef: 'Rule #2 — Be Civil!' })).toBe('rule-2-be-civil');
  });
});

describe('ruleLabel', () => {
  it('returns ruleRef when present, else reasonText truncated', () => {
    expect(ruleLabel({ ruleRef: 'Rule 1' })).toBe('Rule 1');
    expect(ruleLabel({ reasonText: 'x'.repeat(120) })).toHaveLength(80);
    expect(ruleLabel({})).toBe('unspecified rule');
  });
});

describe('computeRuleStats', () => {
  it('counts each status bucket', () => {
    const recs: ReceiptRecord[] = [
      baseRec({ appealStatus: 'none' }),
      baseRec({ appealStatus: 'appealed' }),
      baseRec({ appealStatus: 'appealed' }),
      baseRec({ appealStatus: 'upheld' }),
      baseRec({ appealStatus: 'overturned' }),
      baseRec({ appealStatus: 'overturned' }),
      baseRec({ appealStatus: 'overturned' }),
    ];
    const s = computeRuleStats(recs);
    expect(s).toEqual({ total: 7, none: 1, appealed: 2, upheld: 1, overturned: 3 });
  });
  it('handles empty input', () => {
    expect(computeRuleStats([])).toEqual({ total: 0, none: 0, appealed: 0, upheld: 0, overturned: 0 });
  });
});

describe('composePrecedentPanel', () => {
  it('includes rule label, totals, reversal rate, and the /reverse hint', () => {
    const body = composePrecedentPanel({
      subreddit: 'testsub',
      ruleDisplay: 'No spam',
      stats: { total: 10, none: 4, appealed: 2, upheld: 1, overturned: 3 },
      recentReversals: [baseRec({ itemId: 't3_xyz', author: 'bob', appealStatus: 'overturned' })],
      appellantUser: 'alice',
      appellantPriorTotal: 5,
      appellantPriorOverturned: 1,
    });
    expect(body).toContain('No spam');
    expect(body).toContain('r/testsub');
    expect(body).toContain('10');
    expect(body).toContain('30%'); // 3/10 reversal rate
    expect(body).toContain('u/alice');
    expect(body).toContain('5 prior receipt(s)');
    expect(body).toContain('/reverse');
    expect(body).toContain('u/bob');
  });
  it('handles zero prior receipts safely', () => {
    const body = composePrecedentPanel({
      subreddit: 'testsub',
      ruleDisplay: 'Brand new rule',
      stats: { total: 0, none: 0, appealed: 0, upheld: 0, overturned: 0 },
      recentReversals: [],
      appellantUser: 'alice',
      appellantPriorTotal: 0,
      appellantPriorOverturned: 0,
    });
    expect(body).toContain('Brand new rule');
    expect(body).toContain('0%');
    expect(body).not.toContain('Recent reversals');
  });
});

describe('composeReversalUserDM', () => {
  it('includes link, rule, and the mod note when given', () => {
    const body = composeReversalUserDM({
      subreddit: 'testsub',
      itemType: 'post',
      ruleDisplay: 'No low-effort posts',
      note: 'posted in error',
      itemId: 't3_abc',
    });
    expect(body).toContain('r/testsub');
    expect(body).toContain('No low-effort posts');
    expect(body).toContain('posted in error');
    expect(body).toContain('https://www.reddit.com/r/testsub/comments/abc/');
  });
  it('omits the note line when note is empty', () => {
    const body = composeReversalUserDM({
      subreddit: 'testsub',
      itemType: 'comment',
      ruleDisplay: 'Rule',
      note: '',
      itemId: 't1_def',
    });
    expect(body).not.toContain('**Moderator note:**');
    expect(body).toContain('https://www.reddit.com/r/testsub/comments/def/');
  });
});

describe('composeReversalModConfirm', () => {
  it('mentions the item id and the appellant', () => {
    const body = composeReversalModConfirm({ itemId: 't3_abc', appellantUser: 'alice', note: '' });
    expect(body).toContain('t3_abc');
    expect(body).toContain('u/alice');
    expect(body).toContain('reversed');
  });
});

describe('composeUserReceiptsList', () => {
  it('lists records newest-first with status when set', () => {
    const records: ReceiptRecord[] = [
      baseRec({ ts: 1700000002000, appealStatus: 'overturned' }),
      baseRec({ ts: 1700000001000, appealStatus: 'none' }),
    ];
    const body = composeUserReceiptsList({ username: 'alice', records });
    expect(body).toContain('alice');
    expect(body).toContain('overturned');
  });
  it('handles empty list', () => {
    const body = composeUserReceiptsList({ username: 'alice', records: [] });
    expect(body).toContain('no Receipts');
  });
});

describe('parseModCommand', () => {
  it('detects /reverse with no note', () => {
    expect(parseModCommand('/reverse')).toEqual({ kind: 'reverse', note: '' });
  });
  it('detects /reverse with a note', () => {
    expect(parseModCommand('/reverse posted in error')).toEqual({ kind: 'reverse', note: 'posted in error' });
  });
  it('accepts !reverse and bare reverse at line start', () => {
    expect(parseModCommand('!reverse oops')).toEqual({ kind: 'reverse', note: 'oops' });
    expect(parseModCommand('reverse: wrong call')).toEqual({ kind: 'reverse', note: 'wrong call' });
  });
  it('is case-insensitive', () => {
    expect(parseModCommand('/REVERSE Posted in error')).toEqual({ kind: 'reverse', note: 'Posted in error' });
  });
  it('detects /uphold', () => {
    expect(parseModCommand('/uphold rule violation stands')).toEqual({ kind: 'uphold', note: 'rule violation stands' });
  });
  it('returns none when no command present', () => {
    expect(parseModCommand('looks fine to me, thanks')).toEqual({ kind: 'none' });
    expect(parseModCommand('')).toEqual({ kind: 'none' });
  });
  it('ignores the command if it appears mid-line, not at line start', () => {
    expect(parseModCommand('We discussed /reverse but decided no.')).toEqual({ kind: 'none' });
  });
  it('finds command on a later line', () => {
    expect(parseModCommand('FYI checked with team.\n/reverse mistake')).toEqual({ kind: 'reverse', note: 'mistake' });
  });
});

describe('parseUserCommand', () => {
  it('detects /my-receipts', () => {
    expect(parseUserCommand('/my-receipts')).toEqual({ kind: 'my-receipts' });
  });
  it('accepts variants', () => {
    expect(parseUserCommand('!my-receipts please')).toEqual({ kind: 'my-receipts' });
    expect(parseUserCommand('hi, my_receipts')).toEqual({ kind: 'my-receipts' });
    expect(parseUserCommand('Can I see my receipts?')).toEqual({ kind: 'my-receipts' });
  });
  it('returns none when not present', () => {
    expect(parseUserCommand('please respond, thanks')).toEqual({ kind: 'none' });
    expect(parseUserCommand('')).toEqual({ kind: 'none' });
  });
});
