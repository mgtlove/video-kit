# Start here, for a new session

Read in this order, about ten minutes:

1. `../README.md` and `../CLAUDE.md` (this folder).
2. `project-brief.md`: what is being built and why, the flow, the adapters.
3. `roadmap-and-status.md`: what is done, with proof, and what is next.
4. `decisions.md`: the choices already made, so they are not re-argued.
5. `video-kit/docs/ARCHITECTURE.md`, `ROADMAP.md`, `ENGINE.md`, `CARRYOVER.md`, `TWIN-CARRYOVER.md`.
6. `research-to-rewrite.md`: the inventory of what `video-reference` holds; `video-reference/CATALOG.md` is its index.

Then run the thing once before changing it:

```
cd video-kit && npm install && (cd packages/cli && npm link)
cd /tmp && vkit new check && cd check && PW_CHANNEL=chrome vkit frames && open rig/_frames
```

If the frames render and look like the starter (an opener, three cards, a placeholder screen with a card beside a field), the environment is right. Then ask Matthew what today's job is; the roadmap's next step is the default answer.

Three things a new session gets wrong without being told: the command is `vkit`, not `vk`; the engine lives in `video-kit/packages/core/engine/` and is copied into each video by `vkit new`, so never edit it inside a video; and a full test run takes about fifteen minutes because it renders the starter and plays it in real time; it prints a progress line every 20 seconds, so a silent minute is the one thing to look into, not a silent run. Watch it with `PW_CHANNEL=chrome npm test 2>&1 | tee ~/Desktop/vkit-test.log | grep -vE "^\s"` (the file keeps everything; the filter hides the indented detail). Node 22 prints the plain `ok` form into a pipe and Node 26 the `✔` form, so never filter on one of them.
