---
name: video-brief
description: Use in the subject expert's chat when the user has an idea for a video, says a video is ready for them, asks what is waiting, or asks to outline or storyboard a video or which screens are missing. Starts the video folder with brief.md and the screens it needs, and later answers the kit's brief-request.md with the storyboard rows and capture-request.md, all as files in the video folder.
metadata:
  version: "0.1.4"
---

# The idea, and the brief request

The idea for a video starts in this chat: a gap in what is out there, a topic the person teaches, a question learners keep asking. The video folder is the handoff from the first minute. Nothing is pasted: this skill writes files into the video's folder, the director's chat reads them there, and `vkit handoffs` says which video or app is waiting and for whom. The person's part is the ideation (who it is for, what matters, what to leave out); the finding, the folder and the format are this skill's.

The videos live in the `videos/` folder beside `video-kit` (on Matthew's Mac, `~/Developer/video/videos/`); the recreated apps live in `apps/<family>/<tool>/` beside them. Run `vkit handoffs ~/Developer/video/videos` first; each line is one video or one app, who it waits for, and the skill. A shell that has the folder but not the command runs the same thing as `node ~/Developer/video/video-kit/packages/cli/bin/vkit.js handoffs ~/Developer/video/videos`. Without either, the rule is the files, below.

## A. The idea first (no folder, or a folder with no `brief-request.md`)

1. `cd ~/Developer/video/videos && vkit new <name>` (plain-English name, lowercase and hyphens; no `--app`, the app may not exist yet). If the folder exists already, skip this.
2. Write `brief.md` (section 2 below).
3. Write the screens the teaching needs, in the order the tool presents them, with what each picture must show. Where they go depends on the app:
   - the app exists (`apps/<family>/<tool>/manifest.csv` has states): write `capture-request.md` in the video folder with only the screens the app lacks;
   - no app yet: `vkit app new <family>/<tool>` once, then write `apps/<family>/<tool>/capture-request.md`, the whole coverage of the tool for this video. That file is the walkthrough the `capture-walkthrough` skill runs in a Claude Code session on the person's machine (a cloud chat cannot run the capture browser), with the person signed in. The director's chat recreates from the captures.
4. Say what was written. `vkit handoffs` now shows the app waiting for its captures, or the video waiting for the director to bring the app in (`vkit app use`) and write `brief-request.md`. The storyboard rows wait for that file, because they name states by id and the ids do not exist before the recreation.

## B. The brief request (the kit wrote `brief-request.md`)

Take the video the person named, or the one `vkit handoffs` marks `subject expert (video-brief)`: its `brief-request.md` is newer than its `brief.md`, or there is no `brief.md`. Read the whole file. It names the video, the task, and every screen moment the recreated app has (its states, by id, with what each shows and the capture it came from). If the task line says "to be stated by the producer" and there is no `brief.md`, ask the person for it in one line before writing anything; everything else is in the file. Then sections 2 to 5: `brief.md` (written in A already? keep it, update it only if the states changed what can be taught), the rows, the pickups, the report.

## 2. Write `brief.md` (half a page)

- **Who it is for** and what they already know.
- **What they can do when it ends**, in one sentence.
- **The points it must teach**: two to four, each one line, each tied to a screen the app has (name the state id).
- **The pitfalls** a learner hits on this task, and what the video should say about each. Only what is true for this console today; if a default, a limit or a behaviour is stated, it is stated because it is true, not because it sounds right.
- **Words**: the terms to use (the console's own labels, spelled as the screen spells them) and the words to avoid.

## 3. Write the rows into `storyboard.md`

The file exists with the kit's header, a note and the starter's rows. Keep the header and the note; replace every row. One row per beat; a beat is one sentence of narration. The table is exactly as the request prints it:

| Part | Sentence | Start (s) | Action | On screen | Camera | Card | Capture |

- **Part**: a stretch the narrator records in one go; a scene change or a natural pause is a boundary. Two to five parts for a video under three minutes, no part over about 1000 characters of narration.
- **Sentence**: the substance in plain words, not the final wording. One idea per row. The director writes the narration from this and keeps the meaning.
- **Start**: blank. The clips set it.
- **Action**: what the learner does in this beat, in the console's own words: `click Create bucket`, `type the bucket name`, `scroll to Block Public Access settings`, `press Enter`, `open the Objects tab`. Blank when the beat only looks. A screen recording is actions and the screen's answers; the director animates every action (the cursor goes there, the click lands, the text is typed character by character, the page scrolls), so a beat whose screen changes needs the action that changed it. A field never goes from empty to filled without the typing on screen; a page never scrolls without the scroll; a page never changes without the click that changed it.
- **On screen**: the console's answer: `state <id>` from the request's list, then a comma and what the eye should be on, in the screen's own words (`state create-top, the Bucket name field`). A concept moment with no screen is `scene <name>`. Never a state the list does not have. Two rows on the same page at different scroll positions are a scroll, which the kit animates; two rows on different pages are a page change, which follows a click.
- **Camera**: plain words: `rest`, `push in on the Create bucket button`, `travel to Block all public access`, `hold`.
- **Card**: what a small explanation card beside the screen would say, if this beat needs one; otherwise blank. One line.
- **Capture**: the state's capture id from the list (`CAP-002`).

Order the rows the way the video runs, not the way the console happens to present things. A row may hold on one state for several sentences; a state may be skipped; the list may be revisited at the end.

## 4. Write `capture-request.md`, even when empty

Every beat whose teaching needs something no state has: a menu open, a hover, a dropdown's options, a confirmation, an error, a screen the list lacks. For each, a capture request the walkthrough skill can run: the step number it belongs to, exactly what to do in the console, and what the picture must show. The pickups are captured and recreated before any footage is made. Nothing on screen is ever invented, described from memory, or drawn without a capture. When there are none, the file says `No pickups: every row names a state the app has.` so the director knows the question was asked.

## 5. Say what was written

One line: the video's name, the files, the row count, the pickup count. `vkit handoffs` now shows the video waiting for the director (`video-script`), or the app waiting for pickups. If the folder cannot be reached from this chat, say so and give the files as text under their file names; that is the fallback, not the way.

## What this skill does not do

It does not write the final narration (the director does, to the craft rules and the narrator's voice). It does not restyle, redraw or describe the screen beyond what the states show. It does not propose screens outside the task. It does not touch `brief-request.md`, the `rig/`, `video.json`, or anything in an app folder other than its `capture-request.md`. When the fact check comes later (the `video-fact-check` skill), it is the same expert reading the finished words.
