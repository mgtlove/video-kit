---
name: video-menu
description: >
  This skill should be used when the user starts a video, says "video menu", "set up the video",
  "what look should this be", "change the brand", "which patterns", "use the defaults", or wants to
  see or change any choice a video has made. It walks the ten choices one at a time, with the
  reason behind each, and writes them only through vkit menu.
metadata:
  version: "0.1.4"
---

# The video menu

Every choice a video makes lives in `video.json` under `menu`, and `vkit menu` is the one way those choices are set or changed. The person is walked through the items with their hand held: each item says what the question is asking, why it matters, the options with a line of context each, which is the default and why, and what picking it will change. Nothing is chosen for them.

The items, their words and their fixed options live in `menu-defaults.json`; the lists that grow come from the data files (`looks/index.json`, `brands/`, `patterns/index.json`, the apps folders). Never type an option into this skill or into a message from memory: read it from the command.

## The commands

- `vkit menu --show` prints the ten items as the video has them, each with where its answer came from (`defaults`, `chosen`, or not chosen), the date, a note, and `LOCKED` with the reason when `vkit measure` has locked it.
- `vkit menu --explain <item>` prints the item's question, its reason, and every option with its meaning, read from the data files. Items: `job`, `sources`, `layout`, `brand`, `look`, `tone`, `patterns`, `voice`, `characters`, `fixed_lines`.
- `vkit menu --set item=value` writes one answer; `--set item.field=value` for an item with fields (`job.kind`, `sources.app`, `voice.captions`, `patterns.concept=a,b`); `--note "..."` beside it records why. A value outside the options is refused by name. Choosing a look runs `vkit look`, choosing a brand runs `vkit brand`, at once.
- `vkit menu` with no flags walks the items in the person's own terminal; from a chat, drive the same walk with `--show`, `--explain` and `--set`.

## Walking a new video

Open with `vkit menu --show` and say in one line what is set and what is not. Then items 1 to 10 in order, one item per message, never two questions at once: run `--explain` for the item, put its question, reason and options in front of the person in plain words, mark the default and say why it is the default. Wait. Write the answer with `--set`, read what the command printed (it says what ran), and say in one line what changed. Items 3 to 10 start from `menu-defaults.json` and are marked `defaults`; say so, so the person changes only what is different about this video. Items 1 and 2 are this video's own. "Just use the defaults" keeps items 3 to 10 and asks the two that still need an answer.

`?` from the person means a longer explanation: the reason from `--explain`, and for a pattern the note in `video-reference/styles/patterns/` when that repo sits beside the kit. `0` means a value the list does not cover: for a free field (`job.length`, `job.audience`, `sources.ids`) write it; for a fixed list say what the options are and record what they said with `--note`. `S` means show me: `PW_CHANNEL=chrome vkit frames` and the `video-frames` skill.

## Coming back later

`vkit menu --show`, then wait for what they want to change. After a look or brand change, render frames and look; a look that fails `vkit check --quick` is a finding about the pack, raise it.

## Locks

`vkit measure` locks look, tone, patterns and voice, because each would re-time the video; `--show` marks them and `--set` refuses a change with the reason. The way out is the person's: unlock in `video.json.menu.<item>` on purpose, then new clips and `video-measure`. Brand, layout, characters and fixed lines stay open.

## Rules

- Never fill an item from the agent's own preference; only from the defaults, and say so.
- Never edit `video.json` by hand to change a choice; `vkit menu --set` is the door.
- Never run a build step from the menu; it writes choices and shows frames.
- Plain language, no em dashes.
