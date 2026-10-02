# Research inventory: what video-reference holds

Moved in whole on 2 October 2026, with product and company names removed and paths pointed at `video-kit`. This is the inventory, so a session knows what is there without opening every folder; `video-reference/CATALOG.md` is the index.

## Creator studies (seven, one video each)

IBM Technology (lightboard), Fireship (The Code Report), AWS Developers (studio walkthrough), How Money Works (clippings), Casually Explained (doodle), Stephane Maarek (lecture slides), Ken Burns and PBS (archive camera). Each: a style note (voice, language, visuals, measured pacing), a shot-by-shot log with a relation code per cut (literal, illustration, evidence, pun, counterpoint, reaction, text, ident, demo, ambient, drawing, clipping, artefact, landscape, witness, map), a rhetoric map (the argument move by move, theses and subtext, a counted humour taxonomy, the word-and-picture mechanism), a measured audio note (loudness distribution, pauses, bed, timbre, loud and quiet lines), and a comparison table across all seven. Nothing of theirs copied: no frame, clip, logo or caption text.

Method, inside a browser tab, silently: frame differencing on a small canvas for cuts; montage sheets with the caption text under each shot; captions from the player's own text track; audio through a Web Audio graph ending in a gain of zero, sampled from the audio thread. Limits: pitch not measured; thumbnails cannot show thin slide text; one video per creator.

## Craft rules (96, six notes)

Composition (title safe 96/54 at 1080p, SMPTE ST 2046-1; action safe 67/38, EBU R95; caption band), camera (3 percent of frame height per second, 5 to 8 percent scale over a hold, reveal on the last word, text still while the evidence layer moves), colour (WCAG 4.5:1, 3:1, 7:1; three accents, 10 percent accent share; meaning never by colour alone; Okabe and Ito), typography (72 and 54 px floors, 42 characters a line, captions about 72 px), pacing (140 to 170 wpm; a still no longer than 8 s, 12 s formal; under five minutes; Guo, Kim and Rubin; Mayer; Cutting et al.), accessibility (three flashes a second; captions never cover what matters). Each rule numbered and sourced; the measurable ones in `rules.json` for the checker.

## Patterns (35 moves)

Cut on the last word; two channels; one literal noun; the highlighter on the cited line; build with the sentence; announce, do, explain; the camera is the reading; information holds, jokes cut; the exhibit screenshot; only structural text; the reset frame; the board resolves to one chain; a drawn figure over a real photo; the cut voice; loud question, quiet answer; silence before the biggest line; a music bed or none; three registers; the naive view then the overturn; define in the breath; questions, outline, checklist; the hard way on purpose; the hedge before the claim; attribution after the quote; the catalogue sentence; the fixed lines; the callback; mock, cite, admit, balance; the reversal definition; triplets; the worked example in the first person; the sponsor as a continuation; honest costs in the verdict; drift on every still; three framings. Each: where observed with times, the numbers, the effect, a required counter-example, what a rig would need; indexed by the phrase a person would use.

## Look packs (seven)

lightboard, code-report, studio-walkthrough, clippings, doodle, lecture-slides, archive-camera. One key set: ground, ink, paper, accents (at most three), type, strokes, entrance, camera, cut and hold seconds, text on frame, evidence, scene kinds, pacing (the creator's rate and our target), voice. A preview page rendering one scene of our own in every look, passing every check.

## Library studies (six)

anime.js (adopt, staged), Motion (second choice), three.js (kept ready; ES-module-only so bundled once), lottie-web (frame-exact; assets need their own licence rows), Web Animations seek (adopted into the engine), CSS 3D transforms (pattern). Each answers the same questions: seekable, deterministic, offline, token-driven, cost at 1080p, plain files. Licences recorded before anything is copied; GSAP kept out until its licence is read again.

## Not in the reference

The brand kit schema and the ten menu items are product, not research; their designs are in `project-brief.md` and `video-kit/menu-defaults.json`, and the plugin skill drafts in `video-kit/packages/plugin/`.

## Brand kit and menu (kept for the record)

The brand schema and the ten menu items are product, not research; their designs are in `project-brief.md` and `video-kit/menu-defaults.json`, and the plugin skill drafts in `video-kit/packages/plugin/`.
