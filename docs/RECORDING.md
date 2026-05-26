# Anvil Court — 60-second demo recording prescription

**Goal:** one continuous take. Five complete loops. **One** 4-second "oh-shit" beat the judge will remember.

This doc is the output of an adversarial demo-critic agent pass. The oh-shit beat, the dead beat, the order, the framing, the voiceover, and the pre-recording data setup are all specified below. Do them as written.

---

## 1. The oh-shit beat — protect this above everything else

**The 3–4 seconds the precedent panel sits on screen with the bold headline:**

> **REVERSAL RATE 23% (3/13) — u/alice appealing "No spam"**

That single frame is where the judge realizes the substrate changed. Removal explanations exist elsewhere. Modmail appeals exist. Approve-and-DM exists. Public wikis exist. **The precedent panel inside the mod's modmail thread, headline-first, mid-conversation, does not exist on this platform.** That stat line is the moment the case-law substrate becomes visible. **Hold it. Hold it longer than feels comfortable.**

## 2. The dead beat to compress

The click on the *"Anvil Court: publish public mirror"* menu item. The menu click is plumbing; the wiki page is the artifact. **Don't dwell on the click — jump straight from `/reverse` confirmation to the wiki tab.** Step 2's stickied explanation comment also looks visually like a stock AutoMod sticky — don't linger there.

## 3. Recording prescription (per beat)

### Beat 1 — Removal goes out with its reason attached (~3 sec, compressed)
- One frame: post vanishes from the feed; in the corner, the modmail toast lands ("Your content was removed").
- Voiceover: *"When anything gets removed — by a mod, by AutoMod's silent filter, or by spam — the author gets a rule-cited explanation automatically."*
- Don't zoom on the sticky comment. The comparison table in the submission already sells this layer.

### Beat 2 — User appeals (~3 sec)
- Switch tab to the appellant's modmail (have it pre-opened in a second browser profile).
- Type a brief reply: "I think this was a mistake." (One sentence; minimize keystrokes — carpal tunnel ergonomics.)
- Send.
- Voiceover: *"User replies. Watch the mod inbox."*

### Beat 3 — THE OH-SHIT BEAT (~4 sec, hold)
- Switch to the mod-team modmail tab. The conversation now has an internal note from Anvil Court.
- **Zoom to ~125%** so the bold headline fills the horizontal width.
- **Cursor: parked dead-still in the left margin next to the headline. Do not move it.**
- **Hold 4 full seconds.** No scroll, no cursor movement, nothing.
- **On-screen text overlay (bottom third, white-on-black bar):** *"Mod inbox just rendered the rule's track record. This panel did not exist before this appeal arrived."*
- **Voiceover:** *"The mod inbox now opens with the rule's reversal rate — three of thirteen — before the mod reads a single word of the appeal."*

### Beat 4 — `/reverse` closes the loop (~5 sec)
- Type `/reverse posted in error` in the same conversation. Send.
- Cut to user inbox. Reversal DM is visible.
- Voiceover: *"One reply — slash-reverse — restores the content, DMs the user, and logs the decision as precedent for the next appeal."*

### Beat 5 — Public ledger (~5 sec)
- **Cut directly to the wiki tab** at `/r/alexander_sorrell_it/wiki/anvil-court`. Page is already loaded (pre-open it).
- Pan slowly down the per-rule table. The "No spam" row now reads `(4 reversed, 31%)` (was 3/23%).
- Voiceover: *"And every reversal lands in the sub's public, anonymized case-law ledger. No usernames. No content. Counts only — the docket statistics the sub stands behind in public."*

**Total:** ~20 seconds of speech, ~20 seconds of held visuals, ~15-20 seconds of action. Lands inside 60 with room to breathe.

## 4. Order — KEEP CURRENT

**Current order is correct.** Mod Mirror is the most visually novel artifact, but leading with it asks the judge to care about a scoreboard for a game they haven't watched yet. The current arc — removal → explanation → appeal → **precedent renders** → `/reverse` closes the loop → public mirror reflects the new row — is the only order where the wiki table's final row is *causally legible* as the case the judge just watched get decided. That causal chain is the whole pitch.

## 5. Pre-recording data setup (REQUIRED — do this before you press record)

The headline must read `REVERSAL RATE 23% (3/13)`, not `0/0`. Seed the corpus first.

1. **Pre-create 13 test posts** authored by 4–5 throwaway alt accounts. All posts must trip the **same** removal reason (e.g. the literal text "No spam" or your test rule's title). Why: `ruleKey` collapses by slugified rule label — if reasons drift, the bucket fragments and the count won't aggregate.

2. **Remove all 13** via mod action (or AutoMod rule). The backfill-on-install path picks them up automatically from the mod log; or do them live and let triggers fire.

3. **Run the full appeal-then-`/reverse` loop end-to-end on 3 of those 13.** Use 3 different alt accounts. After each `/reverse`, the receipt is marked `overturned` and feeds the precedent panel. Pick reversal dates within the last 14 days so the "Recent reversals" section under the headline shows three dated rows.

4. **The 14th post** — the one removed live on camera in beat 1 — must be authored by **u/alice** (a fresh alt). u/alice should have 1 prior receipt and 0 overturned so the appellant line in the panel reads as a believable returning user, not a brand-new account.

5. **Dry run.** Before hitting record, do beats 1–3 once on a 15th throwaway post to verify the panel emits the exact headline string. If `total` or `overturned` drift by one from the overlay text in beat 3, the overlay lies.

6. **Pre-open browser tabs** in this order: (a) mod feed for r/alexander_sorrell_it, (b) appellant's modmail inbox, (c) mod team modmail, (d) `/r/alexander_sorrell_it/wiki/anvil-court`. Pin them. Tab-switching shows judge speed; mouse-to-bookmark shows search.

7. **Pre-publish the Mod Mirror once** with the seeded 13 records already in place. That way the wiki tab in beat 5 already exists; the recording just shows it *updated*, not *appearing for the first time*.

## 6. What to bring to the screen recording

- **OBS or QuickTime.** No music budget; basic voiceover only.
- **Two browser profiles** (or two windows) — mod account and one appellant alt. Switch with tab.
- **Single 1080p screen capture.** Zoom levels noted per beat. Don't over-zoom; on Reddit, headlines need a little context around them.
- **Cuts only, no transitions.** Hard cuts between beats. Smooth transitions look amateur in 60s.
- **Voiceover recorded live with the take** — re-recording dubbed audio loses synchrony. The cadence has to match the action.

## 7. Screenshots (separate from the video, 2-3 needed for the Devpost listing)

1. The precedent panel in the modmail thread, full conversation visible, **REVERSAL RATE 23% (3/13)** headline prominent.
2. The Mod Mirror wiki page at `/wiki/anvil-court`, with the summary header and 5+ rules in the per-rule table.
3. (Optional) The Case File menu rendering with rule list + counts. Skip if 1 + 2 are sharp.

## 8. If something goes wrong mid-take

- Don't retry the take inside the recording. Cut and start over.
- The headline must be readable in the still frame for beat 3. If the modmail UI clips it, fix the zoom and retry.
- If `/reverse` doesn't fire (e.g. the test post's item id resolves wrong, or the conversation→record mapping wasn't written), fall back to: in beat 5, cut to the *Case File by rule* menu instead of the public mirror. The story is "case-law engine" either way.
