# Architecture

One library, thin shells, four adapters.

```
INPUTS (adapters)                         CORE                                  OUTPUTS
screens: a person's screenshots,          sources -> capture ids, gaps
         a state of a recreated app,          frames (a PNG per beat)
         or the agent capturing in        menu    -> the ten choices            MP4 with the voice muxed
         a browser                        script  -> parts, measured clips      captions file
words:   a walkthrough document,          rig     -> screen, beats, patterns    a scene set per part for a host
         or screenshots + a transcript    render  -> every frame from the seek  a URL for a course
         turned into one                  check   -> rig, craft, brand          the walkthrough document,
voice:   generated clips, or a recording  publish -> host adapter               storyboard and QA report
identity: brand, look, menu defaults      (tokens, never edits)
```

Rules the whole thing rests on:

- **Everything is a function in `packages/core`.** The CLI, the plugin, the MCP server and an app only call those functions. Nothing lives in a shell that another shell would need.
- **A video is a folder, not a repo.** `vkit new` copies `starter/`; the engine is installed by version.
- **A recreated app is a folder beside the videos, never in the kit and never in one video.** `apps/<family>/<tool>/` holds the tool's palette (`tokens.css`), its structure (`screen.css`), one fragment per captured state and the one list of them (`manifest.csv`). `vkit new --app` copies the app into the video like the engine, so the video opens from disk and never changes when the app moves on. The kit finds apps in `$VKIT_APPS`, `../apps` beside itself, then its own `examples/apps`; it never knows which repo a folder came from. Three kinds of video, and the engine does not care which: no screen, a one-off screen inline, an app's states. Every state cites a capture; nothing is invented.
- **The clips are the clock.** Every beat is timed to a measured voice file; nothing is stretched; part lengths are exact.
- **A frame at t equals playback at t.** Seek-correctness is the contract every primitive meets, and `vkit check` measures it.
- **Tokens, never literals.** Colours, faces and brand come through `theme.css` and `brand.css`; the recreated product screen keeps its own measured palette and is never restyled.
- **Looks, patterns and rules are data, made from the research.** `vkit sync-reference` copies `craft/rules.json` from `video-reference` into the kit's `rules.json` with its source commit (looks and patterns follow in step 7); `vkit check` reads the kit's copy and never the reference; the menu reads the data files; nobody types a list or a threshold into a skill or a checker.
- **A check tells footage from not-footage, and well made from not, by rule id.** Offline, deterministic, seekable, seek-correct; then the measurable craft rules, contrast, and each app state against its capture. What it cannot measure yet it says so, with where the number lives, never a silent pass.
- **Four adapters** (voice, render, script, hosting) are one file each with a local implementation. A cloud renderer, a TTS service, a model that drafts the script, or a video host plugs in without the core changing.

See `ROADMAP.md` for the order and `CARRYOVER.md` for what must not be lost from the earlier work.
