---
name: video-menu
description: >
  This skill should be used when the user starts a video, says "video menu", "set up the video",
  "what are my options", "change the layout", "change the look", "where is this video", "show me
  the choices", or wants to change any choice a video has made after the build has started. It
  walks the person through every choice a video makes, one numbered item at a time, with context,
  records the choices in video.json, applies them, and shows frames. It never builds a scene.
metadata:
  version: "0.0.1"
---

# The video menu

Every choice a video makes lives in `video.json` under `menu`, and this skill is the only way those choices are set or changed. The person is walked through the items with their hand held: each item says what the question is asking, why it matters, the options with one line of context each, which is the default and why, and what picking it will change. Nothing is chosen for them. The same menu opens at the start and at any point later.

The items and their full explanations are in `references/menu-items.md`. Read it before showing the menu; it is the script. The lists it offers come from data files in the kit (`looks/`, `patterns/index.json`, `brands/`, `menu-defaults.json`), never from this file. The commands behind the skill (step 7b): `vkit menu --show` prints the ten items as the video has them; `vkit menu --explain <item>` prints an item's question, reason and options from the data files; `vkit menu --set item=value` or `--set item.field=value` (`--note "..."` beside it) writes one answer and, for a look or a brand, applies it at once; a locked item is refused with its reason. Write through these, never by editing `video.json` by hand.

## How the menu looks

Open with the header line, then the list, every time:

```
my-video
full layout, brand none, house look, formal, 2 patterns, voice not measured

 1  Job            not set
 2  Sources        not set
 3  Layout         full (default)
 4  Brand          none (default)
 5  Look           house (default)
 6  Tone           formal (default)
 7  Patterns       announce-do-explain, build-with-the-sentence (default)
 8  Voice          clips per part; captions as a file; no music (default)
 9  Characters     off (default)
10  Fixed lines    opener and closer from COPY; card after the hook (default)
 ?  Explain an item before choosing (type ? and the number)
 0  Something the list does not cover (type it; it is recorded on the item)
 S  Show me: a frame of each scene kind with the choices so far
 D  Done for now
```

When the person picks a number, show that item on its own: what the question is asking in two or three sentences, why it matters for this video, the numbered options with a line of context each, the default marked with its reason, what choosing will write. Then wait. After the choice, say in one line what was written and changed, and come back to the menu with the header updated.

`?` and a number gives the longer explanation from the reference and, where one exists, the file behind it (a pattern note in `video-reference/styles/patterns/` if that repo is cloned beside the kit, else its link). `0` takes a typed answer, writes it as `note` on the item, and says so. `S` renders one frame per scene kind with the choices so far.

## Walking a new video

Items 1 to 10 in order, one item per message, never two questions at once. Items 3 to 10 are pre-filled from `menu-defaults.json` and marked `from: defaults`; say so, so the person changes only what is different about this video. Items 1 and 2 are this video's own. "Just use the defaults" applies them all and names the two that still need an answer. After item 10: `S`, the header, then hand to `video-build`.

## Jumping around later

With a `menu` block present: the header, the list, wait. Changing an item re-applies it and names the frames to look at again.

## Locks

Once `parts.part_seconds` is filled, items that would move a beat lock (item 1's length, item 8's route) with the reason and the way out (new clips, then `video-measure`). Brand, look, tone, layout and patterns stay open; layout and patterns still need every frame looked at.

## What gets written

- `video.json.menu`: per item `value`, `chosen_on`, `note`, `from`; every change also appends to `video.json.edits` (date, item, old, new).
- Item 3 writes the screen box in `rig/index.html` (one layout today; see the reference). Item 4 hands to `brand-apply`. Items 5 and 6 write tokens in `rig/theme.css`. Item 7 writes the `Patterns:` line in `storyboard.md`. Items 9 and 10 write `COPY`. Items 1, 2 and 8 write `video.json` only.
- `rig/engine/` is never written.

## Rules

- One item per message; explain before asking; never fill an item from the agent's own preference, only from the defaults file, and say so.
- Never run a build step from the menu; it writes choices and shows frames.
- Plain language, no em dashes.
