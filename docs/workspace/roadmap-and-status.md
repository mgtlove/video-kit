# Where things stand

As of 10 October 2026, evening. One screen; the plan with every milestone, its proof and what comes next is `video-kit/docs/ROADMAP.md`, and the two-minute version of the product is `video-kit/README.md`. This file is updated in the same commit as any milestone, finding or decision that changes it; status is written nowhere else.

## This week

- The first real video, `videos/create-s3-bucket` (the S3 console recreated with nine states, the producer's own voice, every sentence placed at its spoken word), was accepted as a proof of concept on the fourth watch: pointer, click, press, load, typing, scroll, notes with leaders, the banner framed. Full check, nothing failing.
- The hardening pass closed the day: the docs audited against the code and the brief and realigned; `names.test.js` now holds every name a doc or skill uses to its source; `vkit upgrade`, `vkit plugin pack` and the front door (`vkit` with no command) built; `vkit narration` owns the storyboard's Sentence column and logs every change from the expert's words; engine 0.5.3; the proofs run on GitHub on every push.

## Versions

| What | Version | Where |
|---|---|---|
| engine | 0.5.3 | `video-kit/packages/core/engine/rig.js`; a video's `rig/engine/VERSION`; `vkit upgrade` moves it |
| plugin and its 13 skills | 0.1.5 | `video-kit/packages/plugin/.claude-plugin/plugin.json`; re-uploaded to claude.ai with `vkit plugin pack` |
| app `aws/s3` | 0.3.1, nine states | `apps/aws/s3/app.json`; `vkit app use aws/s3` moves it into a video |
| `vkit` | 20 commands | `vkit help` |
| research in the kit | `video-reference` as of 2 October 2026 | `vkit sync-reference` |

## Milestones

Done, with proof (the proof is a test file unless said): 1 skeleton; 2 the core; 3 seek-correct motion; 4 strokes, the cast, the walkthrough layer; 5 `vkit render`; 5a the app folder; 6 `vkit check`; 7a looks, words and clips; 7b the brand kit and the menu; 8 the plugin and the progress line; 8a the frames skill's findings; 8b strokes draw; 9 `vkit capture`; 9b the capture browser; 10a the S3 capture; 10b the S3 recreation; 10c the S3 video as a proof of concept (four watches); 10e the hardening pass. Each has a sentence and its proof in the roadmap's "Done, with proof" and a paragraph in its history.

Not started: F the MCP server and the adapters (cloud render, Amazon Polly, a host); G the full twin runner.

## Open, carried

| Item | Owner | Lands with |
|---|---|---|
| F5: the look draws the note; the menu records note / stroke only / none per video; a lane or caption not built | director | milestone B, looks and brands |
| F10: the refused-name row sits inside the happy path | subject expert | the expert's answer (recapture CAP-009 with the lesson's name, or move the row) |
| Pickup 2: eight hover and held-down pictures of the S3 console (CAP-010 to 017); the press is substituted until then | director, on the Mac with the browser | the next capture session |
| The three read deviations in the recording | producer | re-record three sentences, or accept them in the words |
| The S3 video's `narration/changes.md` starts empty; the expert's original rows are in the `_suggested-trash/` copies of `storyboard.md` on the Mac | director | when the rows are next touched |
| The workspace links (`claude/`, `README.md`, `CLAUDE.md` to `video-kit/docs/workspace/`) | producer | the commands are in the hardening delivery |

## Next, in order

A. The light twin (the app engine proved by a hand). B. Looks and brands over the teaching layer (F5 closed). C. Concept scenes for theory. D. The command line and code as app kinds (CloudShell first). E. The front door for a stranger, finished. F. The MCP server and the adapters. G. The twin runner. Each is defined, with what done looks like, in `video-kit/docs/ROADMAP.md`.

## The research lane

`video-reference` holds the research in full as of 2 October 2026 (`research-to-rewrite.md` is the inventory); `vkit sync-reference` reads it into the kit. A second chat takes the research lane, in `video-reference` only; the build chat never writes there. In the order that pays: two more videos per creator with ranges instead of single numbers; audience evidence per studied video; motion at frame precision around a hundred cuts; palettes clustered from sampled frames; the missing genres, one video each; three AWS and cloud teaching channels; sound as design; the listening pass; full Ken Burns at half-second steps and How Money Works' built scenes. When any of these lands, `vkit sync-reference` brings the new numbers into `rules.json`, `looks/` and `patterns/index.json`, and `npm test` says whether the starter and the seven looks still pass.

## How a step lands, and where proofs run

Code, its proof (frames compared or a check passing), and the docs (`README`, `ROADMAP`, `ENGINE`, this file, the skills) in one commit; Matthew runs the git commands unless he says the session may. Quick checks and looking can happen in any environment with a Chromium, and the GitHub run proves every push with the runner's own Chrome; anything pixel-committed (a byte comparison quoted in the docs, a frame committed) runs on Matthew's Mac with its Chrome (`PW_CHANNEL=chrome`), because fonts and seeded strokes are pixel-identical per machine, not across machines.
