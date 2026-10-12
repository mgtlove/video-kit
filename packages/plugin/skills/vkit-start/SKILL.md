---
name: vkit-start
description: >
  This skill should be used at the start of any session in the video folder (video-kit and
  video-reference), or when the user says "start here", "check my setup", "where are we",
  "where does this video stand", or opens a video folder made by vkit new. It checks the install
  and the repos and prints the state before anything is built.
metadata:
  version: "0.1.7"
---

# Start a session

Runs in the director's chat (the one with the kit's repo on this machine); the other two roles have no setup to check.

Assume the person has not seen this project before. Say what it is in one line (training videos from screenshots and a script; the screen recreated, every frame drawn from a clock, checked before anyone records) and then what is here, in plain words, no jargon and no acronyms that are not spelled out. `vkit` with no command prints the front door and is the first thing to run.

Read `claude/START-HERE.md` at the workspace root (the folder holding `video-kit`, `video-reference`, `apps/` and `videos/`) and the files it names, in that order. Then check, and report in a few lines:

1. **The install.** `vkit --help` runs (if not: `cd video-kit && npm install && (cd packages/cli && npm link)`). Node 18 or newer. Chrome is installed (`PW_CHANNEL=chrome` is how frames render; nothing downloads a browser). ffmpeg for render and measure (`brew install ffmpeg`).
2. **The repos.** In each of `video-kit`, `video-reference` and the private app repos under `apps/`: `git fetch`, then say whether the local branch is behind, ahead, or has uncommitted work (`git status --short`, `git log --oneline origin/main -3`). Read the newest commits on the remote before building; two people solving the same thing in one morning has happened. A session that works in a cloud sandbox and delivers files to this machine starts the same way, and compares its tree to `origin/main` before it builds.
3. **What is waiting.** `vkit handoffs` on the `videos/` folder: each video, whose turn it is and which skill; the apps waiting for captures or states.
4. **The plan.** `video-kit/docs/ROADMAP.md`, "Next, in order": name the next milestone and what done looks like; `claude/roadmap-and-status.md` for where things stand this week.
5. **A video, if the session is inside one** (a folder with `video.json` and `rig/`): `vkit` with no command, then `vkit menu --show` for the ten choices and their locks; the engine in `rig/engine/VERSION` against the kit's (`vkit upgrade` brings it up and keeps the old copy aside); whether `parts.part_seconds` is filled; `vkit brand --check` if a brand is on.

Then ask what today's job is, offering the three ways in (an idea for a video; screenshots of a tool; a recording) and the roadmap's next milestone as the default. Do not change anything before that.
