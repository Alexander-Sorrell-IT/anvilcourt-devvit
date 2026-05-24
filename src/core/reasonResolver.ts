import type { RemovalEvent, ResolvedReason } from './types.ts';

export interface ReasonLookups {
  modLogReason: (itemId: string) => Promise<string | undefined>;
  ruleConfigText: (ruleRef: string | undefined) => Promise<string | undefined>;
  deriveReason: (event: RemovalEvent) => Promise<string | undefined>;
}

const GENERIC = 'Your content was removed by the moderators of this community.';
const ok = (s?: string) => !!s && s.trim().length > 0;

export async function resolveReason(event: RemovalEvent, l: ReasonLookups): Promise<ResolvedReason> {
  if (ok(event.rawReason)) return { text: event.rawReason!.trim(), tier: 'filter-reason', ruleRef: event.ruleRef };
  const ml = await l.modLogReason(event.itemId);
  if (ok(ml)) return { text: ml!.trim(), tier: 'mod-log', ruleRef: event.ruleRef };
  const rc = await l.ruleConfigText(event.ruleRef);
  if (ok(rc)) return { text: rc!.trim(), tier: 'rule-config', ruleRef: event.ruleRef };
  const dv = await l.deriveReason(event);
  if (ok(dv)) return { text: dv!.trim(), tier: 'derived' };
  return { text: GENERIC, tier: 'generic' };
}
