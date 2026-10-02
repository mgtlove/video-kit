# The menu items, in full

The script the `video-menu` skill reads from. For each item: what the question is asking, why it matters, the options with context, the default and its reason, what choosing writes. The menu shows the short form; `?` shows this. Where an item lists options from a data file, read the file when the menu opens.

---

## 1. Job

**What this asks.** What this video is for, in one sentence a viewer would recognise: what they can do after watching that they could not before. Then its kind, its length target, and who watches.

**Why it matters.** The kind decides which scene kinds the video has (a walkthrough is a screen and a pointer; a concept video is cards, diagrams, characters; mixed is both). The length decides how many parts the script has. The audience decides what is defined and what is assumed.

**Options.** Kind: `walkthrough`, `concept`, `mixed`. Length: under 2, under 4, under 6 minutes (over five, a subject becomes several videos). Audience: a phrase.

**Default.** None; this is the video's own. **Writes** `video.json.menu.job`.

---

## 2. Sources

**What this asks.** Which screenshots (with ids) and which document this video recreates, and what is still missing.

**Why it matters.** Nothing on a recreated screen is invented; every element cites a capture. A screen with no capture becomes a concept scene and a note of what to go and capture, or `vkit capture` fetches it from a browser (roadmap step 9).

**Options.** First the kind, read from `menu-defaults.json` `sources.kinds` (no screen; a one-off screen inline; a recreated app, named `family/tool`, found in `apps/`). Then free text: capture ids or a folder; the document's path; what is missing by screen, state and control.

**Default.** None; if the person does not know, the agent lists the capture folder and the apps it can find, and proposes. **Writes** `video.json.menu.sources` (`vkit new --app` already fills `kind` and `app`).

---

## 3. Layout

**What this asks.** How the frame is shared between the recreated screen and the words.

**Why it matters.** A screen at native pixels filling the frame reads as the real thing; an inset screen beside a rail of text read, in review, as three quarters of a frame with empty text slides.

**Options.** 1. `full` (default): the screen fills 1920x1080 at native pixels; concept text is large; the explanation is a card placed beside the element it names; the camera keeps the subject in frame and never scales under 1. This is the only layout the engine carries today; a second one is added only if a video needs it.

**Default.** `full`. **Writes** the screen box in `rig/index.html`; `video.json.menu.layout`.

---

## 4. Brand

**What this asks.** Whose identity the video carries around the screen: colours, faces, a mark and a banner, and when and where they show.

**Why it matters.** A brand applied through `rig/brand/brand.json` changes every video on it with one file and never touches the product screen; a logo pasted into a rig is a one-off nobody can update.

**Options.** 1. A brand from the kit's `brands/` (list the folder). 2. A new one: hex codes and files, attached or typed; anything unknown stays empty. 3. `none` (default): the theme defaults. Then for any brand: where the mark shows (never, opener, close, both, always, watermark; which corner; discreet or a statement; solid or translucent) and whether there is a banner (opener, close, both; a strip or the whole frame).

**Default.** `none`; once a brand exists, that brand with the mark at the close, bottom right, discreet, no banner. **Writes** hands to `brand-apply`; `video.json.menu.brand`.

---

## 5. Look

**What this asks.** The visual grammar of the teaching layer: ground, ink, how things enter, how the camera behaves, what text sits on the frame.

**Why it matters.** A look is the difference between a chalk whiteboard and a clean slide, set once with tokens rather than redrawn per scene. The looks come from studied creators and borrow grammar, never anyone's marks or material.

**Options.** `house` (default): modern whiteboard, marker on charcoal; what the starter ships. Then whatever `looks/` holds (lightboard, code-report, studio-walkthrough, clippings, doodle, lecture-slides, archive-camera once `vkit sync-reference` has made them), one line each from the file's own description. Picking one maps its tokens onto `rig/theme.css` (ground to `--stage`, ink to `--ink`, accents in order to `--accent` and the card colours, stroke width, grain) and renders a frame of each scene kind to show.

**Default.** `house`. **Writes** tokens in `rig/theme.css` with a comment naming the look and the date; `video.json.menu.look`.

---

## 6. Tone

**What this asks.** How much the rig is allowed to do: full, or restrained for a formal audience.

**Why it matters.** The rig can do more than a formal viewer wants to see. Restraint is a setting, not a deletion: capability stays; the audience that wants less gets less through tokens, `COPY` and the timeline.

**Options.** 1. `formal` (default): one accent, no grain, finer strokes, cuts rather than glides, longer holds, no characters unless item 9 says so. 2. `full`: grain, marker weight, staggers and glides, characters allowed.

**Default.** `formal`. **Writes** `--grain`, `--stroke-w` and the accent tokens; a note in `storyboard.md`; `video.json.menu.tone`.

---

## 7. Patterns

**What this asks.** Which named moves this video uses, per scene kind, from the pattern language.

**Why it matters.** A pattern is a move someone has measured working: where it was seen, the numbers, what it does to a viewer, where it fails. Naming the moves up front means every beat can cite one, and a reviewer can ask "which move is this" and get an answer.

**Options.** Read `patterns/index.json`; offer three or four per scene kind the video has, each with its phrase and one line of effect, and `0` for any other by name. Walkthrough: announce-do-explain, highlighter-on-the-cited-line, information-holds-jokes-cut, only-structural-text. Concept: build-with-the-sentence, cut-on-the-last-word, naive-view-then-overturn, define-in-the-breath, triplets. Diagram: board-resolves-to-one-chain, camera-is-the-reading. Openers and closers: questions-then-outline-then-checklist, fixed-lines, callback, honest-costs-in-the-verdict. Voice: loud-question-quiet-answer, silence-for-the-biggest-line.

**Default.** From `menu-defaults.json` by kind. Three to five is the useful range. **Writes** the `Patterns:` line in `storyboard.md`; `video.json.menu.patterns`.

---

## 8. Voice

**What this asks.** Where the voice comes from, how captions are made, whether there is music.

**Why it matters.** The clips are the clock, so the route must return files that can be measured, and it is chosen before any script is read aloud. Music changes what silence can do: a bed makes a pause impossible; none makes a pause a device.

**Options.** Route: `clips` (default; generated by a provider through the voice adapter, or a person's recording, one file per part), or a provider by name. Captions: `sidecar` (default; a file made from the script timings) or `burned` (drawn into the frames by the renderer). Music: `none` (default) or `bed` (a quiet bed under the voice, applied at mux).

**Default.** clips, sidecar, none. **Writes** `video.json.voice`, `video.json.menu.voice`. Locked once the clips are measured.

---

## 9. Characters

**What this asks.** Whether drawn figures appear in concept scenes, and which invented cast.

**Why it matters.** Characters give a concept scene people without a presenter; a formal audience may find them informal. They never sit on a recreated screen. No real person is drawn or named.

**Options.** 1. `off` (default for formal). 2. `on`: figures from the starter's character set, named from an invented cast reused across videos.

**Default.** `off` when the tone is formal, `on` when full. **Writes** `COPY.people`; `video.json.menu.characters`.

---

## 10. Fixed lines

**What this asks.** The lines every video in a series says in the same place: the opener, the closer, and where the series card sits.

**Why it matters.** A fixed line at a fixed place is the series' signature; the viewer knows the video has started properly and has ended, and the series name is carried without a logo.

**Options.** Free text for the opener and closer, with the starter's offered; the card: 1. after the opening hook (default), 2. first, 3. none.

**Default.** The starter's lines; the card after the hook, because a card before the hook delays the reason to watch. **Writes** `COPY`; `video.json.menu.fixed_lines`.

---

## The header line

Built from the menu block every time the menu opens: the video name; then layout, brand, look, tone, the pattern count, and the voice state (`not measured`, `measured on <date>`, `rendered`, `published`).

## The defaults file

`menu-defaults.json` at the kit root holds the house answer for items 3 to 10 with a reason each. The menu pre-fills from it and marks each item `from: defaults` until confirmed or changed. Changing the house answer is a change to that file, committed with the reason.
