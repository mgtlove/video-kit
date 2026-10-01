# Roadmap

Each step lands with its proof: rendered frames compared, or a check that passes. Docs change in the same commit as the code.

1. Skeleton and docs (this commit).
2. Core: clock and timeline (`at()` beats, parts), reset and seek, camera (`camFocus`, `camEl`, `camTravel`, clamp to the screen), scene and card helpers. Proof: the starter renders and `vk frames` writes a still per beat.
3. Seek-correct motion: every CSS transition and animation held at `t minus beat time` on a seek, matching playback pixel for pixel (the Web Animations study). Proof: a direct seek equals a sequential one.
4. Seeded strokes (circle, frame, underline, arrow) that draw on with the voice; characters; the walkthrough layer (pointer, click, type). Proof: re-renders identical.
5. `vk render`: every frame at 30 fps, ffmpeg mux with the clips, captions sidecar. This is the piece that never shipped before.
6. `vk check`: offline, deterministic, seekable, seek-correct; the craft rules from `rules.json`; brand contrast.
7. Brand kit, looks, the menu, `vk sync-reference`. The menu lists what the data files hold.
8. The plugin: skills over `vk`, guardrails.
9. `vk capture`: the agent walks a task in a browser and writes tagged screenshots and the manifest.
10. The sample video (something I can capture freely), the README for a reader who has two minutes.
11. The MCP server; cloud render and a voice provider as adapters when they earn their place.
