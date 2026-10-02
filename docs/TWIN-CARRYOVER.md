# Twin carryover: what the earlier twin work taught

A twin is a recreated app a learner can click through: the same states the videos used, with `flows.json` saying which click in which state shows which other state. This file holds what the earlier twin work taught, in its own words, so the runner (roadmap step 12) is not finished until it honours each point. Facts and lessons; no code, nothing copied. First pass written 2 October 2026 from the design note; Matthew's notes extend it.

## Source

- Captures with ids are the only source. Every state comes from a named screenshot with a date; nothing on a screen is invented, and a control that was never captured is never drawn. A learner notices a 2025 screen in a 2027 course, so the date is part of the state.
- The product's tokens (colours, faces, spacing) are measured from the real thing and scoped to the screen. They are never restyled by a brand or a look; the teaching layer restyles freely, the screen does not, because the learner has to recognise it later.

## Behaviour

- One generic notice for every unbuilt control. A click on anything that is not in `flows.json` shows the same short practice notice, never a broken page, never a guess. A twin with twenty live paths and one honest notice beats one that pretends to do everything.
- No dead links. Anything that looks clickable either does something in the twin or shows the notice. Nothing opens the real product, nothing 404s.
- An invented cast. Names, accounts, work items and data on the screens belong to made-up people and companies, so a twin can be shared without leaking anyone's real records, and so two courses can share an app without colliding.

## Quality

- Fidelity is judged against the capture, not against memory or taste: the state rendered at the capture's size beside the capture itself, with a similarity number to track the trend. The image is what a person judges; the number says whether a change made it better or worse.
- The twin and the videos share one app folder, so a fix to a state fixes both, and a state that passes the video's fidelity check is already the twin's.

## What a runner needs

- Load an app folder (`app.json`, `tokens.css`, `states/`) and `flows.json`; show one state at a time at native pixels; map clicks by element id; show the notice for everything else.
- Keep the app's own captures and tokens private with the app; the runner itself is generic and carries nothing of any product.
