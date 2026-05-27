# Seeding the demo corpus — 13 records on one rule, 3 overturned

**Goal:** before you press record, the precedent panel's headline must read **`REVERSAL RATE 23% (3/13)`**. To get there, the app's per-rule audit log needs exactly 13 prior decisions on the same rule, with 3 of them marked overturned, plus a 14th post (by u/alice) ready to be removed live on camera.

**Why this approach:** no custom script, no extra dev work. Use Anvil Court's own ingestion pipeline. One AutoMod rule catches a trigger keyword in your test posts → the app's `onAutomoderatorFilterPost` trigger fires for each → 13 records land under the same rule. Three `/reverse` replies via the app's own flow → 3 overturned.

**Time:** ~25–35 minutes once accounts and the app are ready.

---

## Prereqs (do these first, in order)

1. **App uploaded under the new slug.** Run `npm run build && devvit upload`. If the slug `anvilcourt` is taken on Devvit, fall back to `anvil-court` (with hyphen) — tell me and I'll update the 4 source-of-truth spots.
2. **App installed on r/alexander_sorrell_it.** `devvit install r/alexander_sorrell_it`.
3. **Tail logs in a side window so you can see triggers fire as they happen:**
   ```
   devvit logs r/alexander_sorrell_it
   ```
4. **Make sure 5 throwaway Reddit accounts exist** — call them whatever, but reserve **u/alice** (or similar) as the 5th, and use accounts 1–4 for the seed posts. (If you don't have them: signup, verify email, ~2 min each.)
5. **The 5 alt accounts must be allowed to post in r/alexander_sorrell_it.** Approve them as approved submitters if the sub is restricted, OR keep it open during the demo window.

---

## Step 1 — Configure the AutoMod rule (~3 min)

Go to: **r/alexander_sorrell_it → mod tools → Automoderator → wiki/config/automoderator**

Add this block at the top:

```yaml
---
type: any
body+title (includes-word, case-sensitive): ["ANVILDEMOTRIGGER"]
action: filter
action_reason: "No spam"
---
```

(Use `filter` so it goes to the modqueue with reason "No spam" — this maps to Anvil Court's `automod-filter` source, the silent-filter path that's the most novel coverage. If you prefer `remove` that's fine too; both fire.)

**Save the wiki page.** AutoMod picks up changes in ~30 seconds.

**Verify:** open a private window, post a tiny test post in the sub containing the word `ANVILDEMOTRIGGER` — it should disappear within ~5 seconds and you'll see in `devvit logs` something like `[anvilcourt] automod-filter post t3_xxx -> mod-log -> comment+modmail`.

If you see that line, the pipeline works. Continue. If not, the AutoMod rule isn't catching — fix it before going further.

---

## Step 2 — Seed the 13 records (~10 min)

You need 13 posts, all containing `ANVILDEMOTRIGGER`, spread across 4 alt accounts.

**Suggested split:** 4 alts × ~3 posts each = 12; alt #4 makes a 13th.

Post titles can be anything plausible — *"thoughts on the new feature ANVILDEMOTRIGGER"*, *"my experience this week ANVILDEMOTRIGGER"*, *"hello again ANVILDEMOTRIGGER"*. The trigger word can be in title OR body. Make them look like real posts; judges only see numbers in the demo, not the bodies, but if you ever screenshot the case file, varied titles look better than 13 identical ones.

For each post:
- Log into the alt → go to r/alexander_sorrell_it → submit post → include `ANVILDEMOTRIGGER` somewhere in title or body → submit.
- AutoMod filters it within seconds. Logs should show the `[anvilcourt] automod-filter` line.
- Each post should trigger a modmail to the author too — that's the appeal channel. You don't need to act on those for the 10 you DON'T reverse.

**Pace yourself** — Reddit may rate-limit aggressive posting from new alts. If posts start getting auto-deleted before AutoMod sees them, slow down to one every 30s.

**Verify after all 13:** as the mod, open menu → *Anvil Court: case file by rule* → "No spam (13)" should appear in the picker. Click it. The toast should start with `No spam: 13 total, 0 reversed (0%), 0 upheld, 0 open, 13 not appealed.` plus a list of 13 entries.

If the count is off, you can keep posting until it's exactly 13.

---

## Step 3 — Reverse 3 of them (~5 min)

For 3 of those 13 posts, you'll do the app's own `/reverse` flow. Pick 3 from **different alt accounts** so the reversal list looks varied.

For each of the 3:
1. Open new modmail (mod team inbox) → find the modmail conversation Anvil Court sent the author when the post was removed.
2. As the **alt author**, reply something like: *"I think this was a mistake."* (You need to do this AS THE AUTHOR, from the alt account.)
3. Within ~5 seconds, Anvil Court should render the **precedent panel as an internal mod note** in that conversation. You'll see in logs `[anvilcourt] mod-mail` triggers firing.
4. Switch back to the **mod account**. In the same modmail conversation, reply:
   ```
   /reverse seed run
   ```
5. Anvil Court approves the post on Reddit, DMs the alt with a reversal DM, marks the receipt overturned, and posts a confirmation internal note. You should see logs like `[anvilcourt] reversed t3_xxx`.

Repeat for 3 reversals total. Pick reversal dates within the last few days (which they will be by default since you're doing this fresh).

**Verify:** menu → *Anvil Court: case file by rule* → "No spam" → toast should now start with `No spam: 13 total, 3 reversed (23%), 0 upheld, ...`

If you see `23%`, you're done with the seed. The headline `REVERSAL RATE 23% (3/13)` will now appear in the precedent panel for the live demo removal.

---

## Step 4 — Pre-publish the public mirror once (~30 sec)

This makes the wiki tab in BEAT 5 of the demo already exist; the recording shows it *updating*, not *appearing from scratch*.

Mod menu → *Anvil Court: publish public mirror* → toast should say `Mirror published to /wiki/anvil-court — 1 rule(s), 13 record(s)`.

Open `/r/alexander_sorrell_it/wiki/anvil-court` in a browser tab. The page should render with "No spam" in the table showing **13 / 3 / 23% / [some] in last 30 days**.

**Pin this tab** in your recording browser as tab #4 (per VOICEOVER.md).

---

## Step 5 — Stage the live demo post (~2 min)

The 14th post — the one you remove **live on camera in BEAT 1** — must be authored by **u/alice** (the 5th alt account, not one of the 4 seed alts).

Why u/alice specifically: the precedent panel's "appellant" line says *"This appellant (u/alice): 0 prior decision(s), 0 previously overturned"* (since this is alice's first time). That makes alice look like a fresh appellant, which is more demo-realistic than someone with a long history.

### CRITICAL — alice's removal must land in the "No spam" bucket

If alice's removal lands in a *different* bucket from the 13 seed records, the precedent panel headline will show **0% (0/1)** instead of **23% (3/13)** and the demo dies. The fix is to set up a sub-side "No spam" removal reason and pick it in BEAT 1, so the ModAction trigger carries the same reason text as the seed.

1. **Set up "No spam" as a subreddit removal reason** before recording: r/alexander_sorrell_it → mod tools → Removal reasons → Add → Title `No spam`. Save. (Verify it appears in the Remove dialog; without it, BEAT 1 will land in the wrong bucket.)
2. Log into u/alice → submit a plain post in r/alexander_sorrell_it (no trigger word) → leave it visible. This is the post you'll remove on camera.
3. **Practice once before recording:** post a second throwaway post from any alt, then click Remove → pick "No spam" → confirm. The throwaway should:
   - Trigger a modmail to the alt (toast appears in mod UI)
   - Land in the "No spam" bucket — verify via *case file by rule* → "No spam" should show one more total than before
   - If it lands in a different bucket ("Your content was removed..."), the `details` extraction or modlog fallback isn't picking up the picked reason. Stop and re-check the removal-reasons setup before continuing.
4. After verifying, **delete** the throwaway test record so it doesn't muddy the headline (or just include it — the math still works: 14 → 23%/13 once the current target is filtered out).
5. During BEAT 1 on camera: click Remove on alice's post → pick "No spam" → confirm. The toast appears (modmail to alice). The pipeline writes alice's record to the "No spam" bucket. ✓
6. alice replies to the modmail in her private window: *"I think this was a mistake."* The precedent panel fires for the mod team. Headline shows **REVERSAL RATE 23% (3/13)** because the panel filters out alice's just-added record before computing stats.

---

## Step 6 — Pre-flight checks before pressing record

In the 5 minutes before recording, verify all of this:

- [ ] *Anvil Court: case file by rule* → "No spam" → toast shows `23%` (13/3)
- [ ] `/r/alexander_sorrell_it/wiki/anvil-court` renders the public mirror table
- [ ] u/alice has 0 prior records (case file by rule with u/alice's posts → empty)
- [ ] u/alice's demo post is currently visible in the subreddit
- [ ] You're logged in as the mod account in browser tab 1 (mod feed)
- [ ] u/alice's modmail inbox is open in a private window or second browser profile
- [ ] Mod team modmail is open in browser tab 3
- [ ] The wiki tab is open in browser tab 4
- [ ] OBS or your screen recorder is open with mic enabled
- [ ] `docs/VOICEOVER.md` is open on a second monitor

**If any of these check boxes are red, fix it before recording. Don't waste a take.**

---

## Cleanup (after recording, before submitting on Devpost)

- You can leave the AutoMod rule in place — it's a harmless test rule. Or delete it after submission.
- The 13 seed posts can stay removed (they ARE legitimately removed; the precedent panel will still reference them, which is the point).
- The Mod Mirror page will show whatever's in the case file — that's fine.

**Do NOT** uninstall the app between seeding and recording. The data is in Redis scoped to the app installation; uninstall wipes it.
