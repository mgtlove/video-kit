---
name: video-capture
description: >
  This skill should be used when the user asks "what do I need to capture", "how do I get
  screenshots for this video", "here's the walkthrough", "read the captures", "turn this document
  into captures", or hands over a Word document of a task. It sends the capture brief to whoever
  will capture, runs vkit capture on what comes back, and reads every picture before any screen is
  recreated. When the tool is reachable in a browser on this machine, capture-walkthrough shoots
  instead.
metadata:
  version: "0.1.2"
---

# Captures from a walkthrough document

The evidence for a recreated screen arrives one of two ways, and both land in the same `captures/` folder. When the tool can be reached in a browser on this machine, the `capture-walkthrough` skill drives the kit's own capture browser and `vkit shoot` writes the set; that is the first choice. When only another person or chat has the screen, they send one Word document (a heading per step, a line saying what was done, the screenshot under it, a note for what a still cannot carry) and this skill reads it in with `vkit capture`. `docs/CAPTURE.md` in the kit is the brief that asks for the document, the same for a one-off screen built inline in a video and a tool recreated as an app. Nobody invents a screen; a screen with no capture is a concept scene.

## Asking for captures

When the screens have not been captured yet, send `docs/CAPTURE.md` whole to the person or the chat that has access to the tool, with one addition at the top: the list of screens this video needs, in the order the task goes, each as a one-line step. Do not shorten the brief or retype its rules from memory; read the file and pass it on. Say which account or environment to use if the person has named one, and repeat the line about nothing private on screen.

## Reading what comes back

1. Run `vkit capture <walkthrough.docx> --into <folder>`: the video's folder for a one-off screen, the app's folder (`apps/<family>/<tool>`) for a tool more than one video will use. Read what it printed. A failing row names a picture and what is wrong with it (a JPEG, a wrong size, a repeat, no step above it); send those rows back to whoever captured, in their words, and ask for the document again. A warning is a size the kit accepts but did not ask for; say so and carry on. The command refuses to overwrite a capture set that is already there; move the old one aside into `_suggested-trash/` and say so, never delete it.
2. Read `captures/walkthrough.md` for the shape of the task, then **open every picture** in `captures/` with the Read tool, one by one, at full size. The check read sizes, not screens. Only the picture says which fields are on the screen, what they are called, what state each control is in, and what the exact on-screen spelling is.
3. For each picture, say in one line whether it is usable and what it shows, and name anything that should not be reproduced: an account id, an ARN, an email address, a real name, a live cost. A picture with private data on it is not used; ask for it again, clean.
4. Where a step's words and its picture disagree, say so; never pick one silently.
5. Where a screen the video needs has no picture, say which, and mark that scene a concept scene in the storyboard until a capture arrives.

## From a picture to a state

Nothing is recreated from memory of the product. Where the document carries measured values from the page itself (the brief asks for them on web and browser-backed apps: colours as hex, the font stack and sizes, region sizes, exact labels), those go into `tokens.css` and `screen.css` first, and the picture confirms them; where it carries none, the values are measured from the picture. Never paste the product's own code, styles, icons or images into an app folder or a video; the brief says so to whoever captures, and this skill holds the same line. With the picture open: `vkit app add-state family/tool <id> --capture captures/CAP-003.png --screen <name> --state <condition> --note "<what the picture shows>"` writes the fragment and cites the picture in `manifest.csv`; then the markup inside `#mock` is written from what the picture shows and nothing else, the tool's palette measured from the picture into `tokens.css`, never restyled. `vkit check` then measures the recreated state against the cited picture (the `fidelity` group, reported with a side-by-side image). For a one-off screen the same picture is cited in the video's `rig/index.html` comment above the screen markup.

## Rules

- This skill never screenshots a product screen itself; the brief goes out and the document comes back, or the `capture-walkthrough` skill shoots with the kit's browser.
- Never type a screen detail that no picture shows. No capture, no chrome.
- Never edit `captures.csv` or rename a `CAP-NNN.png`; `vkit capture` writes them and `manifest.csv` cites them.
- The command's green run is the shape, not the content; the pictures are read by a reader, every one.
- Plain language, no em dashes.
