# video: rules for an agent working in this folder

Read `README.md` here, then `claude/START-HERE.md`. Each repo has its own `CLAUDE.md` with the rules that apply inside it; those win inside that repo.

Standing rules, in every repo and in this folder:

- Never delete anything. Move it into `_suggested-trash/` beside it and say what moved. Ask before any deletion, per item.
- Never download a browser. Frames and tests use the Chrome already installed (`PW_CHANNEL=chrome`).
- Never call a paid service (voice, hosting, a model) without a recorded go-ahead in the conversation.
- State failure modes before anything irreversible; verify after every step before the next.
- Every step lands with its proof: rendered frames compared, or a check that passes. A rig is judged by looking at frames, never by reading code.
- Docs change in the same commit as the code: README, the repo's `CLAUDE.md`, `docs/`. A change that only lives in code has not landed.
- Fetch before building; read the day's commits in the sibling repo.
- Nothing is copied from any employer's or client's repository. Facts and lessons are carried in `video-kit/docs/CARRYOVER.md` in their own words; research is rewritten from its sources, credited.
- Plain language, no em dashes, no mention of how the work was made in anything a viewer or a hiring manager reads.
- Git: propose the commands; Matthew runs them unless he says this session may.
