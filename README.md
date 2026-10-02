# video-kit

Training videos from screenshots and a script. The screen is recreated in HTML from stills, the explanation is timed to the voice, every frame is rendered from a seekable clock, and a checker proves the footage before anyone records anything. One library, a CLI, a Claude plugin, and the seams for an MCP server and a cloud renderer.

Status: October 2026, roadmap steps 1 to 6 of 12. `vkit new` (inline or `--app`), `vkit app`, `vkit frames` and `vkit render` work; the engine draws seeded strokes, glides a pointer, clicks, types and places a figure, all seek-correct: a seek matches real playback pixel for pixel at nine moments, two renders are identical, and the MP4 is the run with the voice at its part offsets and captions beside it `vkit check` tells footage from not-footage and well made from not, by rule id, with the rules copied from the research (`npm test` proves all of it; it renders and checks the whole starter, so allow fifteen minutes). The engine is rebuilt clean from measured studies of how good explainer video is made; `docs/ROADMAP.md` has the order, `docs/ARCHITECTURE.md` the shape, `docs/ENGINE.md` what a rig page can call. Next: brand, looks, the menu, `vkit narration` and `vkit measure` (step 7); a two-minute sample and the first release follow.

```
vkit new my-video        a video is a folder; --app family/tool puts a recreated app's screens in it
vkit app new|add-state|extract   a recreated app: one folder per tool, built from your own captures
vkit menu                the ten choices, one at a time, with context
vkit narration           script parts, limits, estimates
vkit measure             exact clip lengths from the voice files
vkit frames              a still per beat: look before you record
vkit render              every frame, the voice muxed, an MP4 and its captions
vkit check               is it footage, is it well made: offline, deterministic, seek-correct, craft rules, contrast, fidelity
vkit sync-reference      copy the measurable craft rules from video-reference into the kit
vkit publish             a host adapter and a URL
```

`packages/plugin/` holds the Claude plugin: skills over `vkit` (start, menu, build, frames, measure, brand) and a guardrail hook. `docs/workspace/` is the committed copy of the workspace orientation files.

The research behind it (seven creator studies, 96 craft rules, 35 named moves, seven look packs) lives in [video-reference](https://github.com/mgtlove/video-reference).

Try it:

```
git clone https://github.com/mgtlove/video-kit && cd video-kit && npm install
npx vkit new my-video && cd my-video    # or: npx vkit new my-video --app example/placeholder
PW_CHANNEL=chrome npx vkit frames        # uses the Chrome you have; nothing downloads a browser
open rig/_frames                        # look
PW_CHANNEL=chrome npx vkit render        # out/my-video.mp4, .vtt, .srt; needs ffmpeg (brew install ffmpeg)
PW_CHANNEL=chrome npx vkit check         # every break named by rule id; --quick while you work
```

MIT. Matthew Truelove.
