---
name: video-recreate
description: >
  This skill should be used when the user asks "recreate the screen", "build the states from the
  captures", "make the app from these screenshots", "how close is the recreation", "crop the logo",
  "make the font", or has a captures/ folder and wants the app folder's states written. It turns a
  capture set into measured states in apps/<family>/<tool>/, with the pictures copied from the
  captures, the face traced from the page, and a fidelity ledger of what is true, substituted,
  invented or missing.
metadata:
  version: "0.1.0"
---

# Recreating a screen from its captures

The method is `docs/RECREATE.md` in the kit; this is the order of work. The rule throughout: every value is read from a capture and cited, every picture is a copy of the capture's own pixels, nothing is restyled, and what could not be read is written down. A screen with no capture is a concept scene, not a recreation.

## 1. Read the captures

Open every picture in `captures/` with the Read tool at full size, and the values file beside each (`CAP-NNN.json`: computed colours, sizes, weights, the faces loaded, what moved). Note the layouts (navigation open or closed, a scrolled page, a message pushing the page down) and which captures are the same page in a different state.

## 2. Tokens with sources

Write `tokens.css`: every colour as a `--p-*` variable scoped to `#mock`, each with a comment naming the capture and the sample point. Read a text colour from the darkest three percent of its region, a ground from one pixel in a flat area. The face stack names the product's face first (step 4) and falls back to the system's.

## 3. Pictures out of the captures

For each logo, icon, caret, chevron and mark: `vkit app crop family/tool CAP-NNN <name> --at x,y,w,h` in the picture's own pixels (twice the CSS px on a 2x capture); `--replace` to redo one. The capture is untouched; `crops/crops.csv` records the region. Logos stay in: the video is a screen recording in stills. Text is never cropped; it is typed.

## 4. The face

With the capture browser on a page of the product (`vkit shoot start`, `go <url>`, signed in as the walkthrough skill says), run `vkit face <name> --family "<the family from the values file>" --weights 400,500,700 --into apps/<family>/<tool>`. Read the compare it prints (width error, shapes and tone against the original); under 0.2 percent width and 2 percent shapes is true to the eye. `tokens.css` imports `faces/<name>.css`. Nothing is read from the product's font file; the provenance note says so.

## 5. States by measurement

Scan the capture for rows and columns of colour runs and for the ink bands of text; place every box by number, text by the top of its ink (a 14 px line's ink is 5.5 below its box, 12 px is 4, 18 px is 3.5, 24 px is 5.5). Write the shared parts once (bars, navigation, cards, toolbars, table heads, empty states) and each state as a call with its values; a scrolled page is one tall element moved by the state's scroll; right-anchored things are placed from the right. Anything that follows a text (an Info after a heading, the rule and Info after a label, the arrow after a link, a caret after a label, the next crumb after a chevron, a pill after a tab) runs inline after it with the measured gap, never at a measured x: with a fallback face the text is wider and the thing would sit on it; with the true face the gap lands it where the capture has it. Prefix every class with the app's name so none meets an engine class. One fragment per captured state in `states/`, one row each in `manifest.csv` citing its capture and naming anything invented.

## 6. Compare and look

Make a test video with `vkit new <name> --app family/tool` and run `vkit check --quick`. Read the `fidelity` rows: `state:<id>:overlaps` (text over text or over a picture), `state:<id>:overflow` (a line past its box) and `faces` (the product's face not available) must pass; the similarity is reported. Open every `out/fidelity/<state>.png` side by side. Zoom where they differ and scan again; fix with a measured number, never a nudge by eye. Bands first, then pictures, then colours and weights, then text by ink. When only glyphs differ, the face is what is left. The `beats-on-screen` row will fail on a test video until its timeline names the app's own ids; that is the row's job.

## 7. The ledger

Write `fidelity.md` in the app folder: the face; every token; the geometry per part; every crop and its source; every text value as true, substituted, invented or missing (a masked account label and a user name are invented stand-ins; a real timestamp is invented); the behaviours the states show; the behaviours no capture shows yet, which wait for their own capture. Name the next session's masks there so they are not forgotten.

## What not to do

Do not restyle, round a measured half pixel, type a value from memory of the product, invent a control or a menu, copy anything from the product's files or any employer's repository, or edit a capture. Do not judge a state by reading its code; judge it by the frames beside the capture.
