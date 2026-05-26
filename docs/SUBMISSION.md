# Devpost Submission — Receipts

**Category:** Best New Mod Tool
**App listing:** https://developers.reddit.com/apps/grantscribe  *(confirm/update after publish)*
**Source:** https://github.com/Alexander-Sorrell-IT/receipts-devvit
**Reddit username(s):** u/AlexanderSorrell-IT
**Built with:** Reddit Developer Platform (Devvit Web), TypeScript, Redis. Deterministic — no LLM, no external services.

---

## Tool Overview

**Receipts ends silent moderation. Every content removal — by a mod, by AutoModerator's silent `filter`, by an AutoMod remove rule, or by Reddit's spam filter — automatically explains itself to the author, with a built-in appeal channel and a searchable, mod-only audit log.**

The problem in one paragraph: AutoModerator's `filter` action sends posts to the modqueue and tells the author *nothing*. Native Removal Reasons require a mod to click and pick on every removal and don't cover AutoMod at all. The result is a flood of *"why was my post removed?"* modmail, daily appeal archaeology, and the invisible attrition of good contributors who assumed they were censored. Receipts fixes all three at once.

**The pipeline, fully automatic:**

1. **Detect + reason.** Catches every removal across all four sources via `ModAction`, `AutomoderatorFilterPost`, and `AutomoderatorFilterComment` triggers (deduplicated so one removal = one action). Resolves *why* through a deterministic 4-tier fallback: AutoMod filter reason → mod log (selected removal reason or `action_reason`) → configured removal-reason text → clear generic notice.
2. **Explain.** Posts a stickied, distinguished in-place comment and/or a modmail to the author, each carrying a *"reply here if you think this is a mistake"* appeal line.
3. **Appeal loop.** Modmail replies land in the mod inbox and Receipts flags them as appeals. **A human moderator always makes the final call — the bot never overturns a removal.**
4. **Audit.** Every decision lands in a searchable, mod-only log. Two menu actions — *"look up user"* and *"recent removals"* — turn appeal handling from two minutes of profile forensics into a two-second lookup.

**For moderators:** install in two clicks, works immediately. A settings screen exposes delivery channel, message template, per-source toggles, appeals on/off, and per-reason opt-out (e.g. spam, ban evasion) — no code, no YAML.

**For users:** instead of silence, a clear, polite, rule-cited explanation and a real way to be heard.

### What exists today vs. Receipts

| Removal source | What the author sees today | With Receipts |
|---|---|---|
| Mod removes with a Removal Reason | A message — *if* the mod clicks through | Same message + appeal CTA + audit entry |
| Mod removes (no reason set) | Nothing | Rule-cited explanation + appeal + audit |
| AutoMod `remove` rule | Per-rule `comment:` text *if configured* (rare) | Resolved reason + appeal + audit |
| **AutoMod `filter` rule** | **Nothing — silent modqueue** | **Resolved reason + appeal + audit** |
| Reddit spam filter | Nothing | Configurable (off by default — avoids tipping spammers) |

**Why it's new to Devvit:** a review of 36+ existing Devvit mod apps found none that automatically explain AutoMod's *silent filter* removals or maintain a unified removal+reason audit log across all four sources. Receipts is the first tool to make moderation *show its work* — every removal, every source, zero configuration.

---

## Project Impact

*(1–3 communities that would benefit, and how)*

1. **Large default-tier subreddits** (e.g. r/AskReddit, r/news, r/explainlikeimfive — hundreds of thousands of weekly active users). These run aggressive AutoMod configs that silently filter huge volumes; *"why was my post removed?"* is consistently among the top modmail categories. Receipts deflects that modmail at the source and gives the mod team an instant, searchable record for the appeals that remain.

2. **Mid-size hobby & niche communities** (10k–200k members — e.g. a game, hardware, or fitness sub). These rely on a handful of volunteer mods and can't afford to lose engaged contributors. Receipts stops the silent attrition of good users whose posts trip a keyword filter, by telling them exactly what to fix.

3. **Support / advice communities** (e.g. legal, medical, personal-finance advice). Removals here are sensitive and frequently appealed; consistent, documented, rule-cited explanations reduce conflict and give mods a defensible audit trail.

**Time / impact, concretely:**
- The *"why was I removed?"* question is one of the single most repetitive items in any busy modmail. Auto-answering it at the moment of removal removes that recurring load entirely.
- Appeal handling drops from **~2 minutes of profile/history forensics to a ~2-second username lookup** in the audit log.
- Per-item triage no longer requires the mod to manually reconstruct *why* something is in the queue — the reasoning is already attached.
- **Community health:** good contributors who would have silently left (assuming censorship) instead get clear feedback and stay — the hardest-to-measure but most valuable effect.

Net: significant, daily moderator time saved on the highest-frequency chores, plus reduced user friction and better-retained communities — with a two-click, zero-config install.

---

## Notes for judges
- **Deterministic, no surprises.** No AI, no external API calls, no auto-banning. Removals stay mod-driven; Receipts only *explains* and *logs*. Same input → same output, every time.
- **Live and validated end-to-end** on r/alexander_sorrell_it: real removal → reason resolved from mod log → in-place explanation comment → modmail → appeal flag → audit entry visible via mod menu.
- **Privacy-respecting.** Audit is mod-only; user-facing messages state only the reason the author is entitled to know. Spam reasons opt-out by default so we don't tip off bad actors.
- **Pure-core architecture.** Decision logic is unit-tested in `src/core/` independent of the platform; the Devvit layer (`src/server/`) is thin adapter glue. 17 unit tests, `tsc` clean.
