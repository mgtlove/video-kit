# Where things stand

As of 12 October 2026. One screen; the plan with every milestone, its proof and what comes next is `video-kit/docs/ROADMAP.md`, and the two-minute version of the product is `video-kit/README.md`. This file is updated in the same commit as any milestone, finding or decision that changes it; status is written nowhere else.

## This week

- 12 October, afternoon: milestone A2, maintenance, landed: an app is the hub and its videos and twins are spokes; `vkit status` says what every spoke carries and what is behind; an app's `CHANGES.md` says what moved since a copy; `vkit app use --all` is the sweep with each video's check; `app-copy-current` fails a stale copy; `vkit handoffs` puts new captures on the subject expert first (`what-changed.md`); `vkit app build` runs an app's generator and verifies its states; `docs/MAINTENANCE.md` is the route. Proof `maintenance.test.js`. Plugin 0.1.8.
- 12 October: the practice copy grew its sidekick, after the producer's second look (the page version was better but restrictive): a panel beside the practice browser, in a colour the console never uses, walking the lesson's path in its own words (`apps/aws/s3/paths/create-bucket.json`, the third data file of an app): the step, why, a ring on the control, Fill it in for me, Show me, Start over, exploring, off the path, refused, done. Typing is free: the field's rules sit in `model.json` with their sources, a name that breaks one is said beside the screen and held at Create, nothing typed forces no name. The scroll shimmer is gone (the bars are position sticky under CSS zoom; no script on scroll), the scrollbar is always shown, the field's stray ring is gone. Proof `twin.test.js`; the S3 copy walked by script. Pickup 3 opened: the console refusing a badly formed name was never captured, so the screen shows nothing for it until CAP-018 and CAP-019 land. Plugin 0.1.7 (the `app-model` skill knows paths and rules). A2, the maintenance milestone (the hub and its spokes), is written in the roadmap and not begun.
- The first real video, `videos/create-s3-bucket` (the S3 console recreated with nine states, the producer's own voice, every sentence placed at its spoken word), was accepted as a proof of concept on the fourth watch: pointer, click, press, load, typing, scroll, notes with leaders, the banner framed. Full check, nothing failing.
- 11 October: milestone A landed with its abstraction settled first: behaviour lives in the app (`model.json`, 17 transitions over the nine S3 states), mechanics in the engine (`act()`, 0.6.0), a video or a twin walks a path. The S3 timeline on `act` renders frame for frame; the checker holds it to the model; `vkit twin aws/s3` serves the practice copy as a page in a practice browser (the real address, back and forward, scaled to the width, scrolling whole, a real input), walked end to end in a browser (a bucket named by the learner, created, listed, and in the address). The producer's first look at the letterboxed first cut said it was awkward; the page version answers it. The `app-model` skill; plugin 0.1.6.
- The hardening pass closed the day: the docs audited against the code and the brief and realigned; `names.test.js` now holds every name a doc or skill uses to its source; `vkit upgrade`, `vkit plugin pack` and the front door (`vkit` with no command) built; `vkit narration` owns the storyboard's Sentence column and logs every change from the expert's words; engine 0.5.3; the proofs run on GitHub on every push.

## Versions

| What | Version | Where |
|---|---|---|
| engine | 0.6.0 | `video-kit/packages/core/engine/rig.js`; a video's `rig/engine/VERSION`; `vkit upgrade` moves it |
| plugin and its 14 skills | 0.1.8 | `video-kit/packages/plugin/.claude-plugin/plugin.json`; re-uploaded to claude.ai with `vkit plugin pack` |
| app `aws/s3` | 0.3.2, nine states, a model of 17 transitions and 7 rules on the name, one path of 5 steps, `CHANGES.md` from 0.1.0 | `apps/aws/s3/app.json`; `vkit app use aws/s3` moves it into a video |
| `vkit` | 22 commands | `vkit help`; `vkit status` for what every copy carries |
| research in the kit | `video-reference` as of 2 October 2026 | `vkit sync-reference` |

## Milestones

Done, with proof (the proof is a test file unless said): A the app model and the light twin with its sidekick; A2 maintenance, the hub and its spokes; 1 skeleton; 2 the core; 3 seek-correct motion; 4 strokes, the cast, the walkthrough layer; 5 `vkit render`; 5a the app folder; 6 `vkit check`; 7a looks, words and clips; 7b the brand kit and the menu; 8 the plugin and the progress line; 8a the frames skill's findings; 8b strokes draw; 9 `vkit capture`; 9b the capture browser; 10a the S3 capture; 10b the S3 recreation; 10c the S3 video as a proof of concept (four watches); 10e the hardening pass. Each has a sentence and its proof in the roadmap's "Done, with proof" and a paragraph in its history.

Not started: F the MCP server and the adapters (cloud render, Amazon Polly, a host); G what is left of the twin runner.

## Open, carried

| Item | Owner | Lands with |
|---|---|---|
| F5: the look draws the note; the menu records note / stroke only / none per video; a lane or caption not built | director | milestone B, looks and brands |
| F10: the refused-name row sits inside the happy path | subject expert | the expert's answer (recapture CAP-009 with the lesson's name, or move the row) |
| Pickup 2: eight hover and held-down pictures of the S3 console (CAP-010 to 017); the press is substituted until then | director, on the Mac with the browser | the next capture session |
| The three read deviations in the recording | producer | re-record three sentences, or accept them in the words |
| The S3 video's `narration/changes.md` starts empty; the expert's original rows are in the `_suggested-trash/` copies of `storyboard.md` on the Mac | director | when the rows are next touched |
| The S3 practice copy walked by the producer's own hand (`vkit twin aws/s3`), the sidekick beside it | producer | closes A |
| Pickup 3: the console refusing a badly formed name (CAP-018, CAP-019); the screen shows nothing for it until then | director, on the Mac with the browser | the next capture session |
| F11: session noise of 9 to 28 pixels on two S3 stills, under the tolerance | director | when the element is found |

## Next, in order

A and A2 done (11 and 12 October 2026). From here the S3 video is the control: the same subject, words and recording through every milestone, so a change seen is the layer's (the producer, 12 October). C first: a theory part before the console, as concept scenes the kit draws (the expert's rows, scripted, checked, recorded as a part of its own). Then B: looks and brands over the teaching layer and the concept scenes, the same video under each, F5 closed. D. The command line and code as app kinds (CloudShell first). E. The front door for a stranger, finished. F. The MCP server and the adapters. G. The twin runner. Each is defined, with what done looks like, in `video-kit/docs/ROADMAP.md`.

## The research lane

`video-reference` holds the research in full as of 2 October 2026 (`research-to-rewrite.md` is the inventory); `vkit sync-reference` reads it into the kit. A second chat takes the research lane, in `video-reference` only; the build chat never writes there. In the order that pays: two more videos per creator with ranges instead of single numbers; audience evidence per studied video; motion at frame precision around a hundred cuts; palettes clustered from sampled frames; the missing genres, one video each; three AWS and cloud teaching channels; sound as design; the listening pass; full Ken Burns at half-second steps and How Money Works' built scenes. When any of these lands, `vkit sync-reference` brings the new numbers into `rules.json`, `looks/` and `patterns/index.json`, and `npm test` says whether the starter and the seven looks still pass.

## How a step lands, and where proofs run

Code, its proof (frames compared or a check passing), and the docs (`README`, `ROADMAP`, `ENGINE`, this file, the skills) in one commit; Matthew runs the git commands unless he says the session may. Quick checks and looking can happen in any environment with a Chromium, and the GitHub run proves every push with the runner's own Chrome; anything pixel-committed (a byte comparison quoted in the docs, a frame committed) runs on Matthew's Mac with its Chrome (`PW_CHANNEL=chrome`), because fonts and seeded strokes are pixel-identical per machine, not across machines.
