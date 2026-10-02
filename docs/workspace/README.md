# video

Matthew Truelove's video product: training and explainer videos made from screenshots and a script, rendered frame by frame from a seekable HTML rig, checked before anyone records anything. Started 1 October 2026.

Two repos, side by side on purpose:

| Folder | What | Read first |
|---|---|---|
| `video-kit/` | The product: engine, `vkit` command line, starter video, brand kit, looks, patterns index, plugin, adapters for voice, render, script and hosting | `video-kit/README.md`, then `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/CARRYOVER.md` |
| `video-reference/` | The research, in full: seven creator studies with shot logs, rhetoric maps and measured audio; 96 craft rules; 35 named patterns; seven look packs; six library studies; licences | `video-reference/README.md`, then `CATALOG.md` |

This folder itself is not a git repo; the two inside it are. The files at this level (`README.md`, `CLAUDE.md`, `claude/`) orient a person or an agent and are copied into `video-kit/docs/workspace/` so they are also under version control. Keep the two copies the same.

## Run it

```
cd video/video-kit && npm install && (cd packages/cli && npm link)
vkit new my-video && cd my-video
PW_CHANNEL=chrome vkit frames
open rig/_frames
PW_CHANNEL=chrome vkit render        # out/my-video.mp4; needs ffmpeg
```

## Where things stand

See `claude/roadmap-and-status.md`. In one line: the engine, `vkit new`, `vkit frames`, the proof that a seek equals playback, and `vkit render` to MP4 with the voice and captions are built; next is strokes and the pointer, then the checker, brand, looks, menu, plugin.
