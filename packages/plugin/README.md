# vkit plugin

Skills that drive `vkit` and explain the choices, plus a guardrail hook. Every command a skill names exists in the kit (`npm test` checks that); `vkit publish` (roadmap step 11) is named as not built where a skill would reach for it.

Install from a clone of `video-kit`:

```
/plugin marketplace add ./video-kit/packages/plugin       Claude Code, from the folder holding video-kit
/plugin install vkit@vkit-local                            then install the plugin from that marketplace
cd packages && zip -r ~/Desktop/vkit-plugin.zip plugin -x '*/node_modules/*' -x '*.DS_Store'     claude.ai: Customize, Plugins, Upload a plugin
```

The claude.ai upload puts the plugin on the account, so every chat (the director's project and the subject expert's) has all the skills, and a kit change is one re-upload with a higher `version` in `.claude-plugin/plugin.json` (the test pins every skill to the plugin's version). The upload validates each skill: a description must not hold anything shaped like a tag (`apps/<family>/<tool>` was refused as XML on 8 October 2026; `npm test` now refuses it first).

| Skill | When |
|---|---|
| `vkit-start` | the start of a session in the `video` folder: checks the install and the repos, prints where a video stands (`vkit menu --show`, engine version, locks, brand) |
| `video-menu` | the ten choices a video makes, one item at a time, with the reason; writes only through `vkit menu --set`; options read with `vkit menu --explain` |
| `video-build` | making a video end to end, in order, with the rules that decide whether the footage is right |
| `capture-walkthrough` | a Claude Code session on the machine with the browser captures, against the expert's request, with the person signed in: the kit's own Chrome on its own profile at exactly 1920x1080, driven through the Playwright MCP server, `vkit shoot` at each screen with masks and a text sweep; the person signs in once in a visible window |
| `video-recreate` | from a capture set to measured states in the app folder: tokens with sources, pictures cropped out of the captures (`vkit app crop`), the face traced from the page (`vkit face`), states placed by scan, `vkit check`'s fidelity rows looked at side by side, and `fidelity.md`, the ledger of what is true, substituted, invented or missing |
| `video-brief` | for the subject expert's chat, where ideas start: writes `brief.md` and the screens the teaching needs (the app's coverage when no app exists yet); later finds the video waiting for it (`vkit handoffs`), reads its `brief-request.md` (written by `vkit brief` with the app's states in it) and writes the storyboard rows and `capture-request.md` into the folder; never the final narration, never an invented screen |
| `video-script` | the director: reads the expert's three files, checks `storyboard-covered`, writes `narration/part-N.md` under the craft rules and the narrator's voice, gates it with `vkit narration`, leaves `FULL.md` for the fact check; recording and the timeline come after |
| `video-fact-check` | for the subject expert's chat: finds the narration waiting for it, writes `fact-check.md` beside it with a verdict per sentence (true, wrong with the correction, caveat, drift) against the console and the storyboard |
| `video-capture` | the other way to get screenshots: sends the capture brief (`docs/CAPTURE.md`) to whoever has the tool, runs `vkit capture` on the walkthrough document that comes back, reads every picture before a screen is recreated |
| `video-frames` | rendering and judging frames after any change |
| `video-check` | running `vkit check`, reading the report by rule id, saying what to change and where |
| `video-measure` | turning voice clips into exact part lengths; what locks after |
| `brand-apply` | setting up or changing the brand a video carries, through `vkit brand` and `--check` |

The hook (`hooks/hooks.json`, `hooks/scripts/guard.py`, 21 cases in `test_guard.py`, run by `npm test`) runs before every shell command and blocks: a browser download; `git push --force`, `git reset --hard`, `git clean -f`, branch and repo deletion; `rm` outside temporary folders; a call to a paid API unless the command carries `--approved`. A blocked call says why and what to do instead. The hook fails open on its own errors.

Long `vkit` commands print a progress line: a bar that rewrites in place on a terminal, plain lines every few seconds in a pipe or a log, so a skill reading the output sees the step, the count and the time left. `VKIT_QUIET=1` turns it off.

