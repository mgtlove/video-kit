# The engine: what a rig page can call

`rig/engine/rig.js` and `rig.css` are copied into a video by `vkit new` at the kit's version (`rig/engine/VERSION`, `video.json.engine`). Never edit them in a video; change the kit and run `vkit upgrade` (to come).

## The page supplies

- `PARTS`: `[seconds, ...]`, the exact length of each voice clip. `vkit measure` prints the line.
- `timeline()`: calls `at(t, fn)` once per beat; `t` is seconds from the start of the video, usually `P(i) + offset` where `P(i)` is the start of part `i`.
- `copy()` (optional): puts `COPY` strings into the markup; called once before the first reset.
- `doodles()` (optional, step 4): builds seeded strokes after fonts and copy are ready.
- Markup: `#fit > #stage > #cam` with the scenes and `#mock` inside `#cam`; `#card`, `#fade` inside `#stage`; `#hud`, `#ui > #panel` with `#title`, `#subtitle`, `#pre`, `#start`.
- Then `VK.boot()`.

## What the timeline can call

| Call | What it does |
|---|---|
| `scene(id)` or `scene(null)` | shows one `.scene`, hides the others (a crossfade) |
| `show(id)`, `show(id, true)` | adds or removes `.on` on an element (cards, rows, the mock) |
| `fade(true)` / `fade(false)` | clears the black or brings it back |
| `card(text, nearId, side)` / `card(null)` | the explanation card, placed beside the named element on the side with most room, inside title safe; `side` forces `right`, `left`, `below` or `above`; re-placed on every camera move |
| `focusAt(cx, cy, scale)` | centre the camera on a stage point; scale never under 1; clamped to the frame |
| `focusEl(id, scale, dx, dy)` | centre on an element, with an offset |
| `travel(id, scale, dx, dy)` | the same with a long, even ease (reads as a scroll) |
| `ease(sec)` | the duration of the next camera move only |
| `home()` | the whole frame at 1:1 |
| `pos(el)` | an element's box on the stage through the offset chain, unaffected by the camera |

## What the tools call

`VK.ready()`, `VK.total()`, `VK.parts()`, `VK.beats()`, `VK.seekTo(t)`, `VK.playTo(t, done)`, `VK.recording(true)`, `VK.version`.

## The contracts

- A frame at `t` equals playback at `t`. `seekTo` resets, snaps every beat older than the motion window (6 s), re-fires the rest with motion on and holds each animation they started at `t minus its beat time`. Proof in `packages/core/test/seek.test.js`.
- Motion is CSS transitions and animations only, started by a class change inside a beat. No timers, no `requestAnimationFrame` chains in a video, nothing that reads the wall clock.
- Beats are replayable from a reset: a beat sets state (a class, a camera position); it never accumulates.
- Keyframe animations fill forwards.
- Measure with `pos`, never `getBoundingClientRect`.
- Keys on the page: S or Space starts and pauses; 1 to 9 jump to a part; R restarts. Recording is only 1:1 on a 1920x1080 page; the start panel says the stage scale.
