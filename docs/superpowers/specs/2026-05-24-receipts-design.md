# Receipts — Design Spec

**Date:** 2026-05-24
**Status:** Approved (design); pre-implementation
**Target:** Reddit "Mod Tools and Migrated Apps Hackathon" — Best New Mod Tool ($10k). Deadline 2026-05-27 20:00 CDT.
**Platform:** Reddit Developer Platform (Devvit), TypeScript, Node 22.

---

## 1. Thesis

**End silent moderation — and close the loop.** On Reddit today, content disappears without explanation: AutoModerator silently *filters* posts/comments into the modqueue (the user is told nothing), and mod removals only get a reason if a human manually picks one. The result is a flood of "why was my post removed?" modmail, repeat violations, and silent attrition of good contributors who assume they were censored.

**Receipts** makes every removal explain itself — automatically — and gives the author a one-tap way to be heard. The moment an item is removed (by a mod, by AutoMod's silent filter, by AutoMod remove, or by Reddit's spam filter), Receipts (a) sends the author a plain-language, rule-cited explanation, (b) leaves an in-place breadcrumb with an appeal path, and (c) writes the decision to a searchable, mod-only audit log. If the author replies to appeal, Receipts **routes them to a human moderator** — it never adjudicates. Zero configuration to start; deterministic; no LLM.

## 2. Goals / Non-Goals

### Goals (v1)
- Detect removals from **all** sources: mod removals, AutoMod silent *filter*, AutoMod *remove*, Reddit spam filter.
- Resolve the **reason** for each removal via a deterministic fallback chain.
- Deliver a clear, rule-cited explanation to the **user** (in-place breadcrumb + modmail; mod's choice).
- **Close the loop:** every explanation carries a "reply here if you think this is wrong" appeal CTA; the modmail thread is the two-way channel; appeals reach a human mod.
- Maintain a **searchable mod-only audit log** of every removal + reason, queryable by username.
- **Zero-config** default behavior; mod-tunable via subreddit settings.

### Non-Goals (explicitly OUT of v1 — revisit post-hackathon)
- **No bot adjudication of appeals** — Receipts routes appeals to humans; it never decides if a removal was right or wrong.
- **No subreddit-going-dark / blackout notifications** — different problem (you can't message users in a private sub; not a removal). Separate tool.
- **No user risk-scoring** (this is a removal *explainer*, not a *predictor*).
- **No LLM / no external HTTP** (deterministic only — avoids API-key friction and Reddit's domain-review latency). The appeal "bot" is a deterministic router, not an AI.
- **No auto-removal / auto-ban** — Receipts *explains*; mods *act*.
- **No custom-post blocks dashboard** in v1 (audit surfaced via menu actions + mods-only wiki). Dashboard is a stretch goal only.

## 3. Net-New Positioning (claim discipline)

Do **not** claim "nobody explains removals" — false (native Removal Reasons notify users manually; AutoMod `comment:` can explain its own removals via per-rule YAML). The **defensible** claim:

> Zero-config, unified, rule-cited explanations for **every** removal — including AutoMod's **silent filter** removals that nothing else touches — with a **built-in appeal path** and a **searchable audit log**. Install once: no per-rule YAML, no per-removal clicking.

Sharpest unserved angle: **silent AutoMod filters + the closed appeal loop + audit log.** A 36-repo sweep of the most prolific Devvit mod-tool author (plus shiruken + App Directory) found no app doing this.

## 4. Architecture

One engine, clean inputs/outputs. Background (server-side) Devvit app — no custom post required for v1.

```
 INPUTS (triggers)              ENGINE                          OUTPUTS
 ─────────────────             ────────                         ───────
 ModAction ───────┐
 AutomoderatorFilterPost ──┐   normalize → RemovalEvent
 AutomoderatorFilterComment┼─► dedup (Redis) ─► ReasonResolver  ─► ① User explanation
 (Reddit spam via ModAction)│      (4-tier fallback)               (in-place breadcrumb + modmail,
                            │   ─► ExplanationComposer (template)     each w/ appeal CTA)
                            │   ─► AuditWriter (Redis + wiki)     ─► ② Audit log (searchable by user)
 ModMail (appeal reply) ───────► AppealRouter ─────────────────► ③ Route to human mods (+ attach Receipt)
 MOD SURFACES: subreddit menu actions (lookup user / recent log), subreddit settings (config)
```

### Components

Each is a focused unit: what it does / how it's used / what it depends on.

1. **Trigger handlers** — entry points for `ModAction`, `AutomoderatorFilterPost`, `AutomoderatorFilterComment`. Normalize each event into a `RemovalEvent`. Depend on: Devvit trigger registration, dedup gate.
2. **Dedup gate** — prevents double-processing when both `ModAction` and a filter trigger fire for the same item. Redis key `receipt:seen:{itemId}` (SET NX, short TTL). Depends on: Redis.
3. **ReasonResolver** — produces `ResolvedReason {text, tier, ruleRef?}` via the 4-tier chain (§6). Depends on: `getModerationLog`, `getSubredditRemovalReasons`, config, deterministic signal checker.
4. **ExplanationComposer** — renders the user-facing message (incl. appeal CTA) from a template + `ResolvedReason`. Deterministic placeholder substitution. Depends on: settings (template).
5. **DeliveryService** — posts the explanation: in-place stickied+distinguished comment (`submitComment` + `comment.distinguish(true)`) and/or `modMail.createConversation({to})`. Idempotent. Depends on: Reddit API, audit.
6. **AppealRouter** (closing the loop) — listens to the `ModMail` trigger; when a reply comes from a user we Receipt'd, ensures it reaches the mods (it already lands in the mod inbox), and *(stretch)* labels it as an appeal + attaches the original Receipt context + audit link, and records appeal status. **Never adjudicates.** Depends on: ModMail API, audit store.
7. **AuditWriter** — persists each decision to Redis (and optionally appends a mods-only wiki page). Depends on: Redis, wiki API.
8. **Mod surfaces** — subreddit menu actions: "Look up user" (form → username → that user's removal + appeal history) and "Recent log" (last N). Depend on: AuditWriter store.
9. **Settings** — subreddit-level, mod-editable config (§8). Depends on: Devvit settings API.
10. **Scheduler (minimal)** — retry queue for reason resolution when the mod-log is laggy (daisy-chain), and periodic wiki flush / audit trim. Depends on: Redis, scheduler API.

## 5. Data Model (Redis, per-subreddit install)

- `receipt:seen:{itemId}` → `"1"`, TTL ~1h. Dedup.
- `receipt:item:{itemId}` → hash: `{author, itemType, source, reasonText, reasonTier, ruleRef, deliveredVia, modName, ts, appealStatus, appealedAt}`. The decision record. `appealStatus` ∈ {none, appealed, upheld, overturned} (mods set upheld/overturned; default none).
- `receipt:user:{username}` → sorted set: score=`ts`, member=`itemId`. Fast per-user history lookup (used by AppealRouter to match a reply to its removal).
- `receipt:recent` → sorted set: score=`ts`, member=`itemId`. Trimmed to N (e.g. 500). Recent-log view.
- `receipt:pending:{itemId}` → hash for laggy reason-resolution retries (cleared on success).

Budget: 500 MB/install ceiling; records are small; trim `receipt:recent` and TTL-expire dedup keys. Comfortable at single-sub scale.

## 6. Reason Resolver — 4-tier deterministic chain

Deliberate graceful **degradation**, not silent failure: each tier is logged; if all yield nothing we emit a clearly-marked generic reason. Order:

1. **Filter trigger `reason`** — use if non-empty (instant; AutoMod filter path).
2. **`getModerationLog()` `description`/`details`** — AutoMod `action_reason` and native mod removal-reason land here. Used for AutoMod *remove* and mod removals. May need a short bounded retry/backoff for eventual consistency.
3. **Matched rule's configured comment/modmail text** — if the sub set one.
4. **Own deterministic re-derivation** — minimal signal check (account age / karma / matched keyword from sub's removal-reason list) → a plausible reason. Last resort.

`ResolvedReason.tier` is recorded in the audit so mods can see how confident the attribution is.

## 7. User Explanation + Appeal Delivery

- **In-place breadcrumb:** `reddit.submitComment` on the removed item, then `comment.distinguish(true)` (sticky + distinguish — matches native pattern). Clean for removed **posts**; best-effort for removed **comments** (the comment is gone) — modmail is the universal fallback there. **Verify (spike #4)** commenting on an already-removed item succeeds from the app account.
- **Modmail explanation:** `reddit.modMail.createConversation({ to: username, subject, body, subredditName, isAuthorHidden: true })`. (`sendPrivateMessageAsSubreddit` is deprecated — do not use.) This thread is the two-way appeal channel.
- **Appeal CTA:** both surfaces include a clear line: "Think this was a mistake? Reply here and a moderator will review it." No promise of reversal; routes to a human.
- **Idempotency:** `deliveredVia` recorded in `receipt:item:{itemId}`; never double-deliver.
- **Content safety:** message is templated (limited free-form) per Devvit Rules; states only the removal reason + appeal info — nothing sensitive, nothing that leaks mod internals. `perReasonOptOut` lets mods suppress notices for reasons where tipping off the author is undesirable (e.g. spam/ban-evasion).

## 8. Configuration (subreddit settings, mod-editable)

- `deliveryChannel`: `comment | modmail | both | off` (default: `both`).
- `explainSources`: toggles for `modRemovals`, `automodFilter`, `automodRemove`, `spamFilter` (defaults: all on except `spamFilter`).
- `appealsEnabled`: bool (default: on). When on, messages include the appeal CTA.
- `messageTemplate`: string with `{{rule}}`, `{{reason}}`, `{{itemType}}`, `{{subreddit}}`, `{{appeal}}`.
- `appealInstructions`: string rendered into `{{appeal}}`.
- `perReasonOptOut`: reasons that should NOT notify the user.

## 9. Error Handling

Aligned with fail-loud philosophy, balanced for a moderation tool:
- API/Redis errors: log loudly (with item id + source), re-queue via `receipt:pending` for bounded retry. Never swallow silently.
- The reason-resolver tiers are **intentional degradation** (each logged), distinct from error-swallowing.
- No bare catches; specific exceptions only. A delivery failure must not lose the audit record (audit-write first, deliver second; record delivery outcome).

## 10. Compliance

- Actions run as the app account (standard for mod apps). Audit is mod-only. No auto-removal/auto-ban; no bot adjudication of appeals. Templated user content. Respects user privacy (no scores exposed; in-place comment states only the reason the author is entitled to know). Subject to Reddit app review before publish.

## 11. Day-1 Go/No-Go Spike (~2h, before full build)

Hello-world app in a test sub that logs full payloads; confirm:
1. AutoMod **filter** rule (with/without `action_reason:`) → does `AutomoderatorFilter*` fire, and what is in `reason`?
2. AutoMod **remove** rule → filter trigger, or only `ModAction` (`moderator.name === "AutoModerator"`)?
3. Manual mod removal + native reason → event sequence (`removelink` then `addremovalreason`) + `getModerationLog()` correlation.
4. `submitComment` + `distinguish(true)` on a just-removed item → succeeds from app account? (post vs comment.)
5. `ModMail` trigger fires on a user reply, with enough info to match it to a logged removal (for AppealRouter).

Watch AutoMod-remove mod-log latency (eventual consistency) — affects "instant" story for that path only; the filter path is instant. If a check fails, the known fallbacks (§6, modmail-only delivery) apply.

## 12. Testing

- Unit: ReasonResolver tier selection, ExplanationComposer templating (incl. appeal CTA), dedup gate, audit read/write, AppealRouter reply→removal matching.
- Integration: end-to-end in a playtest sub (mod removal + AutoMod filter → user gets explanation + breadcrumb → user replies → appeal reaches mods → audit queryable).
- The day-1 spike validates runtime trigger/API behavior the type defs can't confirm.

## 13. Risks / Open Questions

- **Net-new framing** must lead with silent-filters + closed loop + audit (Ecosystem-Impact scoring depends on it).
- **AutoMod-remove latency** via mod-log (spike-dependent).
- **`reason` field content** at runtime (spike-dependent; fallback chain mitigates).
- **Comment-on-removed-item** from app account, esp. removed comments (spike #4).
- **ModMail reply → removal matching** reliability (spike #5; AppealRouter stretch depends on it).
- **Rate limits** — cache author lookups (only needed for tier-4 derivation); reason mostly comes from event/mod-log, not per-author API.
- **Exact scaffold idiom** (Devvit Web `/internal` endpoints vs `Devvit.addTrigger`) — resolve by scaffolding from the official **Mod Tool Template** on day 1.

## 14. Rough Milestones (~4 days)

- **Day 1:** `devvit login` + scaffold from Mod Tool Template + day-1 spike (5 checks). Trigger handlers + dedup + audit write.
- **Day 2:** ReasonResolver (4-tier) + ExplanationComposer + DeliveryService (in-place breadcrumb + modmail + appeal CTA). End-to-end for mod removals + AutoMod filter.
- **Day 3:** Settings/config, mod lookup surfaces (menu actions), per-reason opt-out, wiki audit. AppealRouter basic (replies reach mods) committed; *labeling + context-attach + status tracking* as stretch. Edge cases.
- **Day 4:** Tests, README, screenshots, 60s demo video, playtest on a real test sub, upload/publish. Submit.
