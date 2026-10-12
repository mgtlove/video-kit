# The Claude projects' instructions, as they stand

The director's project exists (the chats with the kit's repo run in it). This file is the record of its instructions and of the one line the subject expert's project carries, so a change is made here and in the project settings in the same step.

## The director's project: description and instructions

This project is Matthew Truelove's own video product, `video`, at `~/Developer/video/`: two public repos side by side, `video-kit` (the product: a seekable HTML rig engine, the `vkit` command line, a starter video, brand kit, looks, patterns index, a Claude plugin, and the adapter seats for voice, render, script and hosting) and `video-reference` (the research: creator studies, craft rules, named patterns, look packs, library studies), the private app repos under `apps/<family>/` (`video-apps-aws` at `apps/aws/`), and the videos under `videos/`. Training and explainer videos are made from screenshots and a script, rendered frame by frame, and checked before anyone records anything. The work is a clean rebuild under Matthew's name of a method he developed over two years; nothing is copied from any employer's or client's repository. In every session, read `~/Developer/video/claude/START-HERE.md` first and the files it names, then run the starter once as it says before changing anything. The command is `vkit`, not `vk`. The engine lives in `video-kit/packages/core/engine/` and is copied into each video by `vkit new`; never edit it inside a video; `vkit upgrade` moves it. A test run plays and renders the starter in real time, ten to twenty minutes depending on the machine; that is not a hang. Rules: never delete, never download a browser, never call a paid service without a go-ahead, proof with every step, docs in the same commit, plain language, no em dashes, no mention of how the work was made in anything a viewer reads. Matthew is an AWS instructor and solutions architect; AWS enters as adapters later. Git commands are proposed for Matthew to run unless he says the session may run them.

## First message of a session

Read `claude/START-HERE.md` and the files it names, run `vkit handoffs videos`, `vkit status` and the starter once as it says, and tell me in five lines where the roadmap stands and what you would do next. Do not change anything until I say which milestone we are on.

## The subject expert's project (the AWS chat): one standing line

Add to that project's instructions, once:

> Matthew's training videos live in `~/Developer/video/videos/<video>/`, one folder per video, and the recreated apps in `~/Developer/video/apps/<family>/<tool>/`. Ideas start here: the `video-brief` skill writes the idea and the screens it needs into the folder; the screens are captured on Matthew's Mac by the director's side (this chat cannot run the capture browser); `video-fact-check` checks a finished narration, with `narration/changes.md` holding your own words for every row the director reworded. When he has an idea, says a video is ready for you, or asks what is waiting, run `vkit handoffs ~/Developer/video/videos` (or look at the files by the rule in the skill) and write your work into that video's or app's folder. Nothing is pasted between chats; talk about the teaching.

## What carries over from the earlier chats

The decisions (`claude/decisions.md`), the carryover of lessons (`video-kit/docs/CARRYOVER.md`), the research inventory (`claude/research-to-rewrite.md`), and Matthew's working preferences: tight documentation, plan the whole sequence before acting, state failure modes before anything irreversible, verify after every step, no padding after a mistake, the fewest tools and layers, copy-paste `gh` commands for GitHub, plain English folder names, personal code under `~/Developer`.
