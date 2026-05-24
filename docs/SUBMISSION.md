# Devpost Submission — Receipts

**Category:** Best New Mod Tool
**App listing:** https://developers.reddit.com/apps/grantscribe  *(confirm/update after publish)*
**Reddit username(s):** u/AlexanderSorrell-IT
**Built with:** Reddit Developer Platform (Devvit Web), TypeScript, Redis. Deterministic — no LLM, no external services.

---

## Tool Overview

**Receipts ends silent moderation: every content removal automatically explains itself to the user, and lands in a searchable, mod-only audit log.**

On Reddit today, content vanishes without a word. AutoModerator's `filter` action quietly sends posts and comments to the modqueue and tells the author *nothing*; most subreddits never write per-rule comment text, so legitimate users assume they were censored — and leave. Native Removal Reasons exist, but they're manual (a mod must click and pick a reason every time) and don't cover AutoMod at all. The result is a flood of *"why was my post removed?"* modmail and the slow, invisible attrition of good contributors.

**What Receipts does, automatically, the moment anything is removed:**

1. **Detects every removal** — by a moderator, by AutoMod's silent `filter`, by an AutoMod remove rule, or by Reddit's spam filter — via the `ModAction`, `AutomoderatorFilterPost`, and `AutomoderatorFilterComment` triggers (deduplicated so one removal = one action).
2. **Determines *why*** through a deterministic 4-tier fallback: the AutoMod filter reason → the mod log (the mod-selected removal reason or AutoMod's `action_reason`) → the subreddit's configured removal-reason text → a clear generic notice.
3. **Explains it to the author** — a stickied, distinguished in-place comment and/or a modmail, each carrying a *"reply here if you think this is a mistake"* appeal line.
4. **Closes the loop** — because the explanation is delivered by modmail, the user's reply lands directly in the mod inbox; Receipts flags it as an appeal. **A human moderator always makes the final call — the bot never overturns a removal.**
5. **Logs every decision** to a searchable, mod-only audit trail. Two mod menu actions — *"Receipts: look up user"* and *"Receipts: recent removals"* — turn appeal-handling from a two-minute archaeology dig into a two-second lookup.

**For moderators:** install in two clicks; it works immediately with sensible defaults. A subreddit settings screen lets mods choose the delivery channel, edit the message template, toggle which removal sources are explained, turn appeals on/off, and suppress notifications for sensitive reasons (e.g. spam) — no code, no YAML.

**For users:** instead of silence, they get a clear, polite, rule-cited explanation and a real way to be heard.

**Why it's new to Devvit:** a review of 36+ existing Devvit mod apps found none that automatically explain AutoMod's *silent filter* removals or maintain a unified removal+reason audit log. Receipts is the first tool to make moderation *show its work* — across every removal source — with zero configuration.

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
- Deterministic and reliable at scale: no AI, no external API calls, no auto-banning. Removals stay mod-driven; Receipts only *explains* and *logs*.
- Privacy-respecting: the audit is mod-only; user-facing messages state only the reason the author is entitled to know.
