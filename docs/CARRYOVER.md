# Carryover: what the earlier work taught, so none of it is lost

The kit is rebuilt clean, not copied. This file lists what the rebuild has to honour, by concept, so a step is not finished until it does. Facts, numbers and lessons; no code.

## Contracts

- A still frame at any second equals playback at that second. Replay old beats snapped, re-fire in-flight beats with motion on, hold each animation at `t minus its beat time`; measured at 0 of 2,073,600 pixels different, about 4 ms a frame.
- Beats are replayable from a reset; animations fill forwards; no timers; nothing depends on wall-clock time.
- Measure positions through the offset chain, never the bounding rectangle, so the camera transform does not poison a measurement.
- Doodles are built after fonts are ready and after dynamic content is filled, or they measure the wrong size.
- Stroke geometry is seeded, so a re-render is identical; change the element, never the seed.
- A part is one voice clip, at most about 1000 characters, so it is cheap to regenerate; part lengths are the exact clip lengths (padding compounded into seconds of drift when parts were placed end to end).
- The page scales to the window; a take is only 1:1 when the page is 1920x1080, and the pre-flight line must say the scale.
- A deliberate decision: reduced-motion preferences are ignored by the rig, because the rig is footage, not a page a person uses.

## Layout and camera

- Two layouts: classic (screen inset beside a rail, a caption band kept clear) and full (screen at 1920x1080 at native pixels, concept text large, the explanation card placed beside the element it names, re-placed on every camera move; the camera keeps the subject above the caption line and never shows the stage at the screen's top or sides).
- Review finding that produced the full layout: text slides read as empty; the product screen read as three quarters of the frame.
- Camera over a still: about 3 percent of frame height per second, 5 to 8 percent scale over a hold, the reveal timed to the last word; only the evidence layer moves, text stays still.

## Craft numbers (sourced in video-reference/craft)

- Title safe 96 px sides, 54 px top and bottom at 1080p (SMPTE ST 2046-1); action safe 67/38 (EBU R95).
- Text floors 72 px for anything the narration depends on, 54 px minimum; 42 characters a line; captions about 72 px, white on black, bottom of the frame.
- Contrast 4.5:1 for text, 3:1 for strokes and large text, 7:1 for the strict level (WCAG); no flash faster than 3 a second; meaning never carried by colour alone.
- Accent share at most 10 percent of the frame; three accents at most.
- Narration 140 to 170 words a minute (most studied creators run 200 to 220 by cutting the gaps, not by speaking faster); a still without a build or a moving camera no longer than 8 s (12 s formal); videos under about five minutes.

## Brand and tokens

- Two scopes, never merged: the teaching layer (ours, restyles freely) and the recreated product screen (measured from the real thing, never restyled, because a learner has to recognise it).
- A brand is one folder: five colours, two faces, a mark and a banner with when (never, opener, close, both, always, watermark), where (a corner, inside title safe and above the caption band), size and opacity; applied through tokens with fallbacks so "no brand" renders identically.
- Build broadly, restrain per audience: capability stays in the rig; a formal audience gets less through tokens, copy and the timeline.

## Research shape (video-reference)

- Seven creator studies, each with a shot-by-shot log (relation codes: literal, illustration, evidence, pun, counterpoint, reaction, text, ident, demo, ambient, drawing, clipping, artefact, landscape, witness, map), a rhetoric map and measured audio (loudness distribution, pauses, bed, timbre); nothing of theirs copied; credited.
- 35 patterns, one file each: where observed with times, the numbers, the effect, a required counter-example, what a rig would need; indexed by the phrase a person would use.
- Seven look packs with one key set; six runnable library studies (anime.js, Motion, three.js, lottie-web, Web Animations seek, CSS 3D) with licences recorded.
- Method for studying a video inside a browser tab, silently: frame differencing on a small canvas for cuts, montage sheets with captions under each shot, a Web Audio graph ending in a gain of zero sampled from the audio thread.

## Process lessons

- Fetch and read the day's commits in sibling repos before building in a shared one; two people solved the same feedback within an hour once.
- Never delete; move aside and say so. Never download a browser by surprise. Never call a paid API without a recorded go-ahead. State failure modes before anything irreversible.
- Docs change in the same commit as the code; a change that only lives in code has not landed.
- A person judges the rig by looking at rendered frames, never by reading code.
- Verification before the next step: byte-compare frames before and after a change that should not change them.
- A proof that compares two outputs passes when both are wrong the same way: the seek proof matched playback at 0 pixels for four steps while no stroke drew in any rendered frame. Watching the finished video is a proof the suite cannot replace, and it goes on every step's landing.
- The order of operations on an earlier project was forced the wrong way round: the AI audio had to be generated first, and only then could the pacing be made exact and the visuals tweaked to it. Here the script is settled first, the narrator records, and the visuals are timed to the spoken word; the clips are the clock from the start.
- A session's sandbox is one disk shared by every branch of the conversation that uses it. When a message is edited or sent again, the earlier branch's file changes stay on disk while its words leave the context, so an agent can meet its own work as a stranger's (7 October 2026: the brief command and three skills, written and then rediscovered twenty minutes later). The check is the session transcript on disk, not memory; and nothing reaches the person's machine or GitHub until it has been read against the plan and proved like anything else.
- A command is proved by running the command, not only the function under it. `vkit brief` shipped green with a name the CLI did not have in scope (`pos` for `args`), because its test called `core.briefRequest` and the command line was never run; the first real run died on it (8 October 2026). A test for a command spawns `bin/vkit.js` at least once, the way the person will type it.
- A check that filters its input silently is a check that passes on the wrong thing. `storyboard-covered` read the storyboard through a reader that dropped every row in a part the rig did not have yet (the starter has three parts; the expert wrote four), so it passed on 11 of 15 rows and said 11 with no fail. Seen on the first real storyboard (8 October 2026). Coverage now reads every row, and `sentences-match` names the rows that sit in a part the rig lacks instead of losing them. A reader that skips rows must say what it skipped.
- Words copy; pictures do not. "All four boxes checked" went from the 6 October capture request into the manifest note, the expert's row and the director's sentence, each written from the one before, and was wrong in all four: the picture shows one control and four it governs, and the recreation, made from the picture, had it right all along. Every stage that writes a label a person reads checks it against the capture, and the fact check opens the pictures the rows cite (8 October 2026).
- Never assume a chat has a skill, or the current one. The skills reach a chat only as the uploaded `vkit` plugin on the account (claude.ai: Customize, Plugins, Upload a plugin); a chat started before an upload keeps the old version; a skill proposed from a chat may never have been saved; a cloud chat cannot run what needs the machine (the capture browser). On 8 October 2026 three chats and a person spent an afternoon on assumptions about who had which skill in which state. Before relying on a skill in another chat, have that chat list its skills and version; every kit change to a skill bumps `plugin.json` and says in the delivery whether a re-upload is due.
