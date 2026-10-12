# Start here, for a new session

This is Matthew Truelove's video product: training and explainer videos made from screenshots and a script. The screen of the tool is recreated in HTML from his own screenshots, every frame is drawn from a seekable clock, and a checker proves the footage before anyone records anything. Three roles make a video (the producer, the subject expert, the director), each a chat with the plugin's skills, and every handoff is a file in the video's folder. If you have never seen this project, `vkit` with no command is the front door and `video-kit/README.md` is the two-minute version.

## The folder

`~/Developer/video/` is not a git repository; the repositories are inside it.

| Folder | What | Git |
|---|---|---|
| `video-kit/` | the product: engine, `vkit`, starter, brand kit, looks, patterns index, plugin, the adapter seats | public, `mgtlove/video-kit` |
| `video-reference/` | the research: creator studies, 96 craft rules, 35 patterns, seven look packs | public, `mgtlove/video-reference` |
| `apps/<family>/` | recreated apps, one private repo per family (`apps/aws/` is `mgtlove/video-apps-aws`): `aws/s3` has nine measured states of the S3 console | private |
| `videos/<name>/` | the videos, one folder each (`create-s3-bucket` is the first); not a repository yet | none |
| `claude/`, `README.md`, `CLAUDE.md` | these orientation files; links to `video-kit/docs/workspace/`, so there is one copy | with the kit |

## Read, in this order (about ten minutes)

1. `README.md` and `CLAUDE.md` at this level.
2. `project-brief.md`: the problem, the shape, the principles, and the amendments since.
3. `roadmap-and-status.md`: where things stand this week, on one screen.
4. `decisions.md`: the choices already made, so they are not re-argued; the newest are at the end.
5. `video-kit/docs/ROADMAP.md` (the plan: done with proof, open, next in order), `ARCHITECTURE.md`, `ENGINE.md`, `CARRYOVER.md`, `CAPTURE.md`, `RECREATE.md`, `FINDINGS.md`, `TWIN-CARRYOVER.md`.
6. `research-to-rewrite.md`: the inventory of what `video-reference` holds; `video-reference/CATALOG.md` is its index.

## Before changing anything

```
cd ~/Developer/video/video-kit && git fetch && git status --short && git log --oneline origin/main -5
cd ~/Developer/video/apps/aws && git fetch && git status --short && git log --oneline origin/main -3
cd ~/Developer/video && vkit handoffs videos
cd ~/Developer/video && vkit status
```

Read the newest commits before building; two people solving the same thing in one morning has happened. A session that works in a cloud sandbox and delivers files to this Mac starts the same way: fetch, then `git diff --stat origin/main` against its own tree, before it builds.

Then run the thing once:

```
cd ~/Developer/video/video-kit && npm install && (cd packages/cli && npm link)
cd /tmp && vkit new check && cd check && vkit && PW_CHANNEL=chrome vkit frames && open rig/_frames
```

If the frames render and look like the starter (an opener, three concept cards, a placeholder screen with a card beside a field; the card over a concept screen is the starter's own, a recreated console gets a note instead), the environment is right. Then ask Matthew what today's job is; the roadmap's next milestone is the default answer.

## Things a new session gets wrong without being told

- The command is `vkit`, never `vk`.
- The engine lives in `video-kit/packages/core/engine/` and is copied into each video by `vkit new`; never edit it inside a video. When the kit's engine moves, `vkit upgrade` in the video brings the copy up and keeps the old one aside. An app is the hub and every video and twin made from it carries a copy: `vkit status` says which copies are behind, the app's `CHANGES.md` says what moved, `vkit app use --all` brings every video up and checks each (`video-kit/docs/MAINTENANCE.md`).
- `video.json` is written by `vkit app use` and `vkit upgrade`; it carries this machine's paths, so a copy from another machine is never put in by hand.
- A full test run plays and renders the starter in real time, ten to twenty minutes depending on the machine (18 minutes in a cloud sandbox on 10 October 2026, the render proof alone five of them); it prints a progress line every 20 seconds, so a silent minute is the one thing to look into, not a silent run. Watch it with `PW_CHANNEL=chrome npm test 2>&1 | tee ~/Desktop/vkit-test.log | grep -vE "^\s"` (the file keeps everything; the filter hides the indented detail). The exact length of each proof is in the log of the GitHub run (`.github/workflows/test.yml`), which runs the same suite on every push. Node 22 prints the plain `ok` form into a pipe and Node 26 the `✔` form, so never filter on one of them.
- Matthew runs every git command that writes (commit, push); a session proposes them, copy-paste ready, and the commit message carries the docs changed with the code.
- Never delete anything: move it into `_suggested-trash/` and say so, one item at a time.
