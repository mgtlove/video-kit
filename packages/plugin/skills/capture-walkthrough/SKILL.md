---
name: capture-walkthrough
description: >
  This skill should be used when the user asks to "capture the screens", "shoot the walkthrough",
  "go get the screenshots", "run the capture", "take the console pictures", or hands over a
  capture-request.md for a tool this machine can reach in a browser. The agent drives the kit's
  own capture browser through the task and vkit shoot writes the capture set; nothing is pasted,
  nothing is redacted after the fact, and sign-in is the person's.
metadata:
  version: "0.1.3"
---

# Capture a walkthrough with the kit's browser

Who runs this: a Claude Code session on the machine that has the browser (the director's side), with the person signed in. The subject expert writes the request and knows where to click, but a cloud chat cannot run the capture browser (the rule below), so the request is the expert's and the session is the director's; the director's chat recreates from what lands in `captures/` (`video-recreate`). The request is `capture-request.md` in the app folder (the whole coverage of a tool, written by `video-brief` before any video exists) or in a video folder (the pickups a storyboard needs). `vkit handoffs` shows an app whose request is newer than its captures as waiting for this skill. Every `vkit` here can be spelled `node ~/Developer/video/video-kit/packages/cli/bin/vkit.js` from a shell that has the folder but not the command.

The kit runs the Chrome already on this machine on a profile folder of its own (`~/Developer/video/chrome-profile/`, outside every repo), headless, at an exact 1920x1080 viewport with a device pixel ratio of 2, with a debugging port on localhost. The agent's eyes and hands are the Playwright MCP server pointed at that port; `vkit shoot` takes each picture. The result is the same `captures/` set the document path makes (`docs/CAPTURE.md`): `CAP-NNN.png`, `CAP-NNN.json` with the page's own colours, faces, region sizes and labels, `walkthrough.md`, `captures.csv`.

## Before the first capture on this machine

1. The MCP server, once. It is pinned in the kit's dev dependencies and lockfile (`@playwright/mcp`), so `npm install` in `video-kit` puts it in place, and it is registered for the video folder only, from `~/Developer/video`: `claude mcp add --scope local playwright -- node video-kit/node_modules/@playwright/mcp/cli.js --cdp-endpoint http://127.0.0.1:9333`. Restart Claude Code once so the server is loaded. It is a local process on this Mac speaking to Claude Code over standard input and output; nothing in it reaches any server of its own. The server's `--allowed-origins` can fence the browser to the tool's origins; a console loads from several hosts, and a fence that misses one looks like a broken page, so add the fence only after a first capture has shown which hosts the tool uses (`shoot.json`'s `allowed_origins` records them).
2. The app folder's `shoot.json` (`apps/<family>/<tool>/shoot.json`): `start` (the first URL), `session_hours` (the sign-in session's length, 1 for an AWS capture account), `mask` (selectors hidden before every shot), `known` (literal strings that must never appear, such as an account id, kept in the private app repo only), `allowed_origins` (filled after the first capture). Read it; never guess at it.

## Signing in (the person's step)

Run `vkit shoot start --show` (the capture browser is the Chrome already on this machine; `PW_CHANNEL` is not needed for shoot or face). A visible Chrome window opens on the kit's profile. Tell the person to sign in there (for AWS: the access portal URL from the request, then the capture account and its permission set) and to say when the console is up. Then `vkit shoot stop` and `PW_CHANNEL=chrome vkit shoot start` (headless). The session carries over in Chrome's own cookie store; nothing is exported. `vkit shoot status --into <app folder>` must now show the console URL, `viewport 1920x1080 at 2x`, and the session's age. The session clock started at sign-in, not at the first picture; a one-hour session means the whole capture has to finish inside the hour, so do not start until the request is read and the screens are listed.

A visible window cannot reach 1920x1080 on a laptop screen; it is for signing in, never for shooting. `vkit shoot` refuses a shot whose viewport is not 1920x1080 and says so.

## Capturing

For each screen in the request, in order:

1. Drive the page with the MCP tools (navigate, click, type, wait). Read the page snapshot, not a screenshot, to decide where you are; a snapshot is text and costs little.
2. When the screen is the state the request names, `vkit shoot "<step heading from the request>" "<what was done to reach it, one line>" --into apps/<family>/<tool>`.
3. Read what it printed. Three outcomes:
   - **written**: `CAP-NNN: 3840x2160 ...`, with the masks that matched and the regions measured. A `WARNING` that a mask matched nothing means the page did not have that element; say so and go on.
   - **refused, the sweep found something** (exit 3): `not written: ... account-id in span#awsc-nav-account-id ...`. The sweep reads the page's text for a 12-digit number, an ARN, an email address, an IP address and the `known` literals, and names the element each sits in. Add that selector to `shoot.json` under `mask` and shoot again. Never `--allow-hits` on a product screen; the flag exists for a test page and a reason written down.
   - **refused, the page looks exactly like an earlier picture**: nothing changed on screen. Check the step, not the tool.
4. Open the picture with the Read tool before moving on. The sweep reads text; it cannot see a number drawn on a canvas or baked into an image, and it cannot judge whether the screen is the right one. Say in one line what the picture shows and whether it is the screen the request asked for.

When every screen is done: `vkit shoot stop` (it asks the browser to close itself so the profile is written cleanly). Report the list of `CAP-NNN` with their steps, the masks that ended up in `shoot.json`, and anything the request asked for that could not be reached.

## When it goes wrong

- `the page is a sign-in page`: the session has ended (the clock started at sign-in) or the person has not signed in. The message says which it can tell. `vkit shoot stop`, `start --show`, sign in, `stop`, `start`. Report it as the clock running out when the session age says so, not as a browser fault.
- `no browser: set PW_CHANNEL=chrome`: an older kit, or Chrome is not installed where the kit looks; nothing downloads a browser.
- `the capture browser is already running`: `vkit shoot status`, then `stop` if it is stale.
- The MCP server cannot connect: `vkit shoot start` must run before the MCP's first call; check the port in `vkit shoot status` matches the one the MCP was added with.

## Rules

- Never type a password or a code into the browser; the person signs in, in the visible window.
- Never export cookies or tokens, never open a debugging port on the person's everyday Chrome, never run the capture browser in a cloud container.
- Never redact a picture after the fact; mask the element and shoot again. The sweep's refusal is the control, not a nuisance.
- Never paste the product's HTML, CSS, scripts, icons or images anywhere; `CAP-NNN.json` holds measured values and labels, which is all the recreation needs.
- Never commit `chrome-profile/`; it is outside every repo on purpose.
- Plain language, no em dashes.
