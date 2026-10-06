# The capture brief

What to hand over so a screen can be recreated for a video. The same brief whether the video will show one screen inline or a whole tool as a recreated app, and whether a person or a chat with console access does the capturing. Paste it whole into that chat.

## What to hand over

One Word document (`.docx`), a walkthrough of the task in the order a person does it:

1. **A heading per step.** `Step 1: open the bucket list`, `Step 2: start a new bucket`. One heading per screen state you want recreated.
2. **A line under the heading saying what was done** to reach the picture: what was clicked, typed or chosen, and what the screen did. Plain words. This line is what the video's narration will be checked against.
3. **The screenshot under that line.** One picture per state. Insert the PNG file (Insert, Picture), do not paste from the clipboard; pasting can turn it into a JPEG or shrink it. In Word, turn off "Compress pictures on save" (under Image Size and Quality in Word's options; where it sits depends on the version) before saving. A document written by a tool rather than by Word is not affected.
4. **A note after the picture for anything a still cannot carry**: what was under the pointer, what changed a moment later, a message that appeared and went, what the next click will be. Skip it when there is nothing to say.

A title and a line at the top saying where and when this was captured (the tool, the region or environment, the date, that it was a sandbox) help the person recreating it.

## The pictures

- **The page only**, no browser tabs or address bar. Set the browser viewport to **1920x1080** and capture the page area. A Retina screen gives 3840x2160; that is fine and is recorded as a 2x capture. Any other 16:9 size at or above 1920 wide is accepted with a warning; anything else fails.
- **PNG.** Never JPEG; the recreated screen is compared with the picture pixel by pixel and JPEG softens edges and text.
- **One state per picture.** A menu open is one picture, the menu closed is another. A closed dropdown proves the control exists and nothing about its options; if the options matter, open it and capture again.
- **Nothing private on screen.** No account ids, ARNs, email addresses, real names or avatars, no live counters or costs that would date the video. Use a sandbox account, and set up the data you need so that it is invented and harmless. A picture that cannot be made clean is described in words instead and the screen becomes a concept scene.
- **No picture of a screen you did not reach.** A screen with no capture is a concept scene in the video, drawn, not recreated. Say which screens you could not reach.

## Under the hood, for web and browser-backed apps

When the tool is a web page or a browser-backed desktop app (Electron and the like), the screen's own values are exposed, and reading them beats measuring a picture by eye. For each step where it matters, add a short list or table under the picture, in words and numbers:

- **Colours** as hex, from the computed styles: the page ground, the main surface, the border, the strong text, the body text, the muted text, the accent and the button fill. Say which element each came from (`the top bar`, `a row`, `the primary button`).
- **Type**: the font family stack the page resolves to, and the sizes and weights of the title, a label, body text and a button, in px.
- **Layout**: the sizes of the main regions in px at the 1920x1080 viewport: top bar height, side navigation width, content width, row height, the padding of a card.
- **Labels, exactly**: the on-screen spelling of every label, button and placeholder in the state, copied from the page rather than retyped.
- **Controls and states**: which fields are required, what a disabled or hovered control looks like, what the dropdown holds when open.

The browser's developer tools give all of this (the elements panel, the computed styles). Write down the values; **do not paste the product's HTML, CSS, JavaScript, icons or images into the document or into any repository**. The screen is recreated from measurements and words under the kit's rules, never copied; the values go into the app's `tokens.css` and `screen.css` by hand, and the picture is still what the recreated state is checked against.

## What happens to it

`vkit capture <walkthrough.docx> --into <folder>` reads the document in reading order and writes `<folder>/captures/`: `CAP-001.png` onward, in document order, bytes untouched; `walkthrough.md`, the document's text with each picture in its place; `captures.csv`, one row per picture with its step, the step's text, its size and scale, the document's date and name. It checks the shape of what arrived: PNG, size, no two pictures the same, every picture under a step heading that has a line of text before it. A failing row names the picture and the step; the files are still written so a person can look. Run it yourself on your own document before handing it over; a clean run is the handover.

The check reads sizes, not screens. It cannot tell a good picture from a useless one, or see an account id left on screen. That is the reader's job, pictures open, before anything is recreated (the plugin's `video-capture` skill).

`--into` is the recreated app's folder (`apps/<family>/<tool>`) when the screens belong to a tool that more than one video will use, and the video's own folder when it is a one-off screen. From there `vkit app add-state family/tool <id> --capture captures/CAP-003.png` cites a picture for a state, and `vkit check` measures the recreated state against it.

## A document outline

```
Create an S3 bucket                                   (title)
Captured 5 October 2026 in a sandbox account, us-east-1.

Step 1: the bucket list                               (heading)
Opened S3 from the search bar and waited for the list to load.
[CAP-001.png]
Note: the list was empty; the orange button top right is "Create bucket".

Step 2: the create form                               (heading)
Clicked Create bucket.
[CAP-002.png]

Step 3: the name field                                (heading)
Typed "training-demo-bucket"; the field turned green a moment later, which the picture does not show.
[CAP-003.png]
```
