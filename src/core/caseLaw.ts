// Case-law layer: pure helpers for precedent stats, rule keying, message
// composition, and mod/user command parsing. No platform calls live here.
import type { ReceiptRecord, AppealStatus } from './types.ts';

const SLUG_MAX = 64;
const GENERIC_RULE_KEY = '__generic__';

/** Stable, lowercase, hyphenated key for indexing receipts by rule. */
export function ruleKey(record: { ruleRef?: string; reasonText?: string }): string {
  const raw = record.ruleRef && record.ruleRef.trim().length
    ? record.ruleRef
    : (record.reasonText ?? '').trim();
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, SLUG_MAX);
  return slug || GENERIC_RULE_KEY;
}

/** Display label for a rule given its first receipt (preserves original casing). */
export function ruleLabel(record: { ruleRef?: string; reasonText?: string }): string {
  return (record.ruleRef && record.ruleRef.trim().length)
    ? record.ruleRef.trim()
    : (record.reasonText ?? '').trim().slice(0, 80) || 'unspecified rule';
}

export interface RuleStats {
  total: number;
  none: number;
  appealed: number;
  upheld: number;
  overturned: number;
}

export function computeRuleStats(records: ReceiptRecord[]): RuleStats {
  const out: RuleStats = { total: records.length, none: 0, appealed: 0, upheld: 0, overturned: 0 };
  for (const r of records) {
    const s: AppealStatus = (r.appealStatus ?? 'none') as AppealStatus;
    if (s === 'none') out.none++;
    else if (s === 'appealed') out.appealed++;
    else if (s === 'upheld') out.upheld++;
    else if (s === 'overturned') out.overturned++;
  }
  return out;
}

function fmtDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Mod-side internal note: what the rule's history says about this appeal. */
export function composePrecedentPanel(input: {
  subreddit: string;
  ruleDisplay: string;
  stats: RuleStats;
  recentReversals: ReceiptRecord[];
  appellantUser: string;
  appellantPriorTotal: number;
  appellantPriorOverturned: number;
}): string {
  const s = input.stats;
  const reversalRate = s.total > 0 ? Math.round((s.overturned / s.total) * 100) : 0;
  const lines: string[] = [];
  // Headline line — renders as the preview when this internal note is collapsed.
  lines.push(
    `**REVERSAL RATE ${reversalRate}% (${s.overturned}/${s.total}) — u/${input.appellantUser} appealing "${input.ruleDisplay}"**`,
  );
  lines.push('');
  lines.push(`**Anvil Court — case law for "${input.ruleDisplay}" in r/${input.subreddit}**`);
  lines.push('');
  lines.push(
    `Across **${s.total}** prior decisions on this rule: ` +
      `**${s.overturned} overturned** (${reversalRate}%), ` +
      `${s.upheld} upheld, ` +
      `${s.appealed} appealed (open), ` +
      `${s.none} not appealed.`,
  );
  if (input.recentReversals.length > 0) {
    lines.push('');
    lines.push('**Recent reversals on this rule:**');
    for (const r of input.recentReversals.slice(0, 3)) {
      const id = r.itemId;
      const url = `https://www.reddit.com/r/${input.subreddit}/comments/${id.replace(/^t[13]_/, '')}/`;
      lines.push(`- ${fmtDate(r.ts)} — u/${r.author} — [${id}](${url})`);
    }
  }
  lines.push('');
  lines.push(
    `**This appellant** (u/${input.appellantUser}): ${input.appellantPriorTotal} prior decision(s), ` +
      `${input.appellantPriorOverturned} previously overturned.`,
  );
  lines.push('');
  lines.push('To reverse this removal: reply **`/reverse`** in this conversation (add a note after for the user, e.g. `/reverse posted in error`).');
  lines.push('Mod-only note — not visible to the appellant.');
  return lines.join('\n');
}

/** User-facing DM body for a reversal. */
export function composeReversalUserDM(input: {
  subreddit: string;
  itemType: string;
  ruleDisplay: string;
  note: string;
  itemId: string;
}): string {
  const url = `https://www.reddit.com/r/${input.subreddit}/comments/${input.itemId.replace(/^t[13]_/, '')}/`;
  const trimmedNote = input.note.trim();
  const noteLine = trimmedNote.length > 0 ? `\n\n**Moderator note:** ${trimmedNote}` : '';
  return (
    `Good news — a moderator of r/${input.subreddit} has reversed the removal of your ${input.itemType}.\n\n` +
    `Original rule cited: *${input.ruleDisplay}*.${noteLine}\n\n` +
    `Your content is restored: ${url}\n\n` +
    `This decision was reviewed by a human moderator and logged. (Anvil Court: every decision shows its work.)`
  );
}

/** Internal-thread confirmation after a successful reversal. */
export function composeReversalModConfirm(input: {
  itemId: string;
  appellantUser: string;
  note: string;
}): string {
  const trimmed = input.note.trim();
  const noteLine = trimmed.length > 0 ? ` Note: "${trimmed}"` : '';
  return (
    `Anvil Court: **reversed** ${input.itemId} by u/${input.appellantUser}.${noteLine}\n\n` +
    `- Approved the item on Reddit.\n` +
    `- DM'd the user with the reversal notice.\n` +
    `- Logged as overturned — feeds future precedent panels.\n\n` +
    `Mod-only confirmation — not visible to the appellant.`
  );
}

/** User-facing `/my-receipts` response. */
export function composeUserReceiptsList(input: {
  username: string;
  records: ReceiptRecord[];
}): string {
  if (input.records.length === 0) {
    return `u/${input.username}: no records have been logged for you in this subreddit.`;
  }
  const lines: string[] = [];
  lines.push(`**Your case file (u/${input.username}) — most recent first:**`);
  lines.push('');
  for (const r of input.records.slice(0, 20)) {
    const status = r.appealStatus && r.appealStatus !== 'none' ? ` — _${r.appealStatus}_` : '';
    lines.push(`- ${fmtDate(r.ts)} — ${r.itemType} — ${r.reasonText.slice(0, 100)}${status}`);
  }
  return lines.join('\n');
}

export type ModCommand =
  | { kind: 'reverse'; note: string }
  | { kind: 'uphold'; note: string }
  | { kind: 'none' };

/** Parse a mod's modmail reply body for /reverse or /uphold commands.
 *  Recognizes slash, bang, or bare prefix at start of any line, case-insensitive. */
export function parseModCommand(body: string): ModCommand {
  if (!body) return { kind: 'none' };
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*[!\/]?(reverse|uphold)\b\s*[:\-]?\s*(.*)$/i);
    if (m) {
      const verb = (m[1] ?? '').toLowerCase();
      const kind: 'reverse' | 'uphold' = verb === 'reverse' ? 'reverse' : 'uphold';
      const note = (m[2] ?? '').trim();
      return { kind, note };
    }
  }
  return { kind: 'none' };
}

export type UserCommand = { kind: 'my-receipts' } | { kind: 'none' };

/** Parse a user's modmail body for /my-receipts (any line, case-insensitive). */
export function parseUserCommand(body: string): UserCommand {
  if (!body) return { kind: 'none' };
  if (/(^|\s)[!\/]?my[-_ ]?receipts\b/i.test(body)) return { kind: 'my-receipts' };
  return { kind: 'none' };
}
