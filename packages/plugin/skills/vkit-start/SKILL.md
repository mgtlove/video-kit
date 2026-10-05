---
name: vkit-start
description: >
  This skill should be used at the start of any session in the video folder (video-kit and
  video-reference), or when the user says "start here", "check my setup", "where are we",
  "where does this video stand", or opens a video folder made by vkit new. It checks the install
  and the repos and prints the state before anything is built.
metadata:
  version: "0.1.0"
---

# Start a session

Read `claude/START-HERE.md` at the workspace root (the folder holding `video-kit` and `video-reference`) and the files it names, in that order. Then check, and report in a few lines:

1. **The install.** `vkit --help` runs (if not: `cd video-kit && npm install && (cd packages/cli && npm link)`). Node 18 or newer. Chrome is installed (`PW_CHANNEL=chrome` is how frames render; nothing downloads a browser).
2. **The repos.** In each of `video-kit` and `video-reference`: `git fetch`, then say whether the local branch is behind, ahead, or has uncommitted work. Read the newest commits on the remote before building; two people solving the same thing in one morning has happened.
3. **The roadmap.** `video-kit/docs/ROADMAP.md`: name the next step and its proof.
4. **A video, if the session is inside one** (a folder with `video.json` and `rig/`): `vkit menu --show` for the ten choices and their locks; the engine version in `rig/engine/VERSION` against the kit's (`grep version packages/core/engine/rig.js`); whether `parts.part_seconds` is filled; `vkit brand --check` if a brand is on.

Then ask what today's job is. The roadmap's next step is the default answer. Do not change anything before that.
