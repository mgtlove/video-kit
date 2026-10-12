---
name: app-model
description: >
  This skill should be used when the user asks "write the model", "what does the app do", "map the
  transitions", "make the practice copy", "build the twin", "serve the twin", "let me click through it",
  "why does the twin say not built", "write the path", "what does the sidekick say", "add the rules for
  the field", or when a video's storyboard has Action rows on an app whose model.json does not cover
  them. It writes or extends the app's behaviour as data (model.json, with each typed field's rules),
  writes the lesson's path for the sidekick (one file per lesson under paths/, in the lesson's words), proves both with
  vkit check and vkit twin, and turns what the twin cannot do into pickups.
metadata:
  version: "0.1.9"
---

# The app model and the practice copy

Runs in the director's chat (the one with the kit's repo). `docs/MODEL.md` is the shape; this is the procedure.

A recreated app is screens (states cited to captures), behaviour (`model.json`: which control on which state leads to which state, by a click, typing or a scroll, and what a typed field accepts) and paths (`paths/<name>.json`: what a lesson asks of a learner, in order, in the lesson's words). The engine performs a transition the same way for a video (`act(t, control)` on the clock) and for the practice copy (a learner's click), so behaviour is written once, in the app, and never into a video's timeline. The model and the paths are data the checker and the twin read, never a script.

## 1. Read what the app has

`apps/<family>/<tool>/manifest.csv` (the states, their screens, their captures; a row with a capture and no file is captured and not built) and each state's ids: `grep -o 'id="[^"]*"' apps/<family>/<tool>/states/*.html`. Read `model.json` if it exists; extend it, never rewrite it.

## 2. Write the transitions

One transition per cause and answer the captures show: `from` (a state), `control` (an id in that state), `action` (`click`, `type`, `scroll`), `to` (a state), a `note` citing the captures. A scroll has no control. Page change or change in place is never written (the manifest's screens say it); a scroll's direction is never written (the states' own positions say it). Two sources, in this order:
- The storyboard's Action and On screen columns of every video on the app (`click Create bucket` on `state buckets-empty` leading to `state create-top`): the path a lesson took.
- The capture walkthrough (`walkthrough.md`, `captures.csv`): every other cause and answer the captures hold, one layer out from the path (`docs/CAPTURE.md`).

Also: a typed field gets a transition to itself (the name typed again), its `fields` entry (the label as the screen spells it; `taken`, the values a capture showed refused; `rules`, what the field accepts: one line per rule as a `test` the value must match, the sentence `says` in the product's own words where the product prints the rule on screen and in ours otherwise, and its `source`, the capture that shows the sentence or the page it was read from with the date), and a `when: "taken"` transition where a capture shows the refusal. A control that was never captured is never in a transition; a rule with no source is not a rule. `start` is the state a learner begins on. `notice` holds the two sentences the practice copy shows (captured but unbuilt; outside).

## 2b. Write the path

`apps/<family>/<tool>/paths/<name>.json`, one per lesson, from the lesson's storyboard: `goal`, `steps` (each a `control` the model has a transition for, its `label` as the screen spells it, `do`, the instruction, always; `why` only when the lesson says something the instruction does not; `refused` on a typed field's step, the lesson's words for a value the captures showed refused; `fill` only when the value to type is not the typed state's own text), and `done`. The words are the lesson's (the storyboard's Sentence column), tightened, never invented; scrolling is said in the instruction, not a step. The sidekick shows all of it beside the screen and nothing on it.

## 3. Prove it

In a video on the app, `vkit app use <family>/<tool>` (the model travels into `rig/app/`), then `PW_CHANNEL=chrome vkit check --quick`: `model-states` (every state a transition names exists; one with no file is named as a pickup), `model-controls` (every control is an id in its state), `actions-in-model` (every state change the timeline made is a transition the model has). A video whose timeline still carries behaviour by hand (`pointer`, `click`, `openPage` in a row) is rewritten on `act` and `scrollPage` and its frames compared before and after: identical, or the difference named (`docs/ENGINE.md`, 0.6.0).

## 4. Serve the practice copy and walk the path

`vkit twin <family>/<tool> [--path name]` builds `apps/<family>/<tool>/twin/` (a build product; `vkit twin --build` writes it and stops; the build line names the path and counts its steps and the field rules) and serves it on localhost. It is a page in a practice browser with the sidekick beside it: the real address of each screen (from the captures), back and forward, the page scaled to the width it has and scrolling whole with the product's own bars pinned, a real input when a field is clicked; the sidekick walking the path (the step, why, a ring on the control, Fill it in for me, Show me, Start over). Walk the lesson's path by hand: click, type a name of your own, type a bad one (the sidekick says the rule it breaks and holds Create), type a taken one (the captured refusal, the sidekick's words for it), take the fill, scroll with the wheel, press Create, wander off the step (exploring, and the way back). The typed name must appear everywhere the lesson's did, the address included; a click the model has nothing for shows the notice; nothing opens the real product; nothing the sidekick says appears on the screen. Say in the delivery which path you walked and what you saw.

## 5. The version and the spokes

A model or a path changed is a change to the app: bump `app.json`'s version and write the `CHANGES.md` line in the same change, then `vkit app use --all family/tool` in the workspace folder brings every video on the app up and checks each, and `vkit twin family/tool --build` remakes the twin (`docs/MAINTENANCE.md`). `vkit status` says what is still behind.

## 6. What the twin cannot do is a pickup

A control a learner reaches for that shows "outside" is either a transition the captures hold and the model lacks (write it) or a screen never captured (a pickup: one line in the app's `capture-request.md`, captured one layer out, then a state, then a transition). "Captured, not built" is a state waiting for `video-recreate`. The model grows for every video and exercise after.

## What not to do

- Never invent a transition: both ends come from captures. Never a transition to a state the manifest does not have.
- Never put behaviour in a video's timeline, a skill or a script; the model is the one place and the checker reads it.
- Never restyle the recreated screen for the practice copy; the twin shows the app's own states. Never draw a hint, a message or a rule on the screen: the sidekick says it beside. The product's own message for a refused value is on the screen only when a capture shows it; otherwise it is a pickup.
- Never commit the built `twin/` folder as if it were the source; the source is `states/` and `model.json`.
