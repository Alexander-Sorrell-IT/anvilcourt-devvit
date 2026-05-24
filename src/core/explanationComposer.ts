import type { ResolvedReason, ItemType } from './types.ts';

export interface ComposeInput {
  reason: ResolvedReason;
  itemType: ItemType;
  subreddit: string;
  template: string;            // tokens: {{rule}} {{reason}} {{itemType}} {{subreddit}} {{appeal}}
  appealInstructions: string;
  appealsEnabled: boolean;
}

export function composeExplanation(i: ComposeInput): string {
  const appeal = i.appealsEnabled ? i.appealInstructions : '';
  return i.template
    .replaceAll('{{rule}}', i.reason.ruleRef ?? '')
    .replaceAll('{{reason}}', i.reason.text)
    .replaceAll('{{itemType}}', i.itemType)
    .replaceAll('{{subreddit}}', i.subreddit)
    .replaceAll('{{appeal}}', appeal)
    .trim();
}
