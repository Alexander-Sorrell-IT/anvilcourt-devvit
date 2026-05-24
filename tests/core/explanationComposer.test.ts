import { describe, it, expect } from 'vitest';
import { composeExplanation } from '../../src/core/explanationComposer';

const base = {
  reason: { text: 'No referral links (Rule 3).', tier: 'mod-log' as const, ruleRef: 'Rule 3' },
  itemType: 'comment' as const,
  subreddit: 'testsub',
  template: 'Your {{itemType}} in r/{{subreddit}} was removed: {{reason}}\n\n{{appeal}}',
  appealInstructions: 'Reply here and a moderator will review it.',
  appealsEnabled: true,
};

describe('composeExplanation', () => {
  it('substitutes all placeholders', () => {
    const out = composeExplanation(base);
    expect(out).toContain('Your comment in r/testsub was removed: No referral links (Rule 3).');
    expect(out).toContain('Reply here and a moderator will review it.');
  });
  it('omits appeal text when appeals disabled', () => {
    const out = composeExplanation({ ...base, appealsEnabled: false });
    expect(out).not.toContain('Reply here');
  });
  it('renders empty rule ref without leaving the literal token', () => {
    const out = composeExplanation({ ...base, template: '[{{rule}}] {{reason}}', reason: { text: 'x', tier: 'generic' } });
    expect(out).toBe('[] x');
  });
});
