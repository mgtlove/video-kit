---
name: video-build
description: >
  This skill should be used when the user asks to "make a video", "build a video", "start a
  video", "turn this walkthrough into a video", "animate this screen", or is working in a folder
  made by vkit new. It sets out the order end to end and the rules that decide whether the footage
  is right.
metadata:
  version: "0.1.0"
---

# Build a video

A video is a folder made by `vkit new <name>` (or `vkit new <name> --app family/tool` when a recreated app exists): its script, words, screen, timeline and the record of its choices. The rig page is the footage, not a preview; anything wrong in it is wrong in the delivered video. The product screen is never recorded; it is recreated in HTML from still screenshots with an id each.

## Order

1. **The menu first.** The `video-menu` skill. Nothing below starts until `vkit menu --show` has an answer for the job and the sources.
2. **Evidence.** A walkthrough document from whoever has the tool: a heading per step, a line saying what was done, the screenshot under it (`docs/CAPTURE.md` is the brief; the `video-capture` skill sends it and reads what comes back). `vkit capture <walkthrough.docx> --into <folder>` turns it into `captures/CAP-NNN.png` with the text beside each, and every picture is looked at before anything is recreated. A screen with no capture becomes a concept scene and a note of what to capture. Once a screen is wanted twice, `vkit app extract` lifts it into an app folder.
3. **Brief, storyboard, script.** The idea starts in the subject expert's chat (`video-brief`: `brief.md` and the screens it needs, the app's `capture-request.md` when no app exists yet; the expert's chat captures, this one recreates, `vkit app use` brings the app into the video). Then `vkit brief` writes `brief-request.md` with the app's states in it; the subject expert's chat answers with the `video-brief` skill by writing `brief.md`, the storyboard rows and `capture-request.md` into the same folder; the `video-script` skill reads them, checks `storyboard-covered`, and writes the narration; the expert's `video-fact-check` writes `fact-check.md` beside it. The folder is the handoff and `vkit handoffs` says whose turn it is; nothing is pasted between chats. Pickups are captured and recreated before a sentence depends on them. The narration: `narration/part-N.md`, one sentence per line, about 1000 characters a part at most so a part is cheap to make again, no sentence over 30 words, the whole video under about five minutes. `vkit narration` checks the limits, writes `narration/FULL.md` and estimates lengths. Get the words approved before any voice exists.
4. **Voice, then measure.** The producer records each part (Voice Memos is fine; `voice/part-N.m4a`), or a paid voice service with the person's yes in the conversation and `--approved` on the command; then the `video-measure` skill. The clips are the clock; a re-recorded part re-times only itself. Beats are placed at the spoken word, not at an estimate.
5. **Screen and words.** `COPY` in `rig/index.html` holds every on-screen string. Recreate the screen from the captures only; keep the element ids the timeline points at.
6. **Timeline.** One `at()` per sentence, offset from its part's start, the sentence in the comment, mirrored in `storyboard.md` (`vkit render` makes the captions from it). Walkthrough beats use `pointer`, `click`, `type`, `ink`; the camera `focusEl`, `travel`, `home`; the explanation `card`. `docs/ENGINE.md` is the list.
7. **Look.** The `video-frames` skill until every frame is right; then the `video-check` skill: `vkit check --quick` while working, `vkit check` to land.
8. **Render.** `PW_CHANNEL=chrome vkit render` makes the MP4 with the voice at its part offsets and the VTT and SRT beside it; play it. `vkit publish` is roadmap step 11 and not built; the MP4 is handed over by the person.

## Rules that are not negotiable

- Never invent a screen detail. No capture, no chrome.
- Never fabricate what a product prints. Use a captured output word for word or cut to a concept scene.
- Colours, faces and brand are tokens: `rig/theme.css`, `rig/look.css` (`vkit look`), `rig/brand.css` (`vkit brand`); never a literal in the rig; never restyle anything under `#mock`.
- Never stretch or scale a part to fit; make the clip again and measure again.
- Never edit `rig/engine/` inside a video; change the kit, prove it with `npm test`, and copy `packages/core/engine/rig.js` and `rig.css` into the video with the new `VERSION` (an upgrade command is not built yet).
- No real person's name on screen; an invented cast, reused across videos.
- Plain language, no em dashes, no mention of how the work was made in anything a viewer reads.
