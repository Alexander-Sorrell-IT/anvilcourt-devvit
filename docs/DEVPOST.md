# Devpost submission — copy/paste blocks

Each section below maps to **exactly one Devpost form field**. Paste the block under each header verbatim into the matching field. Skip optional fields you don't need.

---

## 1. Project name *(required, 60 char max)*

```
Anvil Court — case-law engine for Reddit moderation
```

---

## 2. Elevator pitch *(required, 200 char max)*

```
Every removal becomes precedent. Every appeal opens with the rule's reversal rate already attached. One /reverse reply restores the content, DMs the user, and logs the decision as case law.
```

---

## 3. Thumbnail *(optional but use it)*

Upload this file:
```
/media/phantomcore/AI_DRIVE/hackathons/Reddit Mod Tools and Migrated Apps Hackathon/assets/icon.png
```
(1024×1024 PNG — Devpost accepts; the 3:2 ratio is a recommendation, not a requirement.)

---

## 4. About the project *(required — paste as-is, it's already Markdown)*

```markdown
## Inspiration

Every mod tool on Reddit today treats removals as one-off events. The result is the same chore, every day: a mod opens an appeal modmail and starts an *archaeology dig* — read the user's history, scroll their profile, hunt for the original removal, try to remember *"have we reversed this rule before, and what did we say?"*

Meanwhile users on the other side get silence: AutoMod's silent `filter` rule yanks their post to the modqueue with no notification, ever. Reddit's spam filter the same. They assume censorship, they leave, and the community loses a contributor it didn't need to lose.

The mod tools we surveyed (the fsvreddit, PitchforkAssistant, and shiruken portfolios; ~36 of the most-used open-source Devvit apps) all solved *pieces* of this — but **none combined automatic silent-filter explanations + a unified 4-source audit log + queryable precedent on appeal.** That gap was the entire opportunity.

## What it does

**Anvil Court is the case-law engine for Reddit moderation.** Every removal across all four sources (mod, AutoMod silent filter, AutoMod remove, Reddit spam) is caught, auto-explained to the author with a rule-cited message and an appeal path, and logged. When a user appeals, the rule's prior outcomes auto-render as a mod-only internal note in the appeal thread — headline-first, so the preview shows the story even when the note is collapsed:

> **REVERSAL RATE 23% (3/13) — u/alice appealing "No spam"**
>
> Across 13 prior decisions on this rule: 3 overturned (23%), 0 upheld, 0 appealed, 10 not appealed.
> Recent reversals: 2026-05-21 — u/example1, 2026-05-12 — u/example2.
> This appellant (u/alice): 0 prior decisions.
> To reverse: reply `/reverse` (optionally with a note for the user).

The mod replies `/reverse posted in error` — and Anvil Court approves the item, DMs the user with a rule-cited reversal notice, and logs the decision as *overturned* — which feeds the next appeal's precedent panel. Case law for moderation, growing automatically.

A single click also publishes (or refreshes) an aggregate, anonymized **Mod Mirror** wiki page at `/wiki/anvil-court` — per-rule totals, reversal rates, 30-day activity. **No usernames, no item bodies, no permalinks** — just the docket statistics. The sub's moderation gets a public, automatically maintained accountability ledger. Subs stand behind their work, in public.

## Three surfaces, one substrate

The same audit log powers three distinct mod surfaces:

1. **Triage** — per-post / per-comment mod menu *Anvil Court: precedent for this item* shows the rule's prior outcomes *before the mod decides*.
2. **Appeal** — precedent panel auto-renders in the appeal modmail thread.
3. **Public ledger** — Mod Mirror publishes the anonymized aggregate page.

Plus self-serve transparency for users: DM the sub with `/my-receipts` to see your own record.

## How we built it

- **Pure-core architecture.** Decision logic (rule keying, stats, message composition, command parsing, mirror rendering, label sanitization) lives in `src/core/`, fully unit-tested with no platform dependencies. The Devvit layer in `src/server/` is thin adapter glue. **67 unit tests pass, `tsc` clean, esbuild clean.**
- **Deterministic — no LLM, no external services.** Same input → same output. Reasons resolve via a 4-tier deterministic fallback (filter reason → mod log → configured removal-reason text → generic notice). Audit lives in Redis (scoped to the app install).
- **Three adversarial-agent design rounds** hardened the surface: round 1 added the case-law layer (precedent panel + `/reverse` + Case File by rule + `/my-receipts`); round 2 added the Mod Mirror, 90-day cold-start backfill, and per-author daily rate cap on silent-filter explanations; round 3 added the per-item precedent menu so case law surfaces at *triage*, not just at appeal.
- **A 5-agent code review pass** before submission found and fixed the demo-killer bugs (headline math off-by-one, public-wiki PII leak path, modmail self-loop risk, comment-URL malformation, etc.) — all sealed before release.

## Try it in 30 seconds (no video needed)

Anvil Court ships with a **Sandbox** mod menu so you can evaluate it immediately:

1. Install Anvil Court on a test subreddit (two clicks).
2. Open the mod menu → *Anvil Court: Sandbox — load demo data*. This injects 13 sample "No spam" records with 3 marked reversed (`23% (3/13)`) — the corpus the precedent panel would render against on a live appeal.
3. Open the mod menu → *Anvil Court: case file by rule* → pick "No spam". The toast renders: `No spam: 13 total, 3 reversed (23%), 0 upheld, 0 open, 10 not appealed.` — that's the case-law engine working over the corpus.
4. Open the mod menu → *Anvil Court: publish public mirror*. The wiki page at `/wiki/anvil-court` renders with the anonymized per-rule table. **Open it in incognito to see exactly what the public sees** — no usernames, no item bodies, no permalinks.
5. Remove a real post (or comment) — Anvil Court delivers the explanation and logs the receipt. The next appeal modmail in any thread renders the precedent panel automatically.

When done, *Anvil Court: Sandbox — clear demo data* wipes the samples.

## Challenges we ran into

- **Eventual-consistency on the mod log.** A `removelink` ModAction trigger fires immediately; the corresponding `addremovalreason` entry (with the picked reason text) propagates a beat later. We now extract `details` directly from the trigger payload first, falling back to the mod log only if needed — so the bucket-assignment doesn't race the modlog index.
- **Public-page PII surface.** The rule label on the public Mod Mirror is derived from mod free-text reasons, which can contain usernames ("removed u/bob's spam ring") or attacker-supplied URLs. We added a `sanitizeRuleLabel` pass that strips `u/*` mentions and URLs before storage, plus an extended markdown escape on the wiki cell renderer.
- **Avoiding the silent-filter feedback channel.** A spammer who hits the silent filter 50 times shouldn't get 50 explanations. Per-author daily rate cap (default 3/day, configurable, UTC-keyed) keeps the channel from becoming a spammer signal.
- **Modmail trigger v2 idempotency.** Naïve handling re-renders the precedent panel on every reply in the same thread. We gate the panel via a per-conversation `claimPanelEmitOnce` flag so chatty appellants get exactly one panel, regardless of reply count.
- **Headline math off-by-one.** The just-flagged appeal's own record was in the rule's bucket at panel-render time, turning 3/13 into 3/14. Now extracted into a pure helper `priorRecordsExcluding(records, targetItemId)` with a dedicated regression test.

## What we learned

The Devvit platform is right at the inflection point where mod tools can move from *automating tasks* to *changing the substrate of moderation*. Reddit moderation's biggest deficit isn't speed — it's **memory**. Mods make thousands of decisions and remember almost none of them; appeals get decided in isolation; rules drift quietly. Anvil Court bets that turning every decision into precedent — and giving mods one-reply restoration plus a public anonymized ledger — reshapes the *social contract* of moderation, not just the workflow. The technical novelty (4-source audit, deterministic reason resolution, precedent panel rendering) is real, but the bigger move is making moderation **show its work**.

## What's next

- **Cross-sub precedent.** Opt-in federation so the rule's reversal rate aggregates across subs that share moderation philosophies (e.g. the support-community network).
- **Trend dashboards.** Per-rule reversal-rate sparklines on the Case File menu so mods can see a rule mis-firing weeks before they would notice from individual appeals.
- **Public dispute resolution.** Anonymized appeal summaries on the Mod Mirror so users can see how the rule has been applied without seeing who appealed.
```

---

## 5. Built with *(required — tag list)*

```
typescript, devvit, reddit-developer-platform, devvit-web, redis, esbuild, vitest, node.js
```

---

## 6. "Try it out" links *(optional but include both)*

```
https://developers.reddit.com/apps/anvilcourt
https://github.com/Alexander-Sorrell-IT/anvilcourt-devvit
```

---

## 7. Image gallery *(optional, skip if no time)*

Skip. If you want one image, use `assets/icon.png` again.

---

## 8. Video demo link *(optional — LEAVE BLANK)*

Don't fill this. The "Try it in 30 seconds" section in the story covers the no-video path.

---

## 9. Reddit username *(required)*

```
u/AlexanderSorrell-IT
```

---

## 10. developers.reddit.com app page *(required)*

```
https://developers.reddit.com/apps/anvilcourt
```

(If `devvit upload` showed a different URL — e.g. the slug `anvilcourt` was taken and you fell back to `anvil-court` — use whatever URL the upload printed.)

---

## 11. Tool overview *(required)*

```
Anvil Court catches every Reddit removal across four sources — mod, AutoMod silent filter, AutoMod remove rule, Reddit spam — and auto-explains it to the author with a rule-cited message and a working appeal channel.

When a user appeals via modmail, Anvil Court renders a mod-only internal note in the thread showing the rule's reversal rate, recent reversals, the appellant's history, and a one-reply restoration command (/reverse). A human moderator always makes the final call; the bot never overturns a removal on its own.

Three surfaces, one substrate (a Redis-backed audit log of every decision):
1. TRIAGE — per-post / per-comment mod menu "precedent for this item" shows the rule's prior outcomes before the mod decides.
2. APPEAL — precedent panel auto-renders in the appeal modmail thread; /reverse closes the loop (approves on Reddit, DMs the user, logs as overturned).
3. PUBLIC LEDGER — Mod Mirror publishes an aggregate, anonymized case-law page at /wiki/anvil-court (per-rule totals, reversal rates, 30-day activity, no usernames or permalinks).

Plus: cold-start backfill of the last 90 days of mod log so precedent works from day one; per-author daily rate cap on silent-filter explanations (default 3/day) so the channel doesn't become a spammer feedback loop; self-serve /my-receipts user keyword.

INSTANT EVALUATION (no video required): install on a test sub, click "Anvil Court: Sandbox — load demo data" in the mod menu. 13 sample records appear (3 reversed, 23%). Click "case file by rule" → "No spam" to see the stats. Click "publish public mirror" → open the wiki page in incognito to see exactly what the public sees. Remove a real post to see the live explanation + audit. When done, "Sandbox — clear demo data" wipes the samples.

Built with Devvit Web, TypeScript, Redis. Deterministic — no LLM, no external services. Pure-core architecture: decision logic unit-tested independent of platform; 67 unit tests, tsc clean.

Source: https://github.com/Alexander-Sorrell-IT/anvilcourt-devvit
```

---

## 12. Project Impact *(required)*

```
1. LARGE DEFAULT-TIER SUBREDDITS (e.g. r/AskReddit, r/news, r/explainlikeimfive — hundreds of thousands of weekly active users). These run aggressive AutoMod configs that silently filter huge volumes; "why was my post removed?" is consistently among the top modmail categories. Anvil Court deflects that modmail at the source and turns each rule into a measurable lever — mods can see "this rule has a 41% reversal rate" and decide whether to revise the rule itself, not just handle appeals one at a time.

2. MID-SIZE HOBBY & NICHE COMMUNITIES (10k–200k members — a game, hardware, or fitness sub). These rely on a handful of volunteer mods and can't afford to lose engaged contributors. Anvil Court stops the silent attrition of good users whose posts trip a keyword filter, by telling them exactly what to fix, and shows the mod team which rules are actually catching legitimate posts (reversal rate) versus spam (uphold rate).

3. SUPPORT / ADVICE COMMUNITIES (e.g. legal, medical, personal-finance advice). Removals here are sensitive and frequently appealed; consistent, documented, rule-cited explanations reduce conflict — and the precedent panel means every appeal is decided in the context of prior decisions on the same rule, instead of from individual mods' memory. A defensible, queryable audit trail when decisions are challenged.

CONCRETE TIME / IMPACT
- The "why was I removed?" question — one of the most repetitive items in any busy modmail — is auto-answered at the moment of removal.
- Appeal handling drops from ~2 minutes of profile/history forensics to ~10 seconds because the precedent panel renders inside the appeal thread.
- Reversal is one reply (/reverse) instead of: re-open item → click approve → manually DM the user → write the reason → remember to log somewhere.
- Rule tuning becomes data-driven. A rule's reversal rate is a direct signal that the rule is mis-firing. Mods can see it in the Case File menu and revise the rule before it bleeds more good users.
- Community health: good contributors who would have silently left (assuming censorship) instead get clear feedback and stay.

Net: significant daily moderator time saved on the highest-frequency chores, plus a structural shift from one-off removals to managed precedent, plus reduced user friction and better-retained communities — with a two-click, zero-config install.
```

---

## 13. Is this a new app or a migrated app? *(required)*

```
New app
```

---

## 14. [Ported fields] *(only if migrated — skip)*

For "Original Bot username", "Port Completion", "Are you the original owner":
```
N/A
```

---

## 15. Nominate a most helpful user *(optional — skip)*

Leave blank.

---

## 16. Sponsor / Special Prizes *(optional — skip)*

Leave blank.

---

# Submit

Hit Submit. Deadline today, 2026-05-27, 6:00pm PDT / 9:00pm EDT / 8:00pm CDT.
