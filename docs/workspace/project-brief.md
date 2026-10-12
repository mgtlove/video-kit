# Project brief: video

## What it is

A way to make training and explainer videos from screenshots and a script without screen recording, voice re-takes or a video editor. The product screen is recreated in HTML from stills, the explanation is timed to measured voice clips, every frame is rendered from a seekable clock, and a checker proves the footage (seek-correct, craft rules, brand contrast) before anyone records anything. One core library; a command line (`vkit`); a Claude plugin whose skills call it; later an MCP server exposing the same commands as tools, and cloud rendering and voice as adapters.

## Why it exists

Two years of this work at an employer (a learning-twin pipeline for a client, then a video lane for an internal product) produced the method, the measurements and the lessons; the team was cut. This is the clean rebuild under Matthew's own name: a product, a portfolio piece, and the basis of a job search. Nothing from those repositories is copied; the knowledge is carried in `video-kit/docs/CARRYOVER.md` and the research is rewritten from its sources.

## The shape

```
INPUTS (adapters)                         CORE                                  OUTPUTS
screens: a person's screenshots,          sources -> capture ids, gaps
         a state of a recreated app,          frames (a PNG per beat)
         or the agent capturing in        menu    -> the ten choices            MP4 with the voice muxed
         a browser                        script  -> parts, measured clips      captions file
words:   a walkthrough document,          rig     -> screen, beats, patterns    a scene set per part for a host
         or screenshots + a transcript    render  -> every frame from the seek  a URL for a course
         turned into one                  check   -> rig, craft, brand          the walkthrough document,
voice:   generated clips, or a recording  publish -> host adapter               storyboard and QA report
identity: brand, look, menu defaults      (tokens, never edits)
```

Rules the whole thing rests on are in `video-kit/docs/ARCHITECTURE.md`. The short form: everything is a function in the core and the shells are thin; a video is a folder; the clips are the clock; a frame at t equals playback at t; tokens, never literals; looks, patterns, rules and brands are data made from the research; four adapters, one file each.

## The research, and how the kit uses it

`video-reference` is read by people and agents, never loaded by a page. The kit carries three small data files made from it (`rules.json` for the checker, `looks/` for the menu, `patterns/index.json` for the menu) by `vkit sync-reference`. The menu lists what those files hold; nobody types a list into a skill. `?` on a menu item opens the full note in the reference when it is cloned beside the kit, or gives the link.

## The menu, the brand kit, the plugin

- **The menu** (`vkit menu`): the ten choices a video makes (job, sources, layout, brand, look, tone, patterns, voice, characters, fixed lines), one numbered item at a time, each explained before it is asked, with options in context, the house default and its reason, `?` for more, `0` to type what the list lacks, `S` to see frames. Choices live in `video.json.menu` with a history; house answers in `menu-defaults.json`; items that would re-time the video lock once the voice is measured. The same menu at the start and any time later.
- **The brand kit**: one folder, `rig/brand/` (five colours, two faces, a mark and a banner with when, where, size and opacity); `vkit brand` writes `brand.css`; the theme reads `--brand-*` with fallbacks so "no brand" renders identically; the product screen is never branded. Team or client brands in `brands/`.
- **The plugin** (`video-kit/packages/plugin/`): skills over `vkit` (start, menu, build, frames, measure, brand) and a guardrail hook (no browser download, no force push, no delete without asking, no paid call without a go-ahead). Drafted; installs once the commands it calls exist.

## Recreated apps, and the three kinds of video

A recreated app is the screen side of a tool, built once and used by many videos and later by a twin. It lives beside the videos, not inside one and not in the kit: `apps/<family>/<tool>/` (for example `apps/aws/bedrock/`) with `app.json` (name, what it extends, its states), `tokens.css` (the tool's measured colours and faces, scoped to the screen, never restyled), `screen.css` (its structure, scoped the same way), `states/` (one HTML fragment per captured state, such as `playground-empty.html`), `captures/` (the screenshots each state came from) and `manifest.csv`, the one list of states (id, file, screen, state, capture, capture date, note). One app is what a learner would call "the tool": per AWS service, plus `console` for the landing page and `cli` for a terminal. A state is one screen in one condition. Ten to thirty states is comfortable; past that, split by area. Every state names its capture and date, because consoles change and a learner notices.

App repos are private, one per family (`video-apps-aws`), cloned into `apps/<family>/`. The kit never knows which repo a folder came from; it looks for `apps/<family>/<tool>/app.json`.

Three kinds of video, and the engine does not care which:

- **Whiteboard or theory.** No screen. `vkit new` as it is; the menu's sources item says "no screen".
- **One-off screen.** Built inline in the video from a couple of captures, as the starter does. Nothing to maintain.
- **App-backed.** `vkit new --app aws/bedrock`; `video.json` names the app; the states the video uses are copied in at build time, like the engine, so the finished video opens from disk and never changes when the app moves on. `state(id)` in the engine puts a state on the stage.

`vkit app new`, `vkit app add-state` and `vkit app extract` (lift a video's inline screen into an app the day it is needed twice). Nobody builds an app ahead of need. The rule for every recreated screen: recreate from your own captures, cite each, never invent a control.

Two measurements come with this. **Fidelity**: `vkit check` renders each state and compares it with its capture at the same size, a structural similarity at reduced size and a side-by-side image; the image is what a person judges, the number is the trend. **Capture to state**: `vkit capture` names states as it shoots them, and a skill turns a capture into a state fragment with the app's tokens; the agent recreates, the person judges the fidelity image.

## The twin, later

A course is one app, several videos, then the twin: a small runner loads the same app folder plus `flows.json` (click X in state A shows state B; anything else shows the one practice notice) so a learner can click through what the videos showed. Its own roadmap step with its own proof, after the app folder exists. The runner is generic; the content of every twin is private.

## AWS, later, as adapters

Matthew has a personal AWS account and an AWS builder chat. Cloud rendering (a container with Chromium, frames to S3) and Amazon Polly (a voice that returns measurable files) are the two places AWS earns its way in first, through the render and voice adapters, without the core changing. An Amplify app is possible later and only if someone who will not use a terminal needs it. No database, auth or web UI before then.

## The sample video

Not from any employer. Something Matthew can capture freely, probably an AWS console task, showing a concept opener and a walkthrough. It is the demo in the README and the first real use of every command.

## Amendments since 1 October 2026

The brief above is the original problem statement and stays as written. What has changed since, each by a recorded decision (`decisions.md`):

- **The output's own framing.** A console video is a screen recording made of stills: the recreated screen is a page that types, scrolls, clicks, presses and loads (engine 0.5.0 to 0.5.2, 9 and 10 October). The brief's "without screen recording" still holds (nothing real is recorded); what the viewer sees is a recording, recreated.
- **Three roles and the handoffs.** The producer, the subject expert (its own chat) and the director (the chat with the repo) make a video, and every handoff is a skill and a file in the video's folder, never a pasted prompt (`vkit brief`, `vkit handoffs`, `video-brief`, `video-script`, `video-fact-check`; 7 and 8 October). The storyboard is the teaching and the capture walkthrough the evidence, two documents with two owners; the storyboard carries an Action column.
- **Apps are built ahead of need.** "Nobody builds an app ahead of need" was replaced on 8 October: an app is its own versioned asset, built before or without any video, brought into a video by `vkit app use`; capture the path plus one layer out (10 October).
- **The words are timed by the voice, word by word.** `vkit time` places every sentence at the word where it is said (9 October); `vkit narration` writes the storyboard's Sentence column and logs every change from the expert's words (10 October).
- **The twin moved up, and landed.** A light twin (the app driven by a hand through the same page model) came before looks and brands; it landed 11 October as `vkit twin` over `model.json` (`flows.json` by its real name), and on 12 October grew the sidekick beside the practice browser, walking the lesson's path (`paths/`, the app's third data file) with free typing checked against the field's rules. What is left of the full runner is milestone G; keeping the app a hub for its videos and twins is A2 (12 October).
- **The plugin grew** from six drafted skills to 13 at 0.1.5, re-uploaded to claude.ai so every chat on the account has them.
- **The front door.** `vkit` with no command, and skills written for someone who has not seen the project (10 October).
- **The menu's layout item** still describes a card beside its element; over a recreated screen a note is used now (F5, open).
- **AWS** still enters as adapters, not before (milestone F); the S3 console is subject matter only.

