import { describe, it, expect } from 'vitest';
import { parseConfig, DEFAULT_TEMPLATE } from '../../src/core/config';

describe('parseConfig', () => {
  it('applies defaults for missing values', () => {
    const c = parseConfig({});
    expect(c.deliveryChannel).toBe('both');
    expect(c.appealsEnabled).toBe(true);
    expect(c.template).toBe(DEFAULT_TEMPLATE);
    expect(c.explainSources.spamFilter).toBe(false);
    expect(c.explainSources.modRemovals).toBe(true);
  });
  it('respects provided values and parses opt-out list', () => {
    const c = parseConfig({ deliveryChannel: 'modmail', perReasonOptOut: 'spam, ban evasion' });
    expect(c.deliveryChannel).toBe('modmail');
    expect(c.perReasonOptOut).toEqual(['spam', 'ban evasion']);
  });
});
