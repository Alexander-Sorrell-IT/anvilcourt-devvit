# Receipts — end silent moderation

**Every removal explains itself.** When a post or comment is removed on your subreddit — by a moderator, by AutoModerator's *silent filter*, by an AutoMod remove rule, or by Reddit's spam filter — Receipts automatically sends the author a clear, rule-cited explanation with a built-in way to appeal, and writes the decision to a searchable, mod-only audit log.

No more "why was my post removed?" modmail. No more good contributors quietly leaving because AutoMod ate their comment and told them nothing. No more digging through profiles to reconstruct why something is in your queue.

## The problem

- **AutoModerator is silent.** Its `filter` action sends content to the modqueue and tells the user *nothing*. Most subs never configure per-rule `comment:` text, so legitimate users assume they were censored — and leave.
- **Removal reasons are manual.** Reddit's native Removal Reasons require a mod to click and pick a reason on every removal, and they don't cover AutoMod at all.
- **Appeals are chaos.** Users have no clear channel, so they DM mods, post meta-threads, or rage in modmail with no context — and mods become AutoMod's defense attorney.

## What Receipts does

1. **Detects every removal** via the `ModAction`, `AutomoderatorFilterPost`, and `AutomoderatorFilterComment` triggers (deduplicated).
2. **Resolves the reason** deterministically through a 4-tier fallback: the AutoMod filter reason → the mod log (mod-selected removal reason / AutoMod `action_reason`) → the configured removal-reason text → a generic notice.
3. **Explains it to the user** — a stickied, distinguished in-place comment and/or a modmail, each carrying a *"reply here if you think this is wrong"* appeal CTA. The modmail thread *is* the appeal channel: the user's reply lands in your mod inbox, and Receipts flags it as an appeal. **A human always makes the final call — the bot never overturns a removal.**
4. **Logs everything** to a searchable, mod-only audit trail. When someone appeals, look them up in two seconds instead of two minutes.

Deterministic. No LLM. No external services. No auto-banning. Two-click install.

## For moderators

- **Menu → "Receipts: look up user"** — see a user's removal + appeal history.
- **Menu → "Receipts: recent removals"** — the recent decision log.
- Install and forget — it works immediately with sensible defaults.

## How it's built

A background Devvit Web app (TypeScript, Node 22). The decision logic is a pure, unit-tested core (`src/core/`); the platform glue is thin adapters (`src/server/`). State lives in Redis, per subreddit.

```
triggers → dedup → reason resolver (4-tier) → explanation composer → delivery (comment + modmail) → audit log
modmail reply → appeal router → flag for a human mod
```

## Status

Built for the Reddit Mod Tools and Migrated Apps Hackathon (2026). Category: Best New Mod Tool.
