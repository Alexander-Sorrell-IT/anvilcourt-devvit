import { describe, it, expect } from 'vitest';
import { renderMirrorMarkdown, rollupRule } from '../../src/core/mirror.ts';
import type { ReceiptRecord } from '../../src/core/types.ts';

const NOW = 1730000000000; // arbitrary fixed timestamp
const DAY = 24 * 60 * 60 * 1000;

const rec = (over: Partial<ReceiptRecord> = {}): ReceiptRecord => ({
  itemId: 't3_x',
  author: 'alice',
  itemType: 'post',
  source: 'mod',
  reasonText: 'No low-effort posts',
  reasonTier: 'mod-log',
  deliveredVia: 'comment+modmail',
  ts: NOW,
  appealStatus: 'none',
  ...over,
});

describe('rollupRule', () => {
  it('computes totals, reversal rate, and last-30-day count', () => {
    const records: ReceiptRecord[] = [
      rec({ ts: NOW - 1 * DAY, appealStatus: 'overturned' }),
      rec({ ts: NOW - 5 * DAY, appealStatus: 'overturned' }),
      rec({ ts: NOW - 10 * DAY, appealStatus: 'upheld' }),
      rec({ ts: NOW - 40 * DAY, appealStatus: 'none' }),
      rec({ ts: NOW - 70 * DAY, appealStatus: 'none' }),
    ];
    const row = rollupRule({ label: 'Rule A', slug: 'rule-a', records, now: NOW });
    expect(row.total).toBe(5);
    expect(row.overturned).toBe(2);
    expect(row.upheld).toBe(1);
    expect(row.appealed).toBe(0);
    expect(row.reversalRatePct).toBe(40); // 2/5
    expect(row.last30Days).toBe(3); // 1d, 5d, 10d are within 30d
    expect(row.mostRecentTs).toBe(NOW - 1 * DAY);
  });
  it('handles empty input', () => {
    const row = rollupRule({ label: 'Empty', slug: 'empty', records: [], now: NOW });
    expect(row.total).toBe(0);
    expect(row.reversalRatePct).toBe(0);
    expect(row.mostRecentTs).toBe(0);
  });
});

describe('renderMirrorMarkdown', () => {
  it('renders a header, summary, and per-rule table', () => {
    const md = renderMirrorMarkdown({
      subreddit: 'testsub',
      rules: [
        rollupRule({
          label: 'Rule A',
          slug: 'rule-a',
          records: [rec({ appealStatus: 'overturned' }), rec({ appealStatus: 'upheld' })],
          now: NOW,
        }),
        rollupRule({
          label: 'Rule B',
          slug: 'rule-b',
          records: [rec({ ts: NOW - 60 * DAY })],
          now: NOW,
        }),
      ],
      generatedAt: NOW,
    });
    expect(md).toContain('Anvil Court — moderation case law for r/testsub');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Per-rule breakdown');
    expect(md).toContain('| Rule A | 2 |');
    expect(md).toContain('| Rule B | 1 |');
    expect(md).toContain('/my-receipts');
  });
  it('does NOT include any usernames or permalinks', () => {
    const md = renderMirrorMarkdown({
      subreddit: 'testsub',
      rules: [
        rollupRule({
          label: 'Rule A',
          slug: 'rule-a',
          records: [rec({ author: 'specific_user', itemId: 't3_abc123' })],
          now: NOW,
        }),
      ],
      generatedAt: NOW,
    });
    expect(md).not.toContain('specific_user');
    expect(md).not.toContain('t3_abc123');
    expect(md).not.toContain('reddit.com/r/testsub/comments/abc123');
  });
  it('shows an empty-state message when there are no rules', () => {
    const md = renderMirrorMarkdown({ subreddit: 'testsub', rules: [], generatedAt: NOW });
    expect(md).toContain('No moderation decisions have been logged yet');
  });
  it('escapes pipe characters in rule labels (markdown table safety)', () => {
    const md = renderMirrorMarkdown({
      subreddit: 'testsub',
      rules: [
        rollupRule({
          label: 'Rule with | pipe',
          slug: 'rule-pipe',
          records: [rec()],
          now: NOW,
        }),
      ],
      generatedAt: NOW,
    });
    expect(md).toContain('Rule with \\| pipe');
  });
});
