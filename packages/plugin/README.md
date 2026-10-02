# vkit plugin

Skills that call `vkit` and explain the choices, plus a guardrail hook. Drafted 1 October 2026 alongside the engine; a skill becomes real when the command it calls lands (`docs/ROADMAP.md`); `vkit-start` and `video-frames` work today.

Install from a clone of `video-kit`:

```
/plugin marketplace add ./video-kit/packages/plugin       Claude Code
cd packages/plugin && zip -r ../../vkit.plugin . -x '*__pycache__*' -x '*.DS_Store'     the desktop app: open vkit.plugin
```

| Skill | When |
|---|---|
| `vkit-start` | the start of a session in the `video` folder: checks the install and the repos, prints where a video stands |
| `video-menu` | the ten choices a video makes, one item at a time, with context; at the start or any time later |
| `video-build` | making a video end to end, in order, with the rules that decide whether the footage is right |
| `video-frames` | rendering and judging frames after any change |
| `video-measure` | turning voice clips into exact part lengths |
| `brand-apply` | setting up or changing the brand a video carries |

The hook (`hooks/hooks.json`, `hooks/scripts/guard.py`, 21 cases in `test_guard.py`) runs before every shell command and blocks: a browser download; `git push --force`, `git reset --hard`, `git clean -f`, branch and repo deletion; `rm` outside temporary folders; a call to a paid API unless the command carries `--approved`. A blocked call says why and what to do instead. The hook fails open on its own errors.
