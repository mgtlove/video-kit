---
name: video-check
description: >
  This skill should be used when the user asks "is it right", "check the video", "run the
  checker", "why did check fail", "is this footage", or before a video is called done. It runs
  vkit check, reads the report by rule id, and says what to change and where.
metadata:
  version: "0.1.0"
---

# Check a video

`vkit check` answers two questions about a video folder: is it footage (offline, deterministic, seekable, and a seek equals real playback) and is it well made (the craft rules in `rules.json`, contrast of every text colour and stroke against what it sits on, fidelity of each app state against its capture). Every row is a rule id with its measurement, the threshold and the place to look. The exit code is 1 when any row fails.

- `PW_CHANNEL=chrome vkit check --quick` while working: the stills, the measures and the rules, in about a minute. It skips the seek proof and the 10 fps motion sample and says so in the report.
- `PW_CHANNEL=chrome vkit check` to land a video: adds the seek proof (real playback, one moment per part, so it takes as long as the video) and the motion sample. Both print a progress line.

## Reading the report

Read the failing rows first, by id, and say for each: what was measured, what the rule wants, where in the rig it is. Then the `not measured` rows: those are honest gaps, named with where the number lives; never present one as a pass. `info` rows are context. The groups are footage, seekCorrect, craft, contrast, fidelity.

Common failures and what they mean:
- `text-floor`: read text under 54 px. Raise it, or mark it `data-decor` only if the voice never depends on it.
- `title-safe`: a box outside 96 px sides or 54 px top and bottom. Move it; the brand mark and banner are placed by the engine and never fail this.
- `line-length`: over 42 characters a line; narrow the box, and remember the proof machine's fonts decide.
- `stroke-contrast` or `text-contrast`: a colour under 3:1 or 4.5:1 against the pixels behind it. With a look or brand on, the fix is in the pack or the brand (`vkit brand --check` names the ratio); never a literal in the rig.
- `still-run`: a hold longer than the tone allows (8 s, 12 s formal). Add a beat or cut.
- `sentences-match` or `captions`: `storyboard.md` and `narration/part-N.md` disagree; one sentence per row, in order.
- `seek-equals-playback`: a frame at t differs from playback at t. An engine matter, not a video one: say so and stop; `npm test` in the kit is the proof.
- `state:<id>`: fidelity, reported, not judged; say the score and the coverage and show the side-by-side PNG in `out/fidelity/`.

A rig is judged by looking at frames and by this report, never by reading its code. Never edit `rules.json` in the kit to make a row pass; it is copied from the research by `vkit sync-reference`.
