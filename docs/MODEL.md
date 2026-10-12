# The app model: what a recreated tool does

A recreated app (`docs/RECREATE.md`) is the tool's screens: states cited to captures, the tokens, the pictures, the face, the ledger. The model is the tool's behaviour: which control on which state leads to which other state, by a click, by typing, or by a scroll, and what a typed field accepts. It is one data file in the app folder, `model.json`, written by the director from the captures and the storyboard's Action column, and read by three things: the engine (`act()` performs a transition the same way for a video and for a twin), the checker (every transition leads to a state the app has; every transition a video takes is one the model has), and the twin runner (`vkit twin`, a learner's hand on the same model, with the sidekick beside it walking a path, the third data file: `paths/<name>.json`).

Decided 11 October 2026 (`claude/decisions.md`): behaviour lives in the app, mechanics live in the engine, and a video or a twin only walks a path. Before this, the S3 video's timeline carried the behaviour by hand (`pointer('btn-create'); click(); openPage(t, 'create-top')`), so the next video would have written it again and the twin could not read it at all.

## The file

`apps/<family>/<tool>/model.json`:

```
{
  "app": "aws/s3", "model": 1, "written_on": "2026-10-11",
  "start": "buckets-empty",
  "fields": { "bucket-name": { "label": "Bucket name", "taken": ["data"],
    "rules": [ { "test": "^.{3,63}$", "says": "Bucket names must be 3 to 63 characters.", "source": "the help text under the field, CAP-002" } ] } },
  "transitions": [
    { "from": "buckets-empty", "control": "btn-create", "action": "click", "to": "create-top" },
    { "from": "create-top", "control": "bucket-name", "action": "type", "to": "create-named" },
    { "from": "create-named", "action": "scroll", "to": "create-access" },
    { "from": "create-bottom", "control": "btn-create-form", "action": "click", "to": "bucket-created" },
    { "from": "create-bottom", "control": "btn-create-form", "action": "click", "to": "create-name-taken", "when": "taken" }
  ],
  "notice": { "unbuilt": "...", "outside": "..." }
}
```

- **A transition** is `from` (a state id in `manifest.csv`), `control` (an element id in that state), `action` (`click`, `type` or `scroll`) and `to` (a state id). A `scroll` has no control: the page itself moves, and the direction is read from the two states' own `data-scrolls` positions. A `note` cites the captures.
- **Page change or change in place** is never written: the manifest's screen column says it. Two states of one screen morph in place (a scroll, a typed name, a tab); two screens are a page change with the load between (`docs/ENGINE.md`, `openPage`).
- **`type`**: the text is the `to` state's own text in that field (the lesson's value, `training-demo-bucket-01`); the engine types it character by character in a video and takes the learner's own in a twin, carrying it into every later state where the lesson's value appears.
- **`when`**: a transition taken only under a condition. `taken` means the field's value is in the field's `taken` list (the names the capture showed refused). A video chooses it by saying so (`act(t, control, { when: 'taken' })`); a twin chooses it by what the learner typed.
- **`fields`**: per typed field, its label as the screen spells it and what the captures proved about its values. A typed field also gets a transition to itself (the name typed again over itself), so a learner can retype.
- **`rules`** (under a field): what the field accepts, one rule per line as `test` (a regular expression the value must match), `says` (the sentence a learner is told, in the product's own words where the product states the rule on screen, else ours) and `source` (the capture that shows the sentence, or the page it was read from, with the date). A twin checks a typed value against them in order and says the first rule it breaks, beside the screen, never on it: the product's own message for a broken rule is on the screen only when a capture shows it (S3: the taken-name refusal is captured, CAP-009; a badly formed name refused is not, pickups CAP-018 and CAP-019 in the app's `capture-request.md`).
- **`notice`**: the two sentences a twin shows for a click the model has nothing for: `unbuilt` when the manifest cites a capture and has no file for the state it would lead to, `outside` when there is nothing. The notice is a pickup list, not a dead end.
- **Nothing in the model is invented.** A transition is written only when a capture shows both ends; a control that was never captured is never drawn, so it can never be in a transition.

## What reads it

- **The engine** (`window.MODEL`, written beside `STATES` by `vkit app use` as `rig/app/states.js`). `act(t, control, opts)` in a video's timeline: at `t` the control is pressed (the pointer is wherever the author put it; the press lands on the control), and the transition the model has for the current state and that control follows: a new page through `openPage` 0.6 s later, a change in place through `state()` 0.5 s later (`opts.after` moves it, `opts.ease` sets the scroll's ease), typing through `typeTo` 0.5 s later. A scroll is still `ease(sec); state(to)`, because the author sets its pace. Every state change, by `act` or by `state()`, is recorded in `VK.acts()` with the state it came from, so the checker can hold the timeline to the model. A twin calls `VK.perform(control, { when })` on a real click, the same code on real time: the press without a pointer, the load, the morph.
- **The checker**: `model-states` (every `from` and `to` is a state the manifest has; one with a capture and no file is named as a pickup, not failed), `model-controls` (every `control` is an id in its `from` state), `actions-in-model` (every state change the video made is a transition the model has; the first state and a concept scene are exempt).
- **The twin** (`vkit twin family/tool [--path name]`, `packages/core/twin/`): the runner page over the same engine, states, model and path, built into the app's `twin/` folder (a build product) and served on localhost. Two things sit on a dark stage, and both are plainly not the product: the practice browser and the sidekick.
  - **The practice browser** frames the page: back, forward, the page's real address from the capture it cites in a field that cannot be typed in, "Practice copy of ..., not the product". The page is scaled to the width the browser has at 100 percent (CSS zoom, a layout scale) and shown at its full captured height, so the browser's own scrollbar (always shown) and wheel scroll it; under the browser's own zoom the page keeps that scale, so it grows with the zoom and scrolls sideways as a fixed-width page does (fit to the zoomed width instead and zooming in shrank the page, since the sidekick kept its pixels; the zoom is read as the window's screen width over its CSS width); and the product's own top bars and footer stay where the real page keeps them, by `position: sticky`, moved by the compositor in the scroll's own frame with no script (a bar moved from a scroll event is a frame late and shimmers; the captured scrollbar thumb is hidden; a page shorter than the browser fills it so the footer sits at the bottom). The scrolled states of one page are one page here, so a control is found from any of them and the model's scroll transitions are not used. A click on a control the model answers performs its transition with the press, the load and the morph; a click on anything else shows the notice; a click on a typed field drops a real text input onto it, matching the field's own box, with no ring of its own (the focus look is the state's, from its capture); Enter or clicking away keeps the learner's text, Escape puts it back, nothing typed leaves the field empty and forces no name; the text then appears wherever the lesson's value did, in the page and in the address. A value that breaks one of the field's rules stays in the field, the sidekick says the rule, and a click that would submit it is held until the value passes; a value in the field's `taken` list takes the `when: "taken"` transition the captures showed. Back and forward walk the pages visited; R or Start over begins again. Addresses come from each state's capture (`CAP-NNN.json`, swept like a shot: a 12-digit number leaves the address out), else from `model.urls`.
  - **The sidekick** stands beside the browser (340 px, closable, violet because the consoles this kit recreates use orange and blue for their own controls) and walks the path (`paths/<name>.json`, below): the goal and "Step n of N"; the step's control as the screen names it, a Click or Type badge, what to do, and an optional Why, all in the lesson's own words; a pulsing ring around the step's control (the kit's, drawn outside the control; inside a pinned bar it rides with the bar); **Fill it in for me** on a typed field, one field per click, typing the lesson's own value (the typed state's text, or the step's `fill`) so a learner who takes the fill still meets every step's words; **Show me**, which scrolls the control to the middle; **Start over**; the sentence "Practice aids. Not the product." A click the model answers that is not the step is "Exploring" (amber): what was clicked, and the step still to do; a click on a later step skips to it and the skipped steps are named; a step whose control is on another screen is "Off the path", with the first control to click to get back (a breadth-first walk of the model's clicks); a value the captures showed refused is "Refused", in the field's step's `refused` words; the last step landing is "Done", in the path's `done` words. Everything the sidekick says is beside the simulated screen, never on it (the lesson the earlier twin work taught, `docs/TWIN-CARRYOVER.md`).
  - Proof `twin.test.js` on the test app in a 1200 px window (the bars measured in the first frame after a scroll; the input's box against the field's; a bad value said, held and emptied; filled in; refused; exploring; done; the sidekick closed and opened); the S3 copy walked by script at 1440 px (12 October 2026: a name with capitals refused by the rule, the taken name refused by CAP-009, my-first-bucket created and listed) and by the producer's own hand.

## A path

A path is an ordered walk through the model: creating a bucket is click `btn-create`, type `bucket-name`, scroll, scroll, click `btn-create-form`, click `tab-objects`, click `crumb-buckets`. The storyboard's Action column is a path in words; a video is a path with a voice and the teaching layer over it; a twin exercise is the same path with a learner's hand and a goal. One model, many paths: a second video on the same tool is a new path plus the pickups for any state the model lacks, and those pickups grow the model for everything after.

### A path as data

`apps/<family>/<tool>/paths/<name>.json` is a path the sidekick can walk, written by the director from a lesson's storyboard in the lesson's own words (the S3 one, `paths/create-bucket.json`, from `videos/create-s3-bucket/storyboard.md`):

```
{
  "path": "create-bucket", "app": "aws/s3", "goal": "Create a bucket", "written_on": "2026-10-12",
  "steps": [
    { "control": "btn-create", "label": "Create bucket", "do": "Click Create bucket, up top on the right.", "why": "..." },
    { "control": "bucket-name", "label": "Bucket name", "do": "Click the Bucket name field and type a name of your own.", "why": "...", "refused": "Somebody already has that name. ..." },
    { "control": "btn-create-form", "label": "Create bucket", "do": "Scroll to the bottom of the form and click Create bucket.", "why": "..." }
  ],
  "done": "The bucket is made and listed. ..."
}
```

- **A step** is a `control` the model has a transition for (the build refuses a step on a control no transition names), its `label` as the screen spells it, `do` (the instruction, always), `why` (optional: only when the lesson says something the instruction does not), `fill` (optional: the value Fill it in for me types; the typed state's own text otherwise) and `refused` (optional, on a typed field's step: the lesson's words when the value is one the captures showed refused). Scrolling is not a step: the instruction says to scroll, and Show me does it.
- **`goal`** heads the sidekick; **`done`** is said when the last step lands.
- **One path per lesson, as many as the app has lessons.** `vkit twin --path name` picks one; the first by name otherwise; an app with no `paths/` gets a sidekick with no steps. The build line names the path, its step count and the others.
- **Not on the screen.** Nothing in a path is drawn on the simulated screen; the sidekick says it beside. The screen stays what the captures show.

## Writing a model

1. Read `manifest.csv`: the states and their screens. Read the states' ids (`grep -o 'id="[^"]*"'`).
2. For each capture pair that shows a cause and its answer, one transition. The storyboard's Action and On screen columns of any video on the app list the ones a lesson used; the capture walkthrough lists the rest.
3. `vkit check` on a video of the app proves `model-states` and `model-controls`; `vkit twin` and a hand prove the paths.
4. What the twin cannot do is the next capture request: a control the learner reached for with no transition is a pickup, captured one layer out (`docs/CAPTURE.md`).

## Not in the model

The teaching layer (camera, notes, strokes, voice timing) belongs to a video. The words a control shows are in the state's own markup, never repeated here. The order a lesson takes is a path, in the storyboard and in `paths/`, not in the model. A script per app (`make-states.js` generates the S3 states) is a build tool and not a model; the model is data the checker can read.
