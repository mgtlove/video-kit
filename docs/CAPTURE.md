# The capture brief

What to hand over so a screen can be recreated for a video. The same brief whether the video will show one screen inline or a whole tool as a recreated app.

There are two ways a capture set gets made, and they land in the same `captures/` folder:

- **The kit's own capture browser** (`vkit shoot`, the plugin's `capture-walkthrough` skill), when the tool can be reached in a browser on the Mac that runs the kit: the Chrome already installed, on a profile of its own, headless, at exactly 1920x1080, an agent driving it, the person signing in once in a visible window. Exact pictures, the page's own values read for free, private text caught before a picture is written. This is the first choice.
- **A walkthrough document** from a person or a chat that has the screen and nothing else. The rest of this brief is for them. Paste it whole into that chat, with the list of screens wanted at the top.

## What to hand over

One Word document (`.docx`), a walkthrough of the task in the order a person does it:

1. **A heading per step.** `Step 1: open the bucket list`, `Step 2: start a new bucket`. One heading per screen state you want recreated.
2. **A line under the heading saying what was done** to reach the picture: what was clicked, typed or chosen, and what the screen did. Plain words. This line is what the video's narration will be checked against.
3. **The screenshot under that line.** One picture per state. Insert the PNG file (Insert, Picture), do not paste from the clipboard; pasting can turn it into a JPEG or shrink it. In Word, turn off "Compress pictures on save" (under Image Size and Quality in Word's options; where it sits depends on the version) before saving. A document written by a tool rather than by Word is not affected.
4. **A note after the picture for anything a still cannot carry**: what was under the pointer, what changed a moment later, a message that appeared and went, what the next click will be. Skip it when there is nothing to say.

A title and a line at the top saying where and when this was captured (the tool, the region or environment, the date, that it was a sandbox) help the person recreating it.

## The pictures

- **The page only**, no browser tabs or address bar, at a **1920x1080** viewport. A laptop screen cannot show a 1920x1080 window, and zooming out does not make one, so use the browser's own tool for this: in Chrome, open DevTools, turn on the device toolbar, choose Responsive, type 1920 by 1080 and a device pixel ratio of 2, then use the toolbar's own menu item "Capture screenshot". It saves exactly 3840x2160 of the page area, nothing else. Any other 16:9 size at or above 1920 wide is accepted with a warning; anything else fails.
- **PNG.** Never JPEG; the recreated screen is compared with the picture pixel by pixel and JPEG softens edges and text.
- **One state per picture.** A menu open is one picture, the menu closed is another. A closed dropdown proves the control exists and nothing about its options; if the options matter, open it and capture again.
- **Nothing private on screen.** No account ids, ARNs, email addresses, real names or avatars, no live counters or costs that would date the video. Use an account made for capturing, with nothing in it, so that the lists are empty and nothing on any screen needs hiding. Know your tool's fixed leaks: the AWS console shows the account id in its top bar on every page with no menu open, and some resource names carry it too (a CDK bootstrap bucket does). Where a leak cannot be avoided by the account, cover that one element with a solid rectangle before inserting the picture, and say in the document which pictures were covered and where; that is the only pixel edit allowed. A picture that cannot be made clean is described in words instead and the screen becomes a concept scene.
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

The check reads sizes, not screens. It cannot tell a good picture from a useless one, or see an account id left on screen. That is the reader's job, pictures open, before anything is recreated (the plugin's `video-capture` skill). The kit's own capture browser does better on one point: it sweeps the page's text before a picture is written and refuses while an account-id-shaped number, an ARN, an email address, an IP address or a listed literal is on screen, so the fix is a mask and a new shot, never an edit. The sweep reads text; it cannot see a number drawn on a canvas or baked into an image, and a reader still opens every picture.

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

## The kit's capture browser, for whoever drives it

`vkit shoot start --show` opens a visible Chrome on the kit's profile folder (`~/Developer/video/chrome-profile/`, outside every repo, readable by the signed-in user only); the person signs in there, closes nothing, and runs `vkit shoot stop` then `vkit shoot start`, which carries the session on headless in Chrome's own cookie store. `vkit shoot status --into <app folder>` says where the page is, that the viewport is 1920x1080 at 2x, and how old the session is against `shoot.json`'s `session_hours`, which starts at sign-in. An agent drives the page through the Playwright MCP server pointed at the same port (pinned in the kit's dev dependencies; registered for the video folder only with `claude mcp add --scope local playwright -- node video-kit/node_modules/@playwright/mcp/cli.js --cdp-endpoint http://127.0.0.1:9333`); it is a local process, not a service. A person can drive the visible window on a screen large enough for 1920x1080. At each screen, `vkit shoot "<step>" "<what was done>" --into <app folder>` sizes the window until the page is exactly 1920x1080, hides the selectors in `shoot.json`'s `mask`, sweeps the visible text, refuses with the element named while anything remains, and otherwise writes `CAP-NNN.png` at 3840x2160, `CAP-NNN.json` (the regions' sizes and colours, the buttons, headings, labels and inputs, as values and words, never the page's code), and the `walkthrough.md` and `captures.csv` entries. A second shot of an unchanged screen is refused. `vkit shoot stop` asks the browser to close itself, because a signal is a crash to Chrome and cookies not yet written would be lost with it.

What it does not do: type a password or a code (the person signs in), export cookies or tokens, touch the person's everyday Chrome, run anywhere but this machine, or edit a pixel after the fact.
