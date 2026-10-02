# {{NAME}}

One video: its script, words, recreated screen and timeline. Made by `vkit new`. The engine is in `rig/engine/`, copied in at the version in `video.json`; never edit it there, change it in the kit and run `vkit upgrade`.

| Path | What |
|---|---|
| `rig/index.html` | The rig: scenes, the recreated screen, `COPY`, the timeline. It is the footage, not a preview |
| `rig/theme.css` | Every colour and face of the teaching layer under `:root`; the product palette under `#mock` when the screen is inline |
| `rig/app/` | Only with `vkit new --app`: the recreated app as copied in (`tokens.css`, `screen.css`, `states/`, `manifest.csv`, `states.js`). Change the app and make the video again; never edit here |
| `narration/part-N.md` | The script, one file per voice clip, one sentence per line |
| `voice/` | The measured clips, `part-N.wav` or `.mp3` |
| `storyboard.md` | One row per sentence, mirrored by the timeline's beats (typing is one row; its characters are minor beats) |
| `video.json` | Every choice this video made (`menu`), the parts, the voice, how it was published |
| `out/` | What `vkit render` wrote (the MP4, `.vtt`, `.srt`, `render.json`) and what `vkit check` wrote (`check.json`, `check/` stills, `fidelity/` side-by-sides) |

Order: `vkit menu`, write the parts, generate or record the voice, `vkit measure`, build the screen and the beats, `vkit frames` and look, `vkit check --quick` while you work, `vkit render`, `vkit check`, `vkit publish`. Text the voice depends on carries `data-narration`; text it never depends on carries `data-decor`; the checker holds the first to the 54 px floor.
