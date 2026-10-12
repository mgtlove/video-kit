# Twin carryover: what the earlier twin work taught

A twin is a recreated app a learner can click through: the same states the videos used, with `model.json` saying which click in which state shows which other state (the earlier plan called it `flows.json`) and `paths/<name>.json` saying what a lesson asks of the learner, in order. This file holds what the earlier twin work taught, in its own words, so the runner (milestone A, then G) is not finished until it honours each point. Facts and lessons; no code, nothing copied. First pass written 2 October 2026 from the design note; Matthew's notes extend it; the second pass, 12 October 2026, after a read of the earlier twin's write-up.

## Source

- Captures with ids are the only source. Every state comes from a named screenshot with a date; nothing on a screen is invented, and a control that was never captured is never drawn. A learner notices a 2025 screen in a 2027 course, so the date is part of the state.
- The product's tokens (colours, faces, spacing) are measured from the real thing and scoped to the screen. They are never restyled by a brand or a look; the teaching layer restyles freely, the screen does not, because the learner has to recognise it later.

## Behaviour

- One generic notice for every unbuilt control. A click on anything that is not in `flows.json` shows the same short practice notice, never a broken page, never a guess. A twin with twenty live paths and one honest notice beats one that pretends to do everything.
- No dead links. Anything that looks clickable either does something in the twin or shows the notice. Nothing opens the real product, nothing 404s.
- An invented cast. Names, accounts, work items and data on the screens belong to made-up people and companies, so a twin can be shared without leaking anyone's real records, and so two courses can share an app without colliding.

## The coaching

- Everything that teaches is outside the simulated screen, and looks it. The earlier twin kept its instructions in a panel beside the simulated browser, in the course's own face and an accent colour the product never used, so a learner could never take a hint for a feature. It learned this the hard way: an explanatory card drawn inside the simulated form, caught only by putting the capture beside the build. The rule that followed: nothing is added inside the simulated screen that a capture does not show; if something needs to feel important, say so in the panel.
- The panel has tiers: the field or control as the screen names it, a badge for what kind of step it is, the instruction (always, bold, short), and the why (only when it adds what the instruction does not, boxed and softer, absent otherwise). One paragraph doing both jobs read as a wall.
- A fill button fills one field per click, in the order the guidance walks, so the learner still meets each field's words. One click filling the whole form skipped the part worth having.
- A learner who clicks something that works but is not the step is exploring, not wrong: the panel changes register (amber, "here is what this is"), and the way back is named.
- A pointer or ring drawn on the control a learner should use next is ours and looks it (a colour the product lacks, a pulse); it rides with a pinned bar when the control is in one.
- The learning tools (start over, the fill) live in the panel with a line saying they are not the product; a button inside the simulated action bar that the product does not have is a lie about the product.
- The end of an exercise is marked plainly, even though the product shows nothing at that moment: the panel says done, in the lesson's words, with the way to go again.
- Scrolling inside the simulated screen must never scroll the page it is embedded in (an iframe's `scrollIntoView` and `focus` scroll the parent); scroll the container's own `scrollTop`, and `focus` with `preventScroll`. Not yet the case here (the twin is its own page), carried for the day it is embedded in a course.
- Keyboard users: a rebuild of a form must not drop focus to the body; a modal must trap focus and give it back; a field added dynamically needs its required mark and a live region. Carried for G.

## Quality

- Fidelity is judged against the capture, not against memory or taste: the state rendered at the capture's size beside the capture itself, with a similarity number to track the trend. The image is what a person judges; the number says whether a change made it better or worse.
- The twin and the videos share one app folder, so a fix to a state fixes both, and a state that passes the video's fidelity check is already the twin's.

## What a runner needs

- Load an app folder (`app.json`, `tokens.css`, `screen.css`, `states/`, `manifest.csv`, `crops/`, `faces/`), its model (`model.json`, `docs/MODEL.md`) and a path (`paths/<name>.json`); show one state at a time, the page scaled to the width it has and scrolling as a page; perform the model's transition for a click by element id; show the notice for everything else; coach from the path beside the screen.
- Keep the app's own captures and tokens private with the app; the runner itself is generic and carries nothing of any product.
