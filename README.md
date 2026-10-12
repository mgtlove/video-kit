# video-kit

Training and explainer videos from screenshots and a script, with no screen recording, no voice re-takes and no video editor.

**How it works, in two minutes.** The screen of the tool being taught is recreated in HTML from your own screenshots, measured and cited down to the typeface, so it is a page, not a picture: it types, scrolls, clicks and loads the way the real thing does. A video is a folder with a storyboard, a narration, the voice clips and a rig page. The voice clips are the clock: every beat is timed to the word where it is said, so nothing is stretched and the explanation lands on the frame it belongs to. Every frame is drawn from a seekable clock, so a still at any second is exactly what plays at that second, and a checker proves that, plus the craft rules (text size, line length, contrast, holds, the camera), before anyone records. The result is an MP4 with the voice muxed and captions beside it, rendered with the Chrome you already have.

**Who does what.** Three roles, each a chat with the plugin's skills, and every handoff is a file in the video folder, never a pasted prompt. The producer owns the goal, the words and the first watch. The subject expert owns the teaching: the brief, the storyboard rows, the screens to capture, the fact check of the finished narration. The director owns the words under the craft rules, the recreated screen, the camera and the timeline. `vkit handoffs` says whose turn it is; `vkit` with no command says where a folder stands and the three ways in.

**The app is the asset.** A recreated tool is screens (states cited to your captures), behaviour (`model.json`: which control on which state leads where, by a click, typing or a scroll, and what a typed field accepts) and paths (`paths/`: what a lesson asks, in order, in its own words). The engine performs a transition the same way on a video's clock and under a learner's mouse, so a video is a path over the model with a voice and a teaching layer, and the practice copy (`vkit twin`) is the same path with the learner's own hand. One heavy lift per tool; every video and exercise after is a small one.

**Where it stands.** October 2026: the kit is at engine 0.6.0 and plugin 0.1.8, with the first real video (creating an S3 bucket, from the console recreated with nine states) accepted as a proof of concept after four watches, its behaviour moved into the app's model, the S3 practice copy clickable end to end with the sidekick beside it, and the upkeep written down: an app is the hub, its videos and twins are spokes, and `vkit status` says which are behind (`docs/MAINTENANCE.md`). Next, in order: looks and brands over the teaching layer, concept scenes for theory, the command line and code as app kinds, then the MCP server and the cloud and voice adapters. `docs/ROADMAP.md` is the plan; `docs/ARCHITECTURE.md` the shape; `docs/ENGINE.md` what a rig page can call; `docs/MODEL.md` the app model; `docs/MAINTENANCE.md` how a change reaches every copy; `docs/FINDINGS.md` what is open.

```
vkit                     the front door: what this is, what is waiting here, the three ways in
vkit help [command]      the manual page: every command in the order a video is made, or one in full
vkit new my-video        a video is a folder; --app family/tool puts a recreated app's screens in it
vkit app new|use|build|add-state|extract|crop   a recreated app: one folder per tool, built from your own captures; use puts it into a video or brings the copy up to date (use --all sweeps every video and checks each); build runs the app's generator and verifies its states; crop copies a logo or icon out of a capture
vkit capture walkthrough.docx    the screenshots and their steps out of a Word walkthrough into captures/, the shape checked (docs/CAPTURE.md is the brief)
vkit shoot start|"step" "did"|stop   the capture browser: Chrome on the kit's own profile at 1920x1080, headless; each shot masked, swept for private text, measured, into captures/
vkit face <name>         the product's typeface traced from the page as a face of our own, widths and kerning measured
vkit menu                the ten choices, one at a time, with context; --set answers one from a script
vkit brand <name>        a brand as tokens: five colours, two faces, a mark and a banner by when and where; --check measures it
vkit look <name>         a look pack as tokens: lightboard, code-report, studio-walkthrough, clippings, doodle, lecture-slides, archive-camera
vkit brief               brief-request.md for the subject expert: the app's states and the storyboard table in it
vkit handoffs            what is waiting and for whom, per video and per app; the folder is the handoff
vkit narration           the script parts against their limits, FULL.md, the Sentence column written and every change from the expert's words logged
vkit measure             exact clip lengths from the voice files into PARTS; the clips are the clock
vkit time                where each sentence is said: word times from the clips (faster-whisper, on this machine) into the Start column
vkit frames              a still per beat: look before you record
vkit render              every frame, the voice muxed, an MP4 and its captions
vkit check               is it footage, is it well made: offline, deterministic, seek-correct, craft rules, contrast, fidelity; --quick while you work
vkit twin family/tool    the practice copy: the app's states and model served as a page a learner clicks through, the sidekick beside it, on the same engine
vkit status              every app and every video and twin made from it, with what each carries, current or behind
vkit upgrade             a video's engine copy brought to the kit's; the old copy kept aside
vkit plugin pack         the plugin zipped for the claude.ai upload
vkit sync-reference      copy the rules, the look packs and the patterns index from video-reference into the kit
vkit publish             a host adapter and a URL (the adapter is not built yet)
```

`packages/plugin/` holds the Claude plugin: 14 skills over `vkit` (start, menu, build, frames, check, measure, brand, capture, capture-walkthrough, recreate, app-model, brief, script, fact-check) and a guardrail hook that blocks the four things an agent must never do (download a browser, force push, delete without asking, call a paid service without a go-ahead). `docs/workspace/` is the workspace's orientation files (the folder `claude/` beside the repos links to it).

The research behind it (seven creator studies, 96 craft rules, 35 named moves, seven look packs) lives in [video-reference](https://github.com/mgtlove/video-reference). `npm test` proves all of it on every push (GitHub's runner, with its own Chrome); the run's log says how long each proof takes.

Try it:

```
git clone https://github.com/mgtlove/video-kit && cd video-kit && npm install
npx vkit new my-video && cd my-video    # or: npx vkit new my-video --app example/placeholder
PW_CHANNEL=chrome npx vkit frames        # uses the Chrome you have; nothing downloads a browser
open rig/_frames                        # look
PW_CHANNEL=chrome npx vkit render        # out/my-video.mp4, .vtt, .srt; needs ffmpeg (brew install ffmpeg)
PW_CHANNEL=chrome npx vkit check         # every break named by rule id; --quick while you work
```

MIT. Matthew Truelove.
