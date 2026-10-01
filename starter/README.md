# {{NAME}}

One video: its script, words, recreated screen and timeline. Made by `vkit new`. The engine is in `rig/engine/`, copied in at the version in `video.json`; never edit it there, change it in the kit and run `vkit upgrade`.

| Path | What |
|---|---|
| `rig/index.html` | The rig: scenes, the recreated screen, `COPY`, the timeline. It is the footage, not a preview |
| `rig/theme.css` | Every colour and face: the teaching layer under `:root`, the product palette under `#mock` |
| `narration/part-N.md` | The script, one file per voice clip, one sentence per line |
| `voice/` | The measured clips, `part-N.wav` or `.mp3` |
| `storyboard.md` | One row per beat, mirrored by the timeline |
| `video.json` | Every choice this video made (`menu`), the parts, the voice, how it was published |

Order: `vkit menu`, write the parts, generate or record the voice, `vkit measure`, build the screen and the beats, `vkit frames` and look, `vkit render`, `vkit check`, `vkit publish`.
