import type { RemovalSource } from './types.ts';

export const DEFAULT_TEMPLATE =
  'Your {{itemType}} in r/{{subreddit}} was removed.\n\nReason: {{reason}}\n\n{{appeal}}';
export const DEFAULT_APPEAL = 'If you think this was a mistake, reply to this message and a moderator will review it. (This is an automated notice; a human makes the final call.)';

export interface ReceiptsConfig {
  deliveryChannel: 'comment' | 'modmail' | 'both' | 'off';
  appealsEnabled: boolean;
  template: string;
  appealInstructions: string;
  perReasonOptOut: string[];
  explainSources: { modRemovals: boolean; automodFilter: boolean; automodRemove: boolean; spamFilter: boolean };
}

const bool = (v: unknown, d: boolean): boolean => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'boolean' ? x : d;
};
// Devvit select settings can come back as a single-element array; unwrap it.
const str = (v: unknown, d: string): string => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' && x.length ? x : d;
};

export function parseConfig(raw: Record<string, unknown>): ReceiptsConfig {
  return {
    deliveryChannel: (str(raw.deliveryChannel, 'both') as ReceiptsConfig['deliveryChannel']),
    appealsEnabled: bool(raw.appealsEnabled, true),
    template: str(raw.messageTemplate, DEFAULT_TEMPLATE),
    appealInstructions: str(raw.appealInstructions, DEFAULT_APPEAL),
    perReasonOptOut: str(raw.perReasonOptOut, '').split(',').map(s => s.trim()).filter(Boolean),
    explainSources: {
      modRemovals: bool(raw.explainModRemovals, true),
      automodFilter: bool(raw.explainAutomodFilter, true),
      automodRemove: bool(raw.explainAutomodRemove, true),
      spamFilter: bool(raw.explainSpamFilter, false),
    },
  };
}

export function shouldExplain(source: RemovalSource, c: ReceiptsConfig): boolean {
  if (c.deliveryChannel === 'off') return false;
  return source === 'mod' ? c.explainSources.modRemovals
    : source === 'automod-filter' ? c.explainSources.automodFilter
    : source === 'automod-remove' ? c.explainSources.automodRemove
    : c.explainSources.spamFilter;
}
