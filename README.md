# video-kit

Training videos from screenshots and a script. The screen is recreated in HTML from stills, the explanation is timed to the voice, every frame is rendered from a seekable clock, and a checker proves the footage before anyone records anything. One library, a CLI, a Claude plugin, and the seams for an MCP server and a cloud renderer.

Status: October 2026, roadmap steps 1 to 3 of 11. `vkit new` and `vkit frames` work; a seek matches real playback (`npm test`). The engine is rebuilt clean from measured studies of how good explainer video is made; `docs/ROADMAP.md` has the order, `docs/ARCHITECTURE.md` the shape, `docs/ENGINE.md` what a rig page can call. A two-minute sample and the first release follow the renderer (step 5).

```
vkit new my-video        a video is a folder
vkit menu                the ten choices, one at a time, with context
vkit narration           script parts, limits, estimates
vkit measure             exact clip lengths from the voice files
vkit frames              a still per beat: look before you record
vkit render              every frame, the voice muxed, an MP4
vkit check               seek-correct, craft rules, brand contrast
vkit publish             a host adapter and a URL
```

The research behind it (seven creator studies, 96 craft rules, 35 named moves, seven look packs) lives in [video-reference](https://github.com/mgtlove/video-reference).

Try it:

```
git clone https://github.com/mgtlove/video-kit && cd video-kit && npm install
npx vkit new my-video && cd my-video
PW_CHANNEL=chrome npx vkit frames        # uses the Chrome you have; nothing downloads a browser
open rig/_frames                        # look
```

MIT. Matthew Truelove.
