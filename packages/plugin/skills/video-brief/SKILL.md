---
name: video-brief
description: Use when a "# Brief request:" file from vkit brief is pasted, or the user asks to outline or storyboard a video or which screens are missing. Returns the outline, the storyboard rows in the kit's table, and the pickup list of screens no state has.
metadata:
  version: "0.1.0"
---

# Answering a brief request

The brief request names the video, the task, and every screen moment the recreated app has (its states, by id, with what each shows and the capture it came from). The subject expert supplies the teaching; the director turns it into words and footage. Three things come back, in this order, each as plain text the person can paste into the video folder.

## 1. The outline (half a page)

- **Who it is for** and what they already know.
- **What they can do when it ends**, in one sentence.
- **The points it must teach**: two to four, each one line, each tied to a screen the app has (name the state id).
- **The pitfalls** a learner hits on this task, and what the video should say about each. Only what is true for this console today; if a default, a limit or a behaviour is stated, it is stated because it is true, not because it sounds right.
- **Words**: the terms to use (the console's own labels, spelled as the screen spells them) and the words to avoid.

## 2. The storyboard rows

One row per beat; a beat is one sentence of narration. Use the table exactly as the request prints it:

| Part | Sentence | Start (s) | On screen | Camera | Card | Capture |

- **Part**: a stretch the narrator records in one go; a scene change or a natural pause is a boundary. Two to five parts for a video under three minutes, no part over about 1000 characters of narration.
- **Sentence**: the substance in plain words, not the final wording. One idea per row. The director writes the narration from this and keeps the meaning.
- **Start**: blank. The clips set it.
- **On screen**: `state <id>` from the request's list, then a comma and what the eye should be on, in the screen's own words (`state create-top, the Bucket name field`). A concept moment with no screen is `scene <name>`. Never a state the list does not have.
- **Camera**: plain words: `rest`, `push in on the Create bucket button`, `travel to Block all public access`, `hold`.
- **Card**: what a small explanation card beside the screen would say, if this beat needs one; otherwise blank. One line.
- **Capture**: the state's capture id from the list (`CAP-002`).

Order the rows the way the video runs, not the way the console happens to present things. A row may hold on one state for several sentences; a state may be skipped; the list may be revisited at the end.

## 3. The pickup list

Every beat whose teaching needs something no state has: a menu open, a hover, a dropdown's options, a confirmation, an error, a screen the list lacks. For each, a capture request the walkthrough skill can run: the step number it belongs to, exactly what to do in the console, and what the picture must show. The pickups are captured and recreated before any footage is made. Nothing on screen is ever invented, described from memory, or drawn without a capture.

## What this skill does not do

It does not write the final narration (the director does, to the craft rules and the narrator's voice). It does not restyle, redraw or describe the screen beyond what the states show. It does not propose screens outside the task. When the fact check comes back later (the `video-fact-check` skill), it is the same expert reading the finished words.
