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
2. **Evidence.** The screenshots (a person's; `vkit capture` by the agent is roadmap step 9 and not built), each with an id; a walkthrough document if one exists, or one written from the screenshots and a transcript. A screen with no capture becomes a concept scene and a note of what to capture. Once a screen is wanted twice, `vkit app extract` lifts it into an app folder.
3. **Script in parts.** `narration/part-N.md`, one sentence per line, about 1000 characters a part at most so a part is cheap to make again, no sentence over 30 words, the whole video under about five minutes. `vkit narration` checks the limits, writes `narration/FULL.md` and estimates lengths. Get the words approved before any voice exists.
4. **Voice, then measure.** Generate or record each part into `voice/part-N.wav` (a paid voice service needs the person's yes in the conversation and `--approved` on the command), then the `video-measure` skill. The script is frozen once the clips exist.
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
