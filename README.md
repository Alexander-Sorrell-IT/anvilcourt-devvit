# Anvil Court — case-law engine for Reddit moderation

**Every removal becomes precedent.** When a post or comment is removed on your subreddit — by a moderator, by AutoModerator's *silent filter*, by an AutoMod remove rule, or by Reddit's spam filter — Anvil Court automatically sends the author a clear, rule-cited explanation with a built-in way to appeal, logs the decision, and treats the corpus of past decisions as a queryable body of moderation case law.

When a user appeals, Anvil Court auto-renders an internal mod-only panel showing the rule's track record. One reply — `/reverse` — restores the content, DMs the user, and logs the outcome as precedent for the next appeal. A separate menu publishes an anonymized public case-law page to `/wiki/anvil-court`.

No more "why was my post removed?" modmail. No more good contributors quietly leaving because AutoMod ate their comment and told them nothing. No more deciding appeals from memory. No more black-box moderation.

## The problem

- **AutoModerator is silent.** Its `filter` action sends content to the modqueue and tells the user *nothing*. Most subs never configure per-rule `comment:` text, so legitimate users assume they were censored — and leave.
- **Removal reasons are manual.** Reddit's native Removal Reasons require a mod to click and pick on every removal, and they don't cover AutoMod at all.
- **Appeals are decided from memory.** Mods have no structured record of how the same rule has been ruled on before. Decisions drift; users distrust them.
- **Moderation is a black box.** Subs have no honest, queryable public artifact for how they actually moderate.

## What Anvil Court does

Three surfaces, one substrate.

1. **Triage** — mod menu on any post or comment in the queue: *"Anvil Court: precedent for this item"* shows the rule's prior outcomes before you decide.
2. **Appeal** — when a user replies to an appeal modmail, Anvil Court auto-renders an internal mod-only note in the same thread leading with **REVERSAL RATE X% (n/T)** as the headline, then the rule's full breakdown and the appellant's prior history.
3. **`/reverse [note]`** — mod reply restores the content via `reddit.approve(item)`, DMs the user with a rule-cited reversal notice, marks the receipt as overturned (feeding future precedent panels). `/uphold` records the decision without reverting.
4. **Public ledger (Mod Mirror)** — single menu click publishes (or refreshes) `/wiki/anvil-court`: an aggregate, anonymized per-rule case-law page. Totals, reversal rates, 30-day activity. **No usernames, no item bodies, no permalinks** — just the docket statistics. The sub stands behind its moderation in public.
5. **`/my-receipts`** — users DM the sub with this keyword to see their own removal history. Self-serve transparency, zero mod time.
6. **Cold-start backfill** — on install, walks the last 90 days of the mod log and seeds the case-law corpus. Precedent panel works day one, not after weeks of new data.

Deterministic. No LLM. No external services. No auto-banning. Two-click install.

## For moderators

- **Mod menu** *(subreddit)*: *Anvil Court: look up user* / *recent removals* / *case file by rule* / *publish public mirror*.
- **Mod menu** *(per post / per comment)*: *Anvil Court: precedent for this item* — see the rule's prior outcomes from the queue.
- **In any appeal modmail**: reply `/reverse [note]` to restore + DM the user + log; reply `/uphold` to mark upheld.
- **Settings**: delivery channel, message template, per-source toggles, appeals on/off, per-reason opt-out (e.g. spam, ban evasion), per-author daily rate cap on AutoMod silent-filter explanations.
- Install and forget — sensible defaults out of the box.

## How it's built

A background Devvit Web app (TypeScript, Node 22). The decision logic and case-law primitives are a pure, unit-tested core (`src/core/`: `caseLaw.ts`, `mirror.ts`, `reasonResolver.ts`, `explanationComposer.ts`, `config.ts`). Devvit/Reddit/Redis platform glue is thin adapters (`src/server/`).

```
triggers → dedup → reason resolver (4-tier) → explanation composer → delivery (comment + modmail) → audit log (item / user / recent / per-rule / conv→record)
appeal reply → precedent panel rendered as internal mod note in same conversation
mod /reverse → reddit.approve(item) → user DM → audit overturned → feeds next precedent panel
mod menu (publish mirror) → render anonymized rule rollup → updateWikiPage(/wiki/anvil-court)
```

State lives in Redis, per subreddit. 56 unit tests; `tsc --build` clean.

## Status

Built for the Reddit Mod Tools and Migrated Apps Hackathon (2026). Category: Best New Mod Tool.
