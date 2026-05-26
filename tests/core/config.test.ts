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
    expect(c.automodFilterDailyCap).toBe(3);
  });
  it('parses automodFilterDailyCap from string or number, defaults sanely', () => {
    expect(parseConfig({ automodFilterDailyCap: '0' }).automodFilterDailyCap).toBe(0);
    expect(parseConfig({ automodFilterDailyCap: '5' }).automodFilterDailyCap).toBe(5);
    expect(parseConfig({ automodFilterDailyCap: 'banana' }).automodFilterDailyCap).toBe(3);
    expect(parseConfig({ automodFilterDailyCap: '-1' }).automodFilterDailyCap).toBe(3);
  });
  it('respects provided values and parses opt-out list', () => {
    const c = parseConfig({ deliveryChannel: 'modmail', perReasonOptOut: 'spam, ban evasion' });
    expect(c.deliveryChannel).toBe('modmail');
    expect(c.perReasonOptOut).toEqual(['spam', 'ban evasion']);
  });
  it('unwraps select settings returned as a single-element array', () => {
    const c = parseConfig({ deliveryChannel: ['modmail'] });
    expect(c.deliveryChannel).toBe('modmail');
  });
});
