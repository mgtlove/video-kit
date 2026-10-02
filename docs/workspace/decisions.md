# Decisions

One line each, with the reason, so they are not re-argued. Add to the end.

- 2026-10-01: Two repos, `video-kit` (product) and `video-reference` (research), side by side under `~/Developer/video/`, public, MIT; no org, no project board, no shared-tooling repo. For one person the shared rulebook moves inside the kit.
- 2026-10-01: Plain JavaScript, Node 18+, npm workspaces, no build step. Playwright with the installed Chrome (`PW_CHANNEL=chrome`); nothing downloads a browser.
- 2026-10-01: The command is `vkit` (was `vk` for a day). The page namespace stays `window.VK`.
- 2026-10-01: A video is a folder made by `vkit new`; the engine is copied in at its version (`rig/engine/VERSION`) so a video opens from disk and never changes under its owner. `vkit upgrade` moves it.
- 2026-10-01: Everything is a function in `packages/core`; the CLI, the plugin, the MCP server and any app are thin shells. Four adapters (voice, render, script, hosting), one file each, local implementations first.
- 2026-10-01: One layout: the screen at native pixels fills the frame, the explanation is a card that places itself beside the element it names, the camera is clamped to the frame and never under scale 1. The older inset-with-a-rail layout is not carried.
- 2026-10-01: Looks, patterns, rules and brands are data files made from the reference by `vkit sync-reference`; the menu reads them; no list is typed into a skill.
- 2026-10-02: The research moved into `video-reference` as it stood (seven creator studies with the deep pass, 96 craft rules, 35 patterns, seven look packs, six library studies, licences), with product and company names removed and paths pointed at `video-kit`; it is Matthew's own work, written with him, about public videos and standards. The earlier plan to rewrite it note by note was dropped as wasted effort.
- 2026-10-01: AWS enters as adapters (cloud render, Polly) when they earn their place; no app, database or auth before a non-terminal user exists.
- 2026-10-01: Matthew keeps working with the current chat until the product is more mature; a dedicated Claude project comes later, seeded from `claude/new-project-instructions.md`.
