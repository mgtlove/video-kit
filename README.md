# video-kit

Training videos from screenshots and a script. The screen is recreated in HTML from stills, the explanation is timed to the voice, every frame is rendered from a seekable clock, and a checker proves the footage before anyone records anything. One library, a CLI, a Claude plugin, and the seams for an MCP server and a cloud renderer.

Status: skeleton, October 2026. The engine is being rebuilt clean from measured studies of how good explainer video is made; see `docs/ROADMAP.md` for the order and `docs/ARCHITECTURE.md` for the shape. A two-minute sample and the first release follow the renderer.

```
vk new my-video        a video is a folder
vk menu                the ten choices, one at a time, with context
vk narration           script parts, limits, estimates
vk measure             exact clip lengths from the voice files
vk frames              a still per beat: look before you record
vk render              every frame, the voice muxed, an MP4
vk check               seek-correct, craft rules, brand contrast
vk publish             a host adapter and a URL
```

The research behind it (seven creator studies, 96 craft rules, 35 named moves, seven look packs) lives in [video-reference](https://github.com/mgtlove/video-reference).

MIT. Matthew Truelove.
