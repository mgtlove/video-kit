---
name: video-frames
description: >
  This skill should be used when the user asks to "check the frames", "render frames", "show me
  the rig", "does the video look right", or after any change to a video's rig, theme, timeline or
  to the engine. A rig is judged by looking at rendered frames, never by reading code.
metadata:
  version: "0.0.1"
---

# Render and judge frames

From the video folder: `PW_CHANNEL=chrome vkit frames` writes a still per beat (sampled 0.3 s after it fires) plus each part start into `rig/_frames/`. `vkit frames 4.1 9 14.1` renders given seconds; `vkit frames --every 2` the whole run.

Then look at every frame and say what is wrong before touching anything: a beat on the wrong element, a card covering the field it names, text outside title safe (96 px sides, 54 px top and bottom), a camera that cut a field in half, a scene still fading when the next arrives, anything under `#mock` that does not match its capture.

A change that should not change the footage is proven by comparing frames byte for byte before and after (keep the old `_frames` aside, render again, compare). A change that should change it is proven by the person looking at the new frames. `npm test` in the kit proves a seek equals playback; run it after any engine change.

Never judge from the code, never from a description of the code, never from one frame.
