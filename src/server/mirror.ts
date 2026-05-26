// Mod Mirror — orchestrates data load + render + publish of the public case-law page.
// Aggregate-only output (renderer enforces that); we just write the result to a wiki page.
import { context, reddit } from "@devvit/web/server";
import { renderMirrorMarkdown, rollupRule, type MirrorRuleRow } from "../core/mirror.ts";
import { getRuleRecords, listRules } from "./audit.ts";

const WIKI_PAGE = "anvil-court";
const MAX_RULES = 50;

function activeSubName(): string {
  const anyCtx = context as unknown as { subredditName?: string };
  return anyCtx.subredditName ?? "";
}

export interface PublishResult {
  ok: boolean;
  subreddit: string;
  ruleCount: number;
  totalReceipts: number;
  reason?: string;
}

/** Build the mirror page markdown for the active subreddit. Pure compute over Redis reads. */
export async function buildMirror(subreddit: string, now: number = Date.now()): Promise<{
  markdown: string;
  rows: MirrorRuleRow[];
  totalReceipts: number;
}> {
  const rules = await listRules(subreddit, MAX_RULES);
  const rows: MirrorRuleRow[] = [];
  let totalReceipts = 0;
  for (const r of rules) {
    const records = await getRuleRecords(subreddit, r.slug, 500);
    const row = rollupRule({ label: r.label, slug: r.slug, records, now });
    totalReceipts += row.total;
    rows.push(row);
  }
  const markdown = renderMirrorMarkdown({ subreddit, rules: rows, generatedAt: now });
  return { markdown, rows, totalReceipts };
}

/** Publish (create or update) the wiki page for the active subreddit. */
export async function publishMirror(): Promise<PublishResult> {
  const subreddit = activeSubName();
  if (!subreddit) {
    return { ok: false, subreddit: "", ruleCount: 0, totalReceipts: 0, reason: "no subreddit context" };
  }
  const { markdown, rows, totalReceipts } = await buildMirror(subreddit);
  try {
    // Try update first; fall back to create. Either path lands the page.
    try {
      await reddit.updateWikiPage({
        subredditName: subreddit,
        page: WIKI_PAGE,
        content: markdown,
        reason: "Anvil Court: scheduled mirror update",
      });
    } catch {
      await reddit.createWikiPage({
        subredditName: subreddit,
        page: WIKI_PAGE,
        content: markdown,
        reason: "Anvil Court: initial mirror publish",
      });
    }
    return { ok: true, subreddit, ruleCount: rows.length, totalReceipts };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[anvilcourt] mirror publish failed:", e);
    return { ok: false, subreddit, ruleCount: rows.length, totalReceipts, reason: msg };
  }
}
