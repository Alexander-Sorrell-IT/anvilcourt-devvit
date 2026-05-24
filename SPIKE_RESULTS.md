# Day-1 Spike Results

**Date:** 2026-05-24
**Verdict: GO.** Core trigger mechanism + payload shapes confirmed live; remaining items have fallbacks and are validated in the Phase 5 end-to-end playtest.

## Confirmed live (playtest in r/alexander_sorrell_IT, app `grantscribe` v0.0.1.1)
- `devvit playtest <sub>` uploads + installs to the real sub and hot-reloads. Trigger keys in `devvit.json` are valid (`onModAction`, `onAutomoderatorFilterPost`, `onAutomoderatorFilterComment`, `onModMail` accepted at upload).
- **`onModAction` fires** and our `/internal/triggers/mod-action` endpoint receives the full payload. Spike logger works.
- **ModAction payload shape (confirmed):**
  - `action: string` (e.g. `dev_platform_app_changed`, and for removals `removelink`/`removecomment`/`spamlink`/`spamcomment`) — MUST filter to removal actions.
  - `moderator: { name, id, ... }` → AutoMod appears as `name === "AutoModerator"`.
  - `subreddit: { name, id, ... }`.
  - `targetComment: { id, author (username string), body, numReports, ... }` — comment removals give author username directly.
  - `targetPost: { id, authorId (t2_...), title, selftext, numReports, ... }` — posts give `authorId`, NOT username; resolve via `targetUser.name` or `reddit.getUserById`.
  - `targetUser: { id, name }` — populated for user-targeted actions.
  - `type: "ModAction"`, `actionedAt: ISO string`.

## Carried assumptions (validate in Phase 5 playtest; fallbacks ready)
1. **AutomoderatorFilterPost/Comment fires on AutoMod `filter`** with a `reason` field. Fallback: catch AutoMod removes via ModAction (`moderator.name === "AutoModerator"`) + `getModerationLog`.
2. **Comment-on-removed-item** (in-place breadcrumb via `submitComment`+`distinguish`) succeeds from the app account. Fallback: modmail-only delivery.
3. **ModMail trigger payload** identifies the author + conversation for appeal flagging. Fallback: appeal still reaches mods natively via the modmail thread; flagging is best-effort.
4. **AutoMod testing caveat:** AutoMod typically exempts mods, so triggering filter/remove rules needs non-mod content or rules configured to act on everyone — handle during Phase 5.

## Net effect
The pure core (Phase 1) + the confirmed ModAction path are enough to build the full pipeline (Phases 2–4) with confidence. The server idiom is Node `http` `createServer` + URL-switch routing (NOT Hono) — adapters written to match the scaffold's `src/server/server.ts`.
