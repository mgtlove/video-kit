# Roadmap and status

As of 2 October 2026. The canonical order is `video-kit/docs/ROADMAP.md`; this is the status view.

| Step | What | Status and proof |
|---|---|---|
| 1 | Skeleton and docs | Done (`9922ff6`) |
| 2 | Core: clock, timeline, reset and seek, camera clamped to the frame, scenes, the self-placing card; `vkit new`; `vkit frames` | Done (`a86803d`). 16 stills per run of the starter |
| 3 | Seek-correct motion: beats re-fired live and every animation held at t minus beat time | Done. `npm test` plays the starter to four moments and compares with a seek: with engine 0.1.1, 0 of 2,073,600 pixels differ at all four (was up to 6 levels on the crossfade and 225 edge pixels on the camera move with 0.1.0); tolerance 0.05 percent over 8 levels |
| 4 | Seeded strokes (circle, frame, underline, arrow), characters, the walkthrough layer (pointer glide, click ring, typing), all seek-correct | Done. Engine 0.3.0. `npm test`: two renders of the starter identical, 20 of 20 stills; the seek proof at nine moments, 0 pixels; inline and app-backed still identical. The figures are the mechanism; their drawing style comes with the looks (step 7) |
| 5 | `vkit render`: every frame at 30 fps, ffmpeg mux with the clips, captions sidecar | Done. `npm test` renders the starter with three beep clips: 2040 frames, 68.000 s; the frame handed to ffmpeg equals `vkit frames` at the four seek-test moments (0 pixels); decoded from the MP4 it is 45.4 to 48.6 dB PSNR on the Mac's Chrome (floor 40; a frame off by one is 26 to 28); the beeps land at 0.300, 24.300, 50.300 s. On the way, two fixes in the kit: the render adapter proves each capture's commit is on screen (a 1 px marker strip outside the footage), and engine 0.1.1 bakes held transitions on the main thread instead of leaving them to the compositor's clock |
| 5a | The app folder (`apps/<family>/<tool>/`), `state(id)` in engine 0.2.0, `vkit new --app`, `vkit app new`, `add-state`, `extract`, the example app `example/placeholder` | Done. `npm test`: three videos from the starter (inline, `--app example/placeholder`, and the round trip through `vkit app extract`) render all 16 frames byte for byte identical |
| 6 | `vkit check`: offline, deterministic, seek-correct, craft rules from `rules.json`, contrast, fidelity of each state against its capture | Done. `npm test`: the starter passes a full check (24 rows, 0 failing); four deliberate breaks caught by rule id; fidelity 1.000 against a capture of the state itself, 0.52 against it shifted and blurred. `rules.json` copied from the reference by `vkit sync-reference` |
| 7a | `vkit sync-reference` for looks and patterns, `vkit look`, `vkit narration`, `vkit measure` | Done. `npm test`: all seven looks pass the checker on the starter; the empty look layer is byte-identical and `none` restores it; clips of odd lengths measure in exactly and the page total equals their sum |
| 7b | The brand kit (`brand.json` to `brand.css`, the mark and banner by when and where, engine 0.4.0) and `vkit menu` | Next |
| 8 | The plugin installed and tried on a real video | Skills drafted in `video-kit/packages/plugin/` |
| 9 | `vkit capture`: the agent walks a task in a browser and writes tagged screenshots and the manifest, naming states as it goes | |
| 10 | The sample video and the README for a reader with two minutes; the video's app is the first real one, in `video-apps-aws` (private) | Subject: an AWS console task, Matthew's call |
| 11 | MCP server; cloud render and a voice provider as adapters; each prints a batch's cost and stops for a yes, and the hook's `--approved` rule goes then | |
| 12 | The twin runner: the same app folder plus `flows.json`, a learner clicks through; generic runner, private content | After the app folder exists. `docs/TWIN-CARRYOVER.md` |

`video-reference` holds the research in full as of 2 October 2026 (see `research-to-rewrite.md` for the inventory). Next for it, after step 7 gives `vkit sync-reference` something to read: the new research, in order: audience evidence per studied video, two more videos per creator, palettes from sampled frames, motion at frame precision, sound as design, missing genres, the listening pass.

## How a step lands

Code, its proof (frames compared or a check passing), and the docs (`README`, `ROADMAP`, `ENGINE`, this file) in one commit. Matthew runs the git commands unless he says the session may.

## Where proofs run

Quick checks and looking can happen in any environment with a Chromium. Anything that is proof (a byte comparison, a frame committed to the docs, `npm test`) runs on Matthew's Mac with its Chrome (`PW_CHANNEL=chrome`), because fonts and seeded strokes are pixel-identical per machine, not across machines. `npm test` runs its files one at a time: the playback proof is a real-time measurement and should not share the machine with a render.
