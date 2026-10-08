---
name: video-measure
description: >
  This skill should be used when the user has voice clips for a video and says "measure the
  clips", "set the part lengths", "the voice is done", "I recorded the parts", or when a part's
  clip has been regenerated. It turns the clips into the rig's exact part timing without ever
  stretching anything.
metadata:
  version: "0.1.1"
---

# Measure the voice clips

The clips are the clock. One clip per part, `voice/part-N.wav` or `.mp3`, in order. `vkit measure` reads each file's exact length to two decimals and writes the `PARTS` line into `rig/index.html` and `video.json.parts` with today's date. No rounding up, no padding: a padded part makes every later part start late in the final cut.

Then every beat inside a part is an offset from that part's start: scrub the clip, note where each sentence begins, type that number into the `at()` call, with the sentence in the comment, and mirror it in `storyboard.md`. Never stretch or scale a clip to fit a timeline; regenerate or re-record the part and measure again.

A regenerated clip changes one part's length; re-run `vkit measure`, re-check that part's offsets against the new clip, and render its frames.

Before any clip exists, `vkit narration` estimates each part at 150 words a minute and prints an estimate `PARTS` line, so the timeline can be roughed in. After `vkit measure`, the menu items that would re-time the video (look, tone, patterns, voice) are locked; `vkit menu --show` says so.
