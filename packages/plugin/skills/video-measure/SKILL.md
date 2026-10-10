---
name: video-measure
description: >
  This skill should be used when the user has voice clips for a video and says "measure the
  clips", "set the part lengths", "the voice is done", "I recorded the parts", or when a part's
  clip has been regenerated, or asks where each sentence is said. It turns the clips into the
  rig's exact part timing and places every sentence at its spoken word, never stretching anything.
metadata:
  version: "0.1.2"
---

# Measure the voice clips

The clips are the clock. One clip per part, `voice/part-N.wav` or `.mp3`, in order. `vkit measure` reads each file's exact length to two decimals and writes the `PARTS` line into `rig/index.html` and `video.json.parts` with today's date. No rounding up, no padding: a padded part makes every later part start late in the final cut.

Then `vkit time` places the sentences: it runs faster-whisper on this machine (`packages/core/time/words.py`, word timestamps on; the first run downloads the model once, about 1.5 GB; nothing leaves the machine) over each clip into `voice/part-N.words.json`, aligns the written words of `narration/part-N.md` to the heard words (a dropped word or a number said as digits does not move a sentence; a sentence nobody said is placed between its neighbours and named in the report), and writes each sentence's start into the Start column of `storyboard.md` and `voice/times.json`. Read the report: `part 2: 5 sentences, 61 of 64 written words heard` is a good read; a sentence placed between neighbours is one the recording skipped, which the producer decides on (re-take, or accept). Every beat inside a part is then an offset from that part's start, the Start value typed into the `at()` call with the sentence in the comment; `--redo` re-hears a clip, `--prompt "label, label"` primes the model with the console's own labels. Never stretch or scale a clip to fit a timeline; regenerate or re-record the part, then measure and time again.

A regenerated clip changes one part's length and its word times; re-run `vkit measure`, then `vkit time --redo` for that part, move that part's beats to the new starts, and render its frames.

Before any clip exists, `vkit narration` estimates each part at 150 words a minute and prints an estimate `PARTS` line, so the timeline can be roughed in. After `vkit measure`, the menu items that would re-time the video (look, tone, patterns, voice) are locked; `vkit menu --show` says so.
