# vkit plugin

Skills that drive `vkit` and explain the choices, plus a guardrail hook. Every command a skill names exists in the kit (`npm test` checks that); `vkit capture` (roadmap step 9) and `vkit publish` (step 11) are named as not built where a skill would reach for them.

Install from a clone of `video-kit`:

```
/plugin marketplace add ./video-kit/packages/plugin       Claude Code, from the folder holding video-kit
/plugin install vkit@vkit-local                            then install the plugin from that marketplace
cd packages/plugin && zip -r ../../vkit.plugin . -x '*__pycache__*' -x '*.DS_Store' -x '_suggested-trash/*'     the desktop app: open vkit.plugin
```

| Skill | When |
|---|---|
| `vkit-start` | the start of a session in the `video` folder: checks the install and the repos, prints where a video stands (`vkit menu --show`, engine version, locks, brand) |
| `video-menu` | the ten choices a video makes, one item at a time, with the reason; writes only through `vkit menu --set`; options read with `vkit menu --explain` |
| `video-build` | making a video end to end, in order, with the rules that decide whether the footage is right |
| `video-frames` | rendering and judging frames after any change |
| `video-check` | running `vkit check`, reading the report by rule id, saying what to change and where |
| `video-measure` | turning voice clips into exact part lengths; what locks after |
| `brand-apply` | setting up or changing the brand a video carries, through `vkit brand` and `--check` |

The hook (`hooks/hooks.json`, `hooks/scripts/guard.py`, 21 cases in `test_guard.py`, run by `npm test`) runs before every shell command and blocks: a browser download; `git push --force`, `git reset --hard`, `git clean -f`, branch and repo deletion; `rm` outside temporary folders; a call to a paid API unless the command carries `--approved`. A blocked call says why and what to do instead. The hook fails open on its own errors.

Long `vkit` commands print a progress line: a bar that rewrites in place on a terminal, plain lines every few seconds in a pipe or a log, so a skill reading the output sees the step, the count and the time left. `VKIT_QUIET=1` turns it off.

`_suggested-trash/menu-items.md` is the typed list of menu items from the first draft, superseded by `vkit menu --explain`, kept until its removal is agreed.
