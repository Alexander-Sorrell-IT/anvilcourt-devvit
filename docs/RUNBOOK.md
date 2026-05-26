# Anvil Court — Runbook (everything you do, in order)

**One linear sequence from "right now" to "submitted on Devpost."**

Total realistic time: ~2.5 hours of focused work (the recording phase has built-in retakes). Deadline: **2026-05-27 20:00 CDT**.

Open this doc and `docs/VOICEOVER.md` and `docs/SEED-DEMO.md` in separate tabs. Work top-to-bottom. Don't skip.

---

## PHASE 1 — App live under new slug (~10 min)

You're in `/media/phantomcore/AI_DRIVE/hackathons/Reddit Mod Tools and Migrated Apps Hackathon`.

### Step 1.1 — Open two terminal windows

**Terminal A** (for commands):
```
cd "/media/phantomcore/AI_DRIVE/hackathons/Reddit Mod Tools and Migrated Apps Hackathon"
```

**Terminal B** (for live logs, you'll tail later):
```
cd "/media/phantomcore/AI_DRIVE/hackathons/Reddit Mod Tools and Migrated Apps Hackathon"
```

### Step 1.2 — Confirm Devvit login

In Terminal A:
```
devvit whoami
```

If it says "not logged in" or similar:
```
devvit login
```
Follow the browser auth flow. Log in as **u/AlexanderSorrell-IT**.

### Step 1.3 — Pull latest, build, upload

In Terminal A, run these one at a time:
```
git pull
npm run build
devvit upload
```

**What you'll see:** `devvit upload` either succeeds with a new version under slug `anvilcourt`, OR fails with a message about the slug being taken.

**If it succeeds:** copy the version number it prints (e.g. `v0.0.1`) and the listing URL it gives you. Move to step 1.4.

**If it fails because `anvilcourt` is taken:** stop. **Tell me in chat: "slug anvilcourt is taken."** I'll update `devvit.json`, `package.json`, `docs/LAUNCH_CHECKLIST.md`, and `docs/SUBMISSION.md` to use `anvil-court` (hyphenated) within 2 minutes. Then you pull and re-run `devvit upload`.

### Step 1.4 — Install on the test sub

```
devvit install r/alexander_sorrell_IT
```

Use the exact case the sub was created with — uppercase IT.

You should see a success message. The app is now live on the sub under the new slug.

### Step 1.5 — Tail logs

In Terminal B:
```
devvit logs r/alexander_sorrell_IT
```

Leave this running. You'll watch this for the rest of setup to confirm triggers fire.

### Step 1.6 — Confirm welcome modmail arrived

Open browser. Go to **https://mod.reddit.com/mail/inbox**. Sort to "new." You should see a modmail titled **"Anvil Court is now active"** from r/alexander_sorrell_it. Open it. It should mention all three surfaces (triage, appeal, public ledger).

If you see it: ✅ app is wired. If not: re-run `devvit install` and wait 30 seconds.

### Step 1.7 — Uninstall the old `receipts` app (if it's still installed)

```
devvit uninstall r/alexander_sorrell_IT receipts
```

(Skip this step if `receipts` was never installed under that exact name.) This prevents both apps from double-firing on the same removals during the demo.

**Phase 1 done.** App is live, logs are tailing, old app is gone.

---

## PHASE 2 — AutoMod rule + alt accounts (~10 min)

### Step 2.1 — Verify or create 5 alt Reddit accounts

You need 5 throwaway alts. If you already have them, skip to 2.2.

If not:
- Go to https://reddit.com → log out → sign up. Pick any name (e.g. `anvilcourt-demo-01` through `-05`).
- Verify email per Reddit's flow (use a `+tag` Gmail trick if you want).
- **Set the 5th one's username to something demo-presentable**, e.g. `alice_anviltest` — this is the "appellant" you remove live on camera. The other 4 names don't matter.

Time: ~2 min per account if you use a single Gmail with `+tag` addresses.

### Step 2.2 — Allow the alts to post in r/alexander_sorrell_it

If your sub is restricted, mod tools → approved users → add each of the 5 alts.

If your sub is open: skip.

### Step 2.3 — Configure the AutoMod rule

Go to: **https://www.reddit.com/r/alexander_sorrell_IT/wiki/config/automoderator/edit**

Add this block to the TOP of the wiki page (before any existing rules):

```yaml
---
type: any
body+title (includes-word, case-sensitive): ["ANVILDEMOTRIGGER"]
action: filter
action_reason: "No spam"
~~~
```

Then below it `---` to separate from any existing rules. Save the wiki page.

AutoMod picks up changes in ~30 seconds.

### Step 2.4 — Verify the rule works

In a **private/incognito** browser, log into one of the alt accounts. Go to r/alexander_sorrell_it. Submit a post with title or body containing `ANVILDEMOTRIGGER`.

Within 5–10 seconds:
1. The post should disappear from the public feed (AutoMod filtered it).
2. **Terminal B should show a log line** like:
   ```
   [anvilcourt] automod-filter post t3_xxxxxx -> mod-log -> comment+modmail
   ```
3. The alt's inbox should receive a modmail titled **"Your content was removed"** from r/alexander_sorrell_it.

**If all three happen:** ✅ pipeline works. Continue.

**If the post doesn't get filtered:** the AutoMod rule isn't catching. Check the wiki syntax — the `~~~` and indentation matter. AutoMod also has a delay of up to 30 seconds; wait and try again.

**If filtered but no log line:** the app isn't picking up the trigger. Re-run `devvit install`.

---

## PHASE 3 — Seed the corpus (~30 min)

The detailed click-by-click instructions are in **`docs/SEED-DEMO.md`** — open that doc now. The high-level loop here:

### Step 3.1 — Seed 13 posts (~10 min)

From the 4 seed alts (NOT alice), post 13 trigger-word posts in r/alexander_sorrell_it. Suggested split: ~3 from each alt. Vary titles slightly.

After each post, watch Terminal B for the `[anvilcourt] automod-filter` log line.

**Pace yourself.** New alts can hit Reddit's rate limits if you post too fast. One post every 30–45 seconds is safe.

After all 13: as the mod, in your main browser, open the subreddit → click the mod menu (three-dot ⋮ in the sidebar or top-right) → **"Anvil Court: case file by rule"** → "No spam (13)" should appear in the picker → click → toast shows `No spam: 13 removals, 0 reversed (0%)...`.

✅ Seed phase 1 done.

### Step 3.2 — Reverse 3 (~5 min)

Pick 3 of the 13 posts from DIFFERENT alt accounts.

For each:
1. Log into that alt → open the modmail conversation Anvil Court sent → reply *"I think this was a mistake."* → send.
2. In Terminal B you should see `[anvilcourt] mod-mail` log lines firing.
3. Switch to the mod account → open the same modmail conversation → you should see the **internal precedent panel** appear with the bold headline.
4. Reply (as the mod) in that conversation:
   ```
   /reverse seed run
   ```
5. Send. You should see logs like `[anvilcourt] reversed t3_xxxxxx`. The post is approved on Reddit. The alt gets a reversal DM.

Repeat for 3 reversals total.

After: case file menu → "No spam" → toast should now read `23%` (i.e. `13 removals, 3 reversed (23%)...`).

✅ If toast says 23%: you're done with the seed. Move on. If it doesn't: count how many actually reversed, do one more `/reverse` until you hit 3/13.

### Step 3.3 — Pre-publish the Mod Mirror (~30 sec)

Mod menu → **"Anvil Court: publish public mirror"** → toast `Mirror published to /wiki/anvil-court — 1 rule(s), 13 record(s).`

Open `https://www.reddit.com/r/alexander_sorrell_IT/wiki/anvil-court` in a new tab. The page should render: header, summary line, per-rule table with "No spam" / 13 / 3 / 23%.

**Pin this tab in your recording browser** — you'll cut to it during BEAT 5.

### Step 3.4 — Stage u/alice's live demo post (~2 min)

Log into u/alice (your 5th alt). Submit a post in r/alexander_sorrell_it — **but WITHOUT the trigger word**. Title can be anything (e.g. *"hello, first post"*). The body can be any short normal-looking content.

**Important:** this post must remain VISIBLE in the sub until you press record. Don't trigger AutoMod on this one.

In the mod account, verify alice's post is live and visible in the subreddit feed.

### Step 3.5 — Pre-flight check

Before recording, run through these checks:

- [ ] Mod menu → *Case file by rule* → "No spam" → toast says `23%`
- [ ] `https://www.reddit.com/r/alexander_sorrell_IT/wiki/anvil-court` renders with table
- [ ] u/alice's demo post is visible in the sub right now
- [ ] u/alice has NO prior records (case file menu, search by user — nothing for alice)
- [ ] Terminal B is showing tailing logs and is responsive

If all 5 are green: ✅ seed phase complete. Proceed to recording.

---

## PHASE 4 — Record the demo (~30 min including retakes)

### Step 4.1 — Install OBS (if not installed)

OBS Studio is free. Download from https://obsproject.com/ if you don't have it. ~5 min install.

If OBS feels heavy: **simplest fallback** is built-in screen recorders:
- Linux: **OBS is still the best**. Or use `simplescreenrecorder` (apt-installable).
- The native GNOME screen recorder (`Ctrl + Alt + Shift + R`) does video without mic — not what we want.

**Just use OBS.** It's worth the 5 min one-time setup.

### Step 4.2 — Configure OBS (one-time, ~5 min)

Open OBS. Click **+ (Sources)** → **Display Capture** → select your primary monitor → OK.

Click **+ (Sources)** → **Audio Input Capture** → select your microphone (built-in laptop mic works). OK.

Click **Settings**:
- **Output** tab → Recording Format: `mp4`. Video Encoder: `x264`. Video Bitrate: `6000` kbps. Audio Bitrate: `192`.
- **Video** tab → Base (Canvas) Resolution: `1920x1080`. Output (Scaled) Resolution: `1920x1080`. FPS: `30`.
- **Audio** tab → Sample Rate: `48 kHz`.
- **Output** tab again → Recording Path: pick a folder you'll remember (e.g. `~/Videos/`).

Click OK to save.

### Step 4.3 — Set up browser tabs in the recording window

In your main browser (the mod account), open these 4 tabs in this order. Pin them all (right-click → pin tab):

1. r/alexander_sorrell_it main feed (where alice's post is visible)
2. Mod team modmail inbox
3. **(NEW WINDOW or different browser profile)** u/alice's personal modmail inbox (you logged in here in step 3.4)
4. https://www.reddit.com/r/alexander_sorrell_IT/wiki/anvil-court

The mod-account tabs (1, 2, 4) go in one browser window. The alice-account tab (3) goes in a private/incognito window OR a second browser profile.

You'll switch between these during the demo. Alt+Tab between the two windows; tab through the mod-window tabs.

### Step 4.4 — Open VOICEOVER.md on second monitor

Open `/media/phantomcore/AI_DRIVE/hackathons/Reddit Mod Tools and Migrated Apps Hackathon/docs/VOICEOVER.md` on a **second monitor**, or on your phone propped up next to the screen.

You read this aloud during the take. Do NOT memorize it — read it.

### Step 4.5 — Press record

In OBS click **Start Recording** (bottom right).

Do the demo. 60 seconds. Read VOICEOVER.md aloud while clicking through the beats.

When done, click **Stop Recording**.

### Step 4.6 — Review the take

Open the recording (default location: wherever you set OBS's Recording Path; check Settings → Output → Recording Path if unsure).

**Check three things:**
1. Audio is audible and clear. Volume isn't drastically uneven.
2. The bold headline `REVERSAL RATE 23% (3/13)` is visible and legible during BEAT 3.
3. You said "three of thirteen" clearly in BEAT 3.

**If all three are clean:** ✅ keep this take. Move to Phase 5.

**If any are bad:** delete and redo. Don't try to edit inside the recording. 3-5 retakes is normal.

---

## PHASE 5 — Hand the video to me (~15 min of my work)

### Step 5.1 — Tell me the file path

Once you have a clean take, paste this into chat with the actual path you saved to:

```
Recording is at /home/phantomcore/Videos/anvil-court-demo-raw.mp4
```

(Use the actual path — OBS's default is usually `~/Videos/` with a timestamp filename.)

### Step 5.2 — Wait while I produce the finals

I'll run ffmpeg to:
- Normalize audio (`loudnorm` filter — fixes any volume drift)
- Add the BEAT 3 text overlay ("Mod inbox just rendered the rule's track record. This panel did not exist before this appeal arrived.") at the right timestamp
- Trim dead air at start/end if any
- Export 3 versions:
  - `anvil-court-demo-youtube.mp4` (1080p, suitable for YouTube unlisted)
  - `anvil-court-demo-twitter.mp4` (compressed for Twitter's 512MB / 2:20 limit)
  - `anvil-court-demo-instagram.mp4` (9:16 vertical crop for Reels)
- Extract 5 candidate screenshots at key beats — you pick 3 for the Devpost listing
- Make the YouTube thumbnail (1280×720 PNG, branded)
- Write the YouTube description with chapter timestamps + the full transcript

All output lands in `/media/phantomcore/AI_DRIVE/hackathons/Reddit Mod Tools and Migrated Apps Hackathon/assets/demo/`.

I'll tell you when it's done.

---

## PHASE 6 — Upload + submit (~30 min)

### Step 6.1 — Upload the YouTube video

1. Go to https://studio.youtube.com → **Create → Upload videos**
2. Pick `assets/demo/anvil-court-demo-youtube.mp4`
3. **Title:** `Anvil Court — case-law engine for Reddit moderation (Devvit)`
4. **Description:** copy the contents of `assets/demo/youtube-description.md` (I'll generate this)
5. **Thumbnail:** upload `assets/demo/youtube-thumbnail.png`
6. **Visibility:** **Unlisted** (so judges can watch via direct link, public can't find it via search)
7. Publish.
8. Copy the video URL. You'll need it in step 6.3.

### Step 6.2 — (Optional but recommended) Tweet + Instagram

Skip if pressed for time. Adds visibility but isn't required for the contest.

**Twitter/X:**
1. Tweet `assets/demo/anvil-court-demo-twitter.mp4` with copy like:
   > Built **Anvil Court** for the Reddit Mod Tools hackathon — the case-law engine for moderation. Every removal becomes precedent. Every appeal shows the mod the rule's track record. One reply (`/reverse`) closes the loop. Built on @reddit Devvit Web. Source: [link to repo]

**Instagram Reels:**
1. From your phone, upload `assets/demo/anvil-court-demo-instagram.mp4`. Similar caption.

### Step 6.3 — Submit on Devpost

1. Go to **https://mod-tools-migration.devpost.com/** → click **"Submit your project"**.
2. You'll need to be logged in / create an account if you haven't.
3. Fill the form (I'll have copy-paste-ready blocks for each field in `assets/demo/devpost-fields.md`):
   - **Project name:** `Anvil Court`
   - **Tagline:** `Case-law engine for Reddit moderation — every removal becomes precedent.`
   - **What it does / How I built it / Challenges / Built with / etc.:** see prepared blocks
   - **Video URL:** paste your YouTube link from step 6.1
   - **Image:** upload `assets/demo/youtube-thumbnail.png` (Devpost uses this as the cover image)
   - **Try it:** the Devvit listing URL from `devvit upload` output
   - **Source code:** `https://github.com/Alexander-Sorrell-IT/anvilcourt-devvit`
   - **Team:** just you (u/AlexanderSorrell-IT)
   - **Category:** **Best New Mod Tool**
4. **Preview** the submission. Check the embedded video plays. Check screenshots show.
5. **Submit.**

### Step 6.4 — Feedback survey ($200 bonus)

After submission, the Devpost confirmation page or email usually has a link to the optional sponsor feedback survey. **Fill it out** — it's a guaranteed $200, takes 10 min.

### Step 6.5 — Done

Take a screenshot of the submitted Devpost page for your records. Confirm in chat with me: "submitted." I'll log it in `docs/LAUNCH_CHECKLIST.md` and update memory.

---

## Time budget summary

| Phase | Time |
|---|---|
| 1. App live under new slug | 10 min |
| 2. AutoMod rule + alts | 10 min |
| 3. Seed corpus | 30 min |
| 4. Record demo (with retakes) | 30 min |
| 5. (me: post-process) | 15 min |
| 6. Upload + submit | 30 min |
| **Total** | **~2 hours 5 minutes** |

Plus 30-min buffer for things going sideways. Budget **~2.5 hours total**.

---

## Common failure modes and fixes

| Symptom | Fix |
|---|---|
| `devvit upload` says slug taken | Tell me, I switch to `anvil-court` (hyphen) in 4 files, you re-run |
| Welcome modmail doesn't arrive after install | `devvit logs` should show `onAppInstall` firing. If not, re-run `devvit install`. |
| AutoMod doesn't filter test post | Check YAML indentation in wiki. Wait 30s and retry. |
| `[anvilcourt]` log lines never appear | Old `receipts` app still installed → uninstall it. Or wrong sub name (case matters). |
| Precedent panel doesn't render on appeal | Check `[anvilcourt] mod-mail` log line fires when alt replies. If not, the trigger isn't picking up — re-`devvit install`. |
| Case file menu shows wrong count | Refresh the page; toast may be cached. Or: count is correct but you miscounted seed posts — redo Step 3.1 with a tally. |
| OBS records no audio | Settings → Audio → confirm Mic input is set to your actual mic, not "default" (which can pick a system source instead). |
| Video editing fails on my end | I send you the error, we adjust. Worst case I do less post-processing and you upload the raw take — still usable. |

---

## When something goes truly wrong — emergency rollback

If post-rename anything is broken beyond easy fix and you're inside 4 hours of deadline:

1. `git checkout build/receipts-v1` (you're already on it)
2. `git log --oneline` — find the commit BEFORE the rebrand: it's `e25a968` (the round-3 commit)
3. `git checkout e25a968 -- devvit.json package.json` — reverts only the slug
4. `npm run build && devvit upload` — uploads under old slug `receipts`
5. Re-run install + seed under the old slug
6. Submit as **Receipts** on Devpost (it's still a strong submission)

The rebrand to Anvil Court adds 2-5% to perceived brand quality. Missing the deadline costs 100%. If under pressure, roll back the brand, ship.

Don't trigger this lightly — only if everything else has failed and the clock is real.
