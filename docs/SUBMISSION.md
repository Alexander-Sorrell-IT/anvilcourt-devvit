# Devpost Submission — Receipts

**Category:** Best New Mod Tool
**App listing:** https://developers.reddit.com/apps/receipts  *(confirm/update after publish)*
**Source:** https://github.com/Alexander-Sorrell-IT/receipts-devvit
**Reddit username(s):** u/AlexanderSorrell-IT
**Built with:** Reddit Developer Platform (Devvit Web), TypeScript, Redis. Deterministic — no LLM, no external services.

---

## Tool Overview

**Receipts is the case-law engine for Reddit moderation. Every removal becomes precedent. Every appeal lands in the mod inbox with the rule's track record already attached. One reply — `/reverse` — restores the content, DMs the user, and logs the outcome as precedent for the next appeal.**

Receipts catches every removal across all four sources — a mod's removal, AutoModerator's silent `filter`, an AutoMod `remove` rule, or Reddit's spam filter — auto-explains it to the author in plain language, runs a built-in appeal channel through modmail, and treats the resulting decision corpus as a living body of precedent that informs future moderation.

### The pitch in one table

| Removal source | What the author sees today | With Receipts |
|---|---|---|
| Mod removes with a Removal Reason | A message — *if* the mod clicks through | Same message + appeal CTA + case file entry |
| Mod removes (no reason set) | Nothing | Rule-cited explanation + appeal + case file |
| AutoMod `remove` rule | Per-rule `comment:` text *if configured* (rare) | Resolved reason + appeal + case file |
| **AutoMod `filter` rule** | **Nothing — silent modqueue** | **Resolved reason + appeal + case file** |
| Reddit spam filter | Nothing | Configurable (off by default — avoids tipping spammers) |
| **User appeals** | DMs, modmails, meta-posts — chaos | **Internal mod-only note shows: rule's prior outcomes, reversal rate, appellant history. One `/reverse` reply closes the loop.** |
| **Public accountability** | Nothing — moderation is a black box | **Mod Mirror: aggregate, anonymized case-law page auto-published to `/wiki/receipts`. Per-rule totals, reversal rates, 30-day activity. No usernames or content — just the docket statistics. The sub stands behind its moderation, in public.** |

### Why this is paradigm-shift, not incremental

Every mod tool on the platform today treats removals as one-off events. The result is the same chore, every day: a mod opens an appeal modmail and starts an *archaeology dig* — read the user's history, scroll their profile, hunt for the original removal, try to remember *"have we reversed this rule before, and what did we say?"*

Receipts changes the substrate. Because every removal is logged with a deterministic reason, and every appeal links back to that record, and every reversal updates the same audit log, **the corpus of past decisions becomes a queryable body of moderation case law.** Open any new appeal and the precedent panel renders automatically:

> *Across **47** prior receipts on this rule: **12 overturned** (26%), 28 upheld, 3 appealed (open), 4 not appealed.*
> *Recent reversals on this rule: 2026-05-21 — u/example1, 2026-05-12 — u/example2*
> *This appellant (u/alice): 2 prior receipt(s), 1 previously overturned.*
> *To reverse this removal: reply `/reverse` (add a note for the user, e.g. `/reverse posted in error`).*

That panel is mod-only (internal modmail note). The mod decides with full context, replies `/reverse`, and Receipts:
1. Approves the item on Reddit (content restored).
2. DMs the appellant with a rule-cited reversal notice.
3. Logs the decision as *overturned* — feeding the next appeal's precedent panel.

Of the 36 most-used open-source Devvit mod apps we reviewed (the fsvreddit, PitchforkAssistant, and shiruken portfolios plus the App Directory's top mod-tools tab), individual pieces exist but the synthesis does not: **none combine automatic silent-filter explanations + a unified 4-source audit log + queryable precedent on appeal**. Receipts is the first mod tool to make moderation *show its work* — and the first to let mods *rule with the corpus, not from memory.*

### The pipeline, fully automatic

1. **Detect + reason.** Every removal across all four sources via `ModAction`, `AutomoderatorFilterPost`, and `AutomoderatorFilterComment` triggers (deduplicated so one removal = one action). Resolves *why* through a deterministic 4-tier fallback: AutoMod filter reason → mod log (selected removal reason or `action_reason`) → configured removal-reason text → clear generic notice.
2. **Explain.** Stickied, distinguished in-place comment and/or modmail to the author, each carrying an appeal line. **Configurable per-author daily rate cap** on AutoMod silent-filter explanations (default 3/day) — protects against turning the silent filter into a spammer feedback channel.
3. **Appeal + precedent.** Modmail reply triggers (a) appeal flagging on the record and (b) an internal mod-only precedent panel rendered into the same conversation, leading with the headline reversal-rate stat so the preview tells the story even when the note is collapsed. *A human moderator always makes the final call — the bot never overturns a removal on its own.*
4. **Reverse / uphold.** `/reverse [note]` in any appeal thread approves the content, DMs the user, logs the outcome. `/uphold` records the decision without reverting. Either way, the case file grows.
5. **Look it up.** Four mod menu actions: *Receipts: look up user* / *Receipts: recent removals* / *Receipts: case file by rule* / *Receipts: publish public mirror*.
6. **Mod Mirror — public case law.** A single menu click publishes (or refreshes) an aggregate, anonymized public page at `/wiki/receipts` — totals, reversal rate, last-30-day activity, per rule. **No usernames, no item bodies, no permalinks.** The sub's moderation gets a public, automatically maintained accountability ledger.
7. **Cold-start backfill.** On install, Receipts walks the last 90 days of the mod log and seeds the case-law corpus retroactively. The precedent panel works from day one — not after weeks of new data.
8. **Self-serve transparency.** Users DM the sub with `/my-receipts` to see their own history, no mod involvement.

**For moderators:** install in two clicks; works immediately. Settings screen exposes delivery channel, message template, per-source toggles, appeals on/off, and per-reason opt-out (e.g. spam, ban evasion) — no code, no YAML.

**For users:** instead of silence, a clear rule-cited explanation, a real path to be heard, and self-serve transparency on their own record.

---

## Project Impact

*(1–3 communities that would benefit, and how)*

1. **Large default-tier subreddits** (e.g. r/AskReddit, r/news, r/explainlikeimfive — hundreds of thousands of weekly active users). These run aggressive AutoMod configs that silently filter huge volumes; *"why was my post removed?"* is consistently among the top modmail categories. Receipts deflects that modmail at the source and turns each rule into a measurable lever — mods can see *"this rule has a 41% reversal rate"* and decide whether to revise the rule itself, not just handle appeals one at a time.

2. **Mid-size hobby & niche communities** (10k–200k members — e.g. a game, hardware, or fitness sub). These rely on a handful of volunteer mods and can't afford to lose engaged contributors. Receipts stops the silent attrition of good users whose posts trip a keyword filter, by telling them exactly what to fix, *and* shows the mod team which rules are actually catching legitimate posts (reversal rate) versus spam (uphold rate).

3. **Support / advice communities** (e.g. legal, medical, personal-finance advice). Removals here are sensitive and frequently appealed; consistent, documented, rule-cited explanations reduce conflict — and the precedent panel means every appeal is decided in the context of prior decisions on the same rule, instead of from individual mods' memory. A defensible, queryable audit trail when decisions are challenged.

**Time / impact, concretely:**
- The *"why was I removed?"* question — one of the most repetitive items in any busy modmail — is auto-answered at the moment of removal.
- Appeal handling drops from **~2 minutes of profile/history forensics to ~10 seconds** because the precedent panel renders inside the appeal thread.
- Reversal is **one reply** (`/reverse`) instead of: re-open the item → click approve → manually DM the user → write the reason → remember to log somewhere.
- **Rule tuning becomes data-driven.** A rule's reversal rate is a direct signal that the rule is mis-firing. Mods can see it in the Case File menu and revise the rule before it bleeds more good users.
- **Community health:** good contributors who would have silently left (assuming censorship) instead get clear feedback and stay — the hardest-to-measure but most valuable effect.

Net: significant, daily moderator time saved on the highest-frequency chores, plus a structural shift from *one-off removals* to *managed precedent*, plus reduced user friction and better-retained communities — with a two-click, zero-config install.

---

## Notes for judges
- **Deterministic, no surprises.** No AI, no external API calls, no auto-banning. Same input → same output. Removals stay mod-driven; Receipts only *explains, indexes, and on a mod's explicit `/reverse` command, restores.*
- **Live and validated end-to-end** on r/alexander_sorrell_it: real removal → reason resolved from mod log → in-place explanation comment → modmail → appeal flag → precedent panel rendered → mod replies `/reverse` → content restored + user DM'd + audit entry overturned + Case File menu shows the updated stats.
- **Privacy-respecting.** Audit is mod-only; user-facing messages state only the reason the author is entitled to know. Spam reasons opt-out by default so we don't tip off bad actors. The precedent panel is an *internal* modmail note — never visible to the appellant.
- **Pure-core architecture.** Decision logic and case-law primitives (`ruleKey`, `computeRuleStats`, `parseModCommand`, `rollupRule`, `renderMirrorMarkdown`, message composers) are unit-tested in `src/core/` independent of the platform; the Devvit layer (`src/server/`) is thin adapter glue. **49 unit tests**, `tsc` clean. The audit substrate composes — every Receipt already logged retroactively becomes precedent and ledger row.
- **Demo path (60 seconds, one continuous shot):** remove a post in r/alexander_sorrell_it → stickied explanation comment appears + modmail lands → switch to the user's account, reply to appeal → switch to mod modmail, see the precedent panel render as an internal note with **REVERSAL RATE 23% (3/13)** as its headline → reply `/reverse posted in error` → cut to the user's inbox showing the reversal DM → cut to mod menu *Receipts: publish public mirror* → switch tab to `/r/alexander_sorrell_it/wiki/receipts` showing the updated public case-law table. Five complete loops in 60 seconds.
