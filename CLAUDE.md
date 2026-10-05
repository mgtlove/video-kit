# video-kit: rules for an agent working here

Read `docs/ARCHITECTURE.md`, then `docs/ROADMAP.md`, then `docs/CARRYOVER.md`. The last one is the list of things a step is not finished without.

- Logic lives in `packages/core` only. A shell (CLI, plugin, MCP, app) calls core functions and prints; it never carries logic another shell would need.
- Every step lands with its proof: rendered frames compared byte for byte, or a check that passes. Say which. A fault seen in frames that no check measures goes into `docs/FINDINGS.md` until it is fixed.
- A frame at t equals playback at t. Measure through the offset chain. Build doodles after fonts and content. Seed every stroke.
- Tokens, never colour literals. The recreated product screen is never restyled.
- Recreate from your own captures, cite each, never invent a control. A screen with no capture is a concept scene.
- Looks, patterns, rules and brands are data files; the menu reads them; never type a list into a skill.
- Docs change in the same commit as the code: README, this file, `docs/`.
- Never delete anything; move it aside and say so. Never download a browser without being asked. Never call a paid service without a recorded go-ahead. State failure modes before anything irreversible.
- Nothing from any employer's or client's repository is copied here. Facts and lessons are carried in `docs/CARRYOVER.md` in their own words.
- Plain language, no em dashes.
