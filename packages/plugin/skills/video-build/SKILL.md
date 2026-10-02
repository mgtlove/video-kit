---
name: video-build
description: >
  This skill should be used when the user asks to "make a video", "build a video", "start a
  video", "turn this walkthrough into a video", "animate this screen", or is working in a folder
  made by vkit new. It sets out the order end to end and the rules that decide whether the footage
  is right.
metadata:
  version: "0.0.1"
---

# Build a video

A video is a folder made by `vkit new <name>`: its script, words, recreated screen, timeline and the record of its choices. The rig page is the footage, not a preview; anything wrong in it is wrong in the delivered video. The product screen is never recorded; it is recreated in HTML from still screenshots with an id each.

## Order

1. **The menu first.** Open the `video-menu` skill. Nothing below starts until its header line reads complete.
2. **Evidence.** The screenshots (a person's, or captured by the agent in a browser), each with an id; a walkthrough document if one exists, or one written from the screenshots and a transcript. A screen with no capture becomes a concept scene and a note of what to capture.
3. **Script in parts.** `narration/part-N.md`, one sentence per line, at most about 1000 characters a part so a part is cheap to regenerate; the whole video under about five minutes. `vkit narration` checks the limits and estimates lengths. Get the words approved before any voice exists.
4. **Voice, then measure.** Generate or record each part, then the `video-measure` skill. The script is frozen once the clips exist.
5. **Screen and words.** `COPY` holds every on-screen string. Recreate the screen from the captures only; keep the element ids the timeline points at.
6. **Timeline.** One `at()` per sentence, offset from its part's start, the sentence in the comment, mirrored in `storyboard.md`. Each beat that uses a pattern names it. Walkthrough beats use the pointer, click and typing primitives (roadmap step 4).
7. **Look.** The `video-frames` skill until every frame is right; then `vkit check` for the rig contracts, the craft rules and brand contrast.
8. **Render and publish.** `vkit render` makes the MP4 with the voice muxed and a captions file; `vkit publish` hands it to the host adapter and records the URL in `video.json`.

## Rules that are not negotiable

- Never invent a screen detail. No capture, no chrome.
- Never fabricate what a product prints. Use a captured output word for word or cut to a concept scene.
- Colours, faces and brand are tokens in `rig/theme.css` and `rig/brand/`; never a literal in the rig; never restyle anything under `#mock`.
- Never stretch or scale a part to fit; regenerate the clip and measure again.
- Never edit `rig/engine/` inside a video; change the kit and run `vkit upgrade`.
- No real person's name on screen; an invented cast, reused across videos.
- Plain language, no em dashes, no mention of how the work was made in anything a viewer reads.
