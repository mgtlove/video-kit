# video

Matthew Truelove's video product: training and explainer videos made from screenshots and a script, rendered frame by frame from a seekable HTML rig, checked before anyone records anything. Started 1 October 2026.

The repositories, side by side on purpose, and the folders beside them:

| Folder | What | Read first |
|---|---|---|
| `video-kit/` | The product: engine, `vkit` command line, starter video, brand kit, looks, patterns index, the Claude plugin, the adapter seats (render built; voice, script and hosting to come) | `video-kit/README.md`, then `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/CARRYOVER.md` |
| `video-reference/` | The research, in full: seven creator studies with shot logs, rhetoric maps and measured audio; 96 craft rules; 35 named patterns; seven look packs; six library studies; licences | `video-reference/README.md`, then `CATALOG.md` |
| `apps/<family>/<tool>/` | Recreated apps, each family its own private repository (`apps/aws/` is `video-apps-aws`): measured states, crops, a traced face, `fidelity.md`, `capture-request.md` | `video-kit/docs/RECREATE.md` |
| `videos/<name>/` | The videos, one folder each: brief, storyboard, narration, voice, rig, the fact check; `create-s3-bucket` is the first | `vkit handoffs videos`; `vkit status` for what each carries |

This folder itself is not a git repo; the repositories inside it are. The files at this level (`README.md`, `CLAUDE.md`, `claude/`) orient a person or an agent; they are links to `video-kit/docs/workspace/`, where the one copy lives under version control.

## Run it

```
cd video/video-kit && npm install && (cd packages/cli && npm link)
vkit                                 # the front door: what this is, what is waiting, the three ways in
vkit new my-video && cd my-video
PW_CHANNEL=chrome vkit frames
open rig/_frames
PW_CHANNEL=chrome vkit render        # out/my-video.mp4; needs ffmpeg
```

## Where things stand

See `claude/roadmap-and-status.md` for this week on one screen and `video-kit/docs/ROADMAP.md` for the plan. In one line, 10 October 2026: the kit (engine 0.5.3, plugin 0.1.5, 20 commands) made its first real video, creating an S3 bucket from the console recreated with nine states, accepted as a proof of concept after four watches; next, in order, the light twin, looks and brands over the teaching layer, concept scenes for theory, the command line and code as app kinds, then the MCP server and the cloud and voice adapters.
