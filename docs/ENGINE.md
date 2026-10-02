# The engine: what a rig page can call

`rig/engine/rig.js` and `rig.css` are copied into a video by `vkit new` at the kit's version (`rig/engine/VERSION`, `video.json.engine`). Never edit them in a video; change the kit and run `vkit upgrade` (to come).

## The page supplies

- `PARTS`: `[seconds, ...]`, the exact length of each voice clip. `vkit measure` prints the line.
- `timeline()`: calls `at(t, fn)` once per beat; `t` is seconds from the start of the video, usually `P(i) + offset` where `P(i)` is the start of part `i`. `at(t, fn, true)` marks a minor beat (one typed character): `VK.beats()` leaves it out, so `vkit frames` does not sample it.
- `copy()` (optional): puts `COPY` strings into the markup; called once before the first reset.
- `STATES` (optional, written by `vkit new --app` as `rig/app/states.js`): the recreated app's states, id to markup. With it present, `state(id)` fills `#mock` from it; without it, `#mock` holds the screen inline.
- Markup: `#fit > #stage > #cam` with the scenes and `#mock` inside `#cam`; `#card`, `#fade` inside `#stage`; `#hud`, `#ui > #panel` with `#title`, `#subtitle`, `#pre`, `#start`.
- Then `VK.boot()`.

## What the timeline can call

| Call | What it does |
|---|---|
| `scene(id)` or `scene(null)` | shows one `.scene`, hides the others (a crossfade) |
| `show(id)`, `show(id, true)` | adds or removes `.on` on an element (cards, rows) |
| `ink(kind, id, opts)` / `ink(null)` | a seeded hand-drawn stroke on element `id`, drawn on over `--stroke-draw`: `circle`, `frame`, `underline`, `arrow` (`opts.dx`, `opts.dy` place the tail). `opts.pad`, `opts.seed` (vary a repeat), `opts.keep` (leave earlier strokes). Geometry is seeded from kind and id, so a re-render is identical |
| `pointer(id, dx, dy, opts)` / `pointer(null)` | the cursor glides to element `id` (plus an offset) over `--pointer-glide`; `opts.jump` places it with no glide |
| `click()` | a ring grows and fades where the pointer is |
| `type(t, id, text, cps)` | registers one beat per character from `t` (12 a second by default), each setting the field's text to the prefix; the first is a real beat, the rest minor; returns when the last character lands. No animation, so seek-correct by construction |
| `who(name, pose, nearId, side)` / `who(null)` | a seeded stick figure beside an element (`left` or `right`), posed `point`, `think` or `wave`, facing the element. The mechanism; its drawing style belongs to a look (step 7) |
| `state(id)` / `state(null)` | the recreated screen: shows state `id` of the app in `#mock` (or the inline `#mock` when there is no app); `null` hides it. Not named `screen`: `window.screen` is the browser's display object |
| `fade(true)` / `fade(false)` | clears the black or brings it back |
| `card(text, nearId, side)` / `card(null)` | the explanation card, placed beside the named element on the side with most room, inside title safe; `side` forces `right`, `left`, `below` or `above`; re-placed on every camera move |
| `focusAt(cx, cy, scale)` | centre the camera on a stage point; scale never under 1; clamped to the frame |
| `focusEl(id, scale, dx, dy)` | centre on an element, with an offset |
| `travel(id, scale, dx, dy)` | the same with a long, even ease (reads as a scroll) |
| `ease(sec)` | the duration of the next camera move only |
| `home()` | the whole frame at 1:1 |
| `pos(el)` | an element's box on the stage through the offset chain, unaffected by the camera |

## Tokens the strokes, pointer and cast read

`--stroke`, `--stroke-width`, `--stroke-draw`; `--pointer`, `--pointer-edge`, `--pointer-ring`, `--pointer-glide`; `--cast-stroke`, `--cast-width`, `--cast-fill`. All in `theme.css` with fallbacks to the theme's highlight, so a look pack changes the whole layer by changing values. (`--ink` is the theme's text colour and stays so.)

## What the tools call

`VK.ready()`, `VK.total()`, `VK.parts()`, `VK.beats()`, `VK.seekTo(t)`, `VK.playTo(t, done)`, `VK.recording(true)`, `VK.version`.

The render adapter opens the page at 1920 by 1082: `#fit` centres the stage at rows 1 to 1080 and row 0 carries a 1 px marker strip the adapter adds, whose width it sets in the same task as a seek. A capture waits until a screenshot of row 0 shows that width, which proves the compositor has drawn the seek's commit, then takes rows 1 to 1080. A screenshot taken straight after a seek can be the frame before it.

## The contracts

- A frame at `t` equals playback at `t`. `seekTo` resets, snaps every beat older than the motion window (6 s), re-fires the rest with motion on and holds each animation they started at `t minus its beat time`. Proof in `packages/core/test/seek.test.js`.
- Playback runs on the same clock (engine 0.3.0). A beat fires on the first frame at or after its time, and Chrome starts a new transition on that frame or the next; so every animation a beat starts has its start time set to the beat's nominal time on the document timeline. Two animations in flight (a camera travel and a pointer glide) then share one time base, and a seek to the reached time reproduces both. Measured: 0 pixels at nine moments.
- A held transition already past its end is cancelled, not baked, so its class value shows and a later beat can change it (a figure that faded in can fade out). Known limit: two changes to the same property of one element inside its transition time seek as the first held.
- Strokes are built at beat time from `pos()`, after fonts and copy, with geometry seeded from kind and element id; a re-render is identical (`ink.test.js` renders the starter twice in two sessions and compares every still). Change the element, never the seed.
- A held transition is baked (engine 0.1.1). After holding, the engine reads the value the transition has at that time on the main thread, writes it inline with transitions off for one style flush, and cancels the transition; `playTo` does the same when it pauses. Left to the compositor, a held transition is drawn on the compositor's own clock, which steps about every 10 ms with a phase that differs between browser sessions, so the same still could differ by a few levels from one run to the next. Baked, a still is the main thread's exact value. Keyframe animations are held, not baked; a video that uses one should expect that difference until baking covers it.
- A reset never animates: it snaps while it clears classes and baked values, so nothing is in flight when the beats replay. It also puts `#mock` back to the markup the page loaded with, so a beat that changed a state (a highlight, a typed value) never leaks into an earlier frame.
- A state is markup and CSS only: no images, no fetches, no scripts. A frame has to be whole the instant it is sought, and a video opens from `file://`. Icons are inline SVG; a capture is never shown on the stage, it is what the state is checked against.
- `recording(true)` removes the start panel at once rather than fading it; its fade would sit over the first frames.
- Motion is CSS transitions and animations only, started by a class change inside a beat. No timers, no `requestAnimationFrame` chains in a video, nothing that reads the wall clock.
- Beats are replayable from a reset: a beat sets state (a class, a camera position); it never accumulates.
- Keyframe animations fill forwards.
- Measure with `pos`, never `getBoundingClientRect`.
- Keys on the page: S or Space starts and pauses; 1 to 9 jump to a part; R restarts. Recording is only 1:1 on a 1920x1080 page; the start panel says the stage scale.
