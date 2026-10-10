# Recreating a screen from its captures

A capture set (`docs/CAPTURE.md`) is pictures at 3840x2160 with a values file beside each. The recreation is the same screen as markup and CSS in the app folder (`apps/<family>/<tool>/`), one state per captured moment, so the engine can show it at any frame, move the camera over it, and change it on a beat. This page is the method, as it was done for the first real app (`aws/s3`, eight states, 6 October 2026), and the rule it answers to:

**Every value is read from a capture and cited, every picture is a copy of the capture's own pixels, nothing is restyled, and what could not be read is written down as substituted, invented or missing.** The ledger for that is `fidelity.md` in the app folder, one row per value or behaviour; `vkit check`'s fidelity row is the score, the side-by-side in `out/fidelity/` the proof a person looks at.

## 1. Measure, do not eyeball

Work in CSS px on the 2x picture (a picture pixel is half a CSS px; half-pixel positions are real and the engine draws them). Scan, do not read numbers off a viewer:

- the rows and columns where a colour run sits (a border is a 1 px run of `#c6c6cd`; a card's top and bottom are two such rows at the same x);
- the ink bands of text in an x range (the top of the ink of a 14 px line is 5.5 below its 20 px box; 12 px is 4 below 16; 18 px is 3.5 below 24; 24 px is 5.5 below 30), so a text box is placed by its ink and lands where the capture's does, whatever face is in use;
- a colour by the darkest three percent of a region's pixels for text (anti-aliasing never reaches the true colour at the edges), by one pixel in the middle of a flat area for grounds.

The values file (`CAP-NNN.json`) has the computed colours, sizes and weights of what the grabber caught; the pixels have everything else. When the two disagree the computed value wins for a property the browser reports (a weight of 500 reads as bold in a picture, and a heading the file calls 20 px is 20 px even when the eye says 18) and the pixel for a position. The S3 recreation lost an evening to two sizes typed by eye against a value the file had stated; the cap height of one capital letter, divided by the face's cap-height ratio, is the two-second check that would have caught it.

## 2. Tokens first, with their sources

`tokens.css` holds every colour and the face stack as `--p-*` variables scoped to `#mock`, each with a comment naming the capture and the sample point. A colour appears once; the screen's rules use the variable. No value is typed from memory of the product; if the capture does not show it, it is not in the file.

## 3. Pictures are copies, text is text

A logo, an icon, a caret, a chevron, a check mark in a disc: `vkit app crop family/tool CAP-NNN <name> --at x,y,w,h` (in the picture's own pixels) copies the region into `crops/<name>.png` and adds a row to `crops/crops.csv`; the capture is untouched. The state puts it back at its measured place as `<img class="…-crop" src="app/crops/<name>.png">` at the CSS size. A mark whose ground changes between states (a check inside a box that is blue when live and grey when locked) is drawn in CSS instead, and the ledger says so. Logos stay: the video is a screen recording in stills, and a console without its logo is not the console (`docs/workspace/decisions.md`, 6 October 2026).

Text is never a picture. Every label, heading, placeholder and button is typed, in the product's face (below), at the measured size, weight and colour.

## 4. The face

The product's typeface is the largest single source of difference; with a fallback face every width-dependent position (an `Info` link after a heading, a caret after a label, a chevron after a crumb) is off by the width error. `vkit face <name> --family "<css family>" --weights 400,500,700 --into apps/<family>/<tool>` draws each glyph of the face the page is using at 1000 px on a canvas in the capture browser, traces it, measures widths and kerning, and writes `faces/<name>-<weight>.otf`, a `.css` with the `@font-face` rules, a `.md` saying what was read (the rendered glyphs, never the product's font file) and a `.json`. The app's `tokens.css` imports the css and names the face first in its stack. It is made once per product on the machine with the page open and then lives in the app folder; the compare the tool prints (width error, shape and tone differences against the original at 14 and 200 px) is its proof. Until it exists the stack falls back, the ledger says `missing until made`, and the fidelity scores say how far that is.

## 5. States are fragments of one measured layout

`states/<id>.html` is the markup inside `#mock` for one captured moment. The parts a screen shares (the bars, the navigation, a card, a toolbar, a table head, an empty state) are written once as functions in a generator and placed by measured numbers; a state is a call with its own values. Two things make states cheap and true:

- **A layout is a few numbers, not a redraw.** The S3 content column is 305/1591 (inner left/width) with the navigation open and 150/1620 with it closed; the list card is two thirds less 7, the side cards the rest after a 21 gap; a table's columns are equal across W-22 after a 60 lead. Measured on three captures, the formula reproduces all of them, and a fourth layout is a check, not a new drawing.
- **A scrolled page is one page.** The create form is one 2458 px element in page coordinates, moved up by the state's scroll (0, 620.5, 1411.5, read off the same card's top in two captures); the window's scrollbar thumb is placed by the same number. Three captures of a long page are one recreation and three offsets, and a scroll on a beat is a transition of one property: the page element and the thumb carry `data-scrolls`, and the engine moves them on the beat's ease between two states of the same screen (the manifest's `screen` column says which states share a page; engine 0.5.0). Give an id to anything the timeline points at or that changes between states (a field, a crumb that is a link, the error line), so a morph keeps it and a beat can find it.
- **The chrome that stays.** Mark the console's fixed frame (the top bar, the breadcrumb bar, the footer) `data-chrome`: `openPage` keeps it on screen while a page loads and hides the rest over the page's ground. The side navigation and the scrollbar belong to the page.
- **A control answering the mouse.** A hover look and a pressed look are states of the control and come from captures (the capture browser hovers, or holds the mouse down, and shoots); the generator gives the control `hover` and `pressed` classes measured from them and the engine's `click()` uses `pressed`. Until captured, the engine darkens a pressed control by 12 percent and the ledger says substituted. Ask for them in the capture request as part of the layer one click out from the path.
- **Pictures in whole screen pixels.** `vkit app crop` grows a region to even pixels at 2x and says so; a state draws each crop at natural/2 at a whole-pixel place. A picture at a fractional size or place rasterizes differently between browser sessions and breaks the deterministic proof (F9). Text keeps its measured half pixels.

Right-anchored things (a toolbar, a pager, the bar's right-hand group, the footer's links) are positioned from the right so one rule serves every width the console draws. **Anything that follows a text runs after it**, inline, with the gap measured from the capture: an Info after a heading, the rule and Info after a form label, the arrow after a link, the caret after the region, the next crumb after a chevron, a pill after a tab, the footer's links after one another. Placed at a measured x instead, every one of them sat on its text the moment the face was the fallback (seen by Matthew in the first side-by-sides, 6 October 2026); placed inline, the text's own width carries it, and the true face lands it where the capture has it. Every class is prefixed with the app's name (`s3-`) so none can meet an engine class (`.card`, `.row`, `.on` are the engine's).

## 6. Compare, look, fix, repeat

Render each state alone and lay it beside its capture (`vkit check` does this: `out/fidelity/<state>.png`, and the fidelity row's similarity over the structured windows of the picture). Three rows judge what a similarity score hides and a person sees at once: `state:<id>:overlaps` (a line of text drawn over another, or over a picture, where both are actually drawn: a bar over a scrolled page is not an overlap), `state:<id>:overflow` (a line running past the bordered or filled box it sits in: a wrapped line typed as one) and `faces` (a face named first in a stack that the browser does not have, found by width: a sample set in the stack and in the stack without its first family render the same only when the first is missing). They fail together with a missing face and pass together once it exists; a fault in them with the face present is a measurement to fix. Then zoom the pair at the places that differ and scan again. The order that worked: bands (bars, cards, rules) to the pixel first, then every picture at its place, then colours and weights, then text positions by ink. Each fix is a measured number replacing a guessed one; when the pair differs only in glyphs, the face is next.

## 7. Write it down

`fidelity.md`: the face; every token; the geometry per part; every crop and its source; every text value with `true`, `substituted`, `invented` or `missing`; the behaviours the states show; the behaviours the captures do not yet show (menus, hover, dialogs), which wait for their own capture and are never invented. `manifest.csv` cites the capture per state and names what is invented in its note. The next capture session's masks (a user name seen in every picture, say) are named here too, so they are not forgotten.

## What the kit does and does not do for you

Does: `vkit app crop`, `vkit face`, `vkit app add-state`, `vkit new --app`, `vkit check`'s fidelity row and side-by-side, the engine's record of a beat that names an id a state does not have (`beats-on-screen`). Does not: measure for you, choose what is true, or guess a value. A screen with no capture is a concept scene, not a recreation (`CLAUDE.md`).
