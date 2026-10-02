# Project brief: video

## What it is

A way to make training and explainer videos from screenshots and a script without screen recording, voice re-takes or a video editor. The product screen is recreated in HTML from stills, the explanation is timed to measured voice clips, every frame is rendered from a seekable clock, and a checker proves the footage (seek-correct, craft rules, brand contrast) before anyone records anything. One core library; a command line (`vkit`); a Claude plugin whose skills call it; later an MCP server exposing the same commands as tools, and cloud rendering and voice as adapters.

## Why it exists

Two years of this work at an employer (a learning-twin pipeline for a client, then a video lane for an internal product) produced the method, the measurements and the lessons; the team was cut. This is the clean rebuild under Matthew's own name: a product, a portfolio piece, and the basis of a job search. Nothing from those repositories is copied; the knowledge is carried in `video-kit/docs/CARRYOVER.md` and the research is rewritten from its sources.

## The shape

```
INPUTS (adapters)                         CORE                                  OUTPUTS
screens: a person's screenshots,          sources -> capture ids, gaps          frames (a PNG per beat)
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

## AWS, later, as adapters

Matthew has a personal AWS account and an AWS builder chat. Cloud rendering (a container with Chromium, frames to S3) and Amazon Polly (a voice that returns measurable files) are the two places AWS earns its way in first, through the render and voice adapters, without the core changing. An Amplify app is possible later and only if someone who will not use a terminal needs it. No database, auth or web UI before then.

## The sample video

Not from any employer. Something Matthew can capture freely, probably an AWS console task, showing a concept opener and a walkthrough. It is the demo in the README and the first real use of every command.
