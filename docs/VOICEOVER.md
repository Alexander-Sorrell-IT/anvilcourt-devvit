# Anvil Court — Voiceover Script

**Read this aloud while screen-recording. ~60 seconds total. ~75 spoken words.**

Put this on a second monitor or phone where you can see it during the recording. The text in **bold** is what you actually say. The text in *italics* is the action you do at the same moment. The text in `[brackets]` is timing.

---

## OPENING — `[0:00 – 0:03]`

*(Cold open on the subreddit feed. The 14th test post — by u/alice — is visible.)*

> **"Anvil Court — the case-law engine for Reddit moderation."**

---

## BEAT 1 — Removal goes out with its reason `[0:03 – 0:08]`

*(Click "Remove" on the post. The post vanishes. In the corner, the modmail-to-author toast appears. Don't dwell on the sticky comment.)*

> **"When anything gets removed — by a mod, by AutoMod's silent filter, or by spam — the author gets a rule-cited explanation, automatically."**

---

## BEAT 2 — User appeals `[0:08 – 0:16]`

*(Switch to u/alice's modmail. Type briefly: "I think this was a mistake." Send.)*

> **"User replies."**
>
> *(Pause one beat — let the send hit.)*
>
> **"Watch the mod inbox."**

---

## BEAT 3 — THE OH-SHIT BEAT `[0:16 – 0:24]` — protect this above all

*(Switch to mod-team modmail. The precedent panel has rendered as an internal note. Zoom to 125%. Cursor parked in the left margin next to the bold headline. Do not move it.)*

*(On-screen text overlay (bottom third, white-on-black) — I'll add this in post:*
*"Mod inbox just rendered the rule's track record. This panel did not exist before this appeal arrived.")*

> **"The mod inbox now opens with the rule's reversal rate — three of thirteen — before the mod reads a single word of the appeal."**

*(Hold 4 full seconds on the static frame. The headline is the entire screen's job. **Resist the urge to scroll or move the cursor.**)*

---

## BEAT 4 — `/reverse` closes the loop `[0:24 – 0:36]`

*(Type into the same conversation: `/reverse posted in error`. Send. Cut immediately to u/alice's inbox — reversal DM has landed.)*

> **"One reply — slash-reverse — restores the content, DMs the user, and logs the decision as precedent for the next appeal."**

---

## BEAT 5 — Public ledger `[0:36 – 0:50]`

*(Cut directly to the wiki tab at `/r/alexander_sorrell_it/wiki/anvil-court`. Already pre-loaded. Scroll slowly down the per-rule table.)*

> **"And every reversal lands in the sub's public, anonymized case-law ledger."**
>
> *(Brief pause as the table comes into view.)*
>
> **"No usernames. No content. Counts only — the docket statistics the sub stands behind in public."**

---

## CLOSING `[0:50 – 0:55]`

*(Last frame: the wiki page table, or cut back to the modmail panel.)*

> **"Every decision becomes precedent. Anvil Court — on Devvit."**

*(End. Stop recording.)*

---

## Total: ~75 words, ~50 seconds spoken + ~10 seconds of held visuals = 60s

If you speak faster, you have more room to hold visuals. If you speak slower, drop the closing sentence — it's optional.

---

## If you flub mid-take

**Don't try to edit inside the recording. Restart.** A 60-second clean take takes 3-5 attempts on average. Budget 30 minutes for recording.

**The two non-negotiables:**
1. The headline `REVERSAL RATE 23% (3/13)` must be visible and legible during BEAT 3. If the modmail UI clips it or your zoom is wrong, the demo fails. Verify before you press record.
2. The voiceover must clearly say *"three of thirteen"* in BEAT 3. If you flub anything else, that one phrase has to land.

---

## Recording setup (one-time)

**OBS Studio (free, recommended):**
1. Sources → Add → Display Capture (your screen)
2. Sources → Add → Audio Input Capture (your mic — built-in laptop mic is fine if it's close to your face)
3. Settings → Output → Recording Format: mp4. Video Bitrate: 6000 kbps or higher. Audio Bitrate: 192 kbps.
4. Settings → Video → Base Resolution: 1920x1080. Output Resolution: 1920x1080.
5. Settings → Audio → Sample Rate: 48 kHz.
6. Hit "Start Recording" → click through demo while reading script → "Stop Recording"
7. The file lands wherever OBS is configured to save (default: `~/Videos`)

**Simplest fallback if OBS feels heavy:** macOS Cmd+Shift+5 (built-in screen recorder with mic option), or Windows Game Bar (Win+G). Quality is fine for a 60s hackathon demo.

---

## Handoff to me

When the recording is done, tell me the file path. Example:
> `the demo is at /home/phantomcore/Videos/anvil-court-demo-raw.mp4`

I'll run audio normalize + add the BEAT 3 text overlay + trim dead air + export the three formats + extract screenshots + make the thumbnail. All durable, all in `assets/`.
