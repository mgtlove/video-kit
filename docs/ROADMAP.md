# Roadmap

Each step lands with its proof: rendered frames compared, or a check that passes. Docs change in the same commit as the code.

1. Skeleton and docs. Done.
2. Core: clock and timeline (`at()` beats, parts), reset and seek, camera (`focusAt`, `focusEl`, `travel`, `home`, clamped to the frame, never under scale 1), scene and card helpers (the card places itself beside the element it names). Proof: `vkit new` creates a video from the starter and `vkit frames` writes 16 stills, one per beat plus part starts. Done.
3. Seek-correct motion: on a seek, beats older than the motion window are snapped, beats still in flight are re-fired with motion on and every animation they started is held at `t minus beat time`. Proof: `npm test` plays the starter for real to four moments (a scene crossfade, a card entrance, a camera move, a pull-back), reads the exact time each picture shows, seeks to it and compares pixels. Measured: 0 pixels differ at the card entrance; a crossfade differs by at most 6 levels of 255 from sub-millisecond timing; a camera move differs on 225 of 2,073,600 pixels (edge pixels, the compositor a frame ahead). Tolerance in the test: 0.05 percent of pixels over 8 levels. Done.
4. Seeded strokes (circle, frame, underline, arrow) that draw on with the voice; characters; the walkthrough layer (pointer, click, type). Proof: re-renders identical.
5. `vkit render`: every frame at 30 fps, ffmpeg mux with the clips, captions sidecar. This is the piece that never shipped before.
6. `vkit check`: offline, deterministic, seekable, seek-correct; the craft rules from `rules.json`; brand contrast.
7. Brand kit, looks, the menu, `vkit sync-reference`. The menu lists what the data files hold.
8. The plugin: skills over `vkit`, guardrails.
9. `vkit capture`: the agent walks a task in a browser and writes tagged screenshots and the manifest.
10. The sample video (something I can capture freely), the README for a reader who has two minutes.
11. The MCP server; cloud render and a voice provider as adapters when they earn their place.
