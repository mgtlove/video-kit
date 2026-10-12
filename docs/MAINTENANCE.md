# Maintenance: the hub and its spokes

A recreated app is the hub: one folder (`apps/<family>/<tool>/`) holding the tool's screens, behaviour and paths, built once from captures. Everything made from it is a spoke carrying a copy: a video has the app in `rig/app/` and the engine in `rig/engine/`; a twin is built into the app's `twin/` with both. The real product changes, so the hub changes, and the spokes have to follow or they lie. This page is the route a change takes, in order, and the tools that hold each step. Decided 11 October 2026, built 12 October (milestone A2, `docs/ROADMAP.md`).

## Where things stand, any time

`vkit status`, run in the workspace folder (the one holding `video-kit/`, `apps/` and `videos/`), lists the kit's engine and plugin, every app with its states, model, paths, captures and change log, whether its twin is built on the current engine and app, and every video with the engine and app version it carries against the kit's and the app's. A copy that is behind is named with what to run (`vkit upgrade <video>`, `vkit app use family/tool`, `vkit twin family/tool --build`) and with the app's changes the copy has not seen. A version with no line in the change log is named too.

## The change log

`apps/<family>/<tool>/CHANGES.md`: one line per version, newest first, in one shape:

```
- 0.3.2 (2026-10-12): the model gains the bucket name's rules with their sources (CAP-002, the naming rules page); pickup 3 opened (CAP-018, CAP-019).
```

The version is `app.json`'s; the date is the day; the text says what changed and names the captures it came from. The director writes the line in the same change as the version bump; a bump without a line is what `vkit status` warns about. `vkit app use` prints the lines a video's copy has not seen, so whoever brings a video up reads what moved. The log is the spoke's answer to "what changed since my copy"; nothing else has to be diffed.

## The route of a change

1. **Something in the product moved.** A learner, the producer or the expert notices; or a new capture session finds it. Nothing in the app changes on a say-so: the capture is the evidence.
2. **Capture** (`capture-walkthrough`, on the machine with the browser, the person signed in): the screens that moved, one layer out as `docs/CAPTURE.md` says, by `vkit shoot` into the app's `captures/`. The app now has captures newer than its states, and `vkit handoffs` says so.
3. **The expert first.** `vkit handoffs` puts the app on the subject expert: in the expert's chat, the `video-brief` skill reads the new captures and writes `what-changed.md` in the app folder: what changed in the product, in plain words, and what it means for each lesson on the app (a row that no longer holds, a word that moved, a step that is now somewhere else, or nothing). The director touches no state until that file is in. Reason: the recreation can be byte-true and still teach the wrong thing if the lesson's words were not read against the change.
4. **The states** (`video-recreate`, the director's chat): the states that moved, from the new captures, each cited; the ledger (`fidelity.md`) updated; the model (`app-model`) if a transition or a rule moved; the paths if a step's words moved. Then `app.json`'s version bumped and the `CHANGES.md` line written, in one change.
5. **`vkit app build family/tool`**: the app's own generator run if it has one (`make-states.js` in the app folder; the S3 one writes all nine states from measured numbers), and the states verified: every manifest row has its file or its capture, no state names a crop that is not in `crops/`, no id twice in a state, nothing in `states/` that the manifest does not list. It says which states the generator moved, byte for byte; when none moved there is nothing to bump. The generator stays in the app folder: it is the product's markup measured by hand, and the kit owns running and checking it, not writing it.
6. **The sweep: `vkit app use --all [family/tool]`**, in the workspace folder. Every video on the app is brought up to the current version (the copy refreshed, `video.json` written, the change log lines printed) and each one's quick check run; the report names each video with its rows and whichever rows fail. A video whose check failed is the director's next job: the rows say where, the frames say what. `--no-check` skips the checks when the browser is not at hand. Twins are remade with `vkit twin family/tool --build`.
7. **The stale-copy row.** Independently of the sweep, `vkit check` on any video carries `app-copy-current` (fidelity group): fail when the copy's version is behind the app folder's, with the change log lines in the message. A stale copy never renders quietly.
8. **The producer looks.** For each video with a changed state, the frames at the rows on that state (`vkit frames`), looked at against the new capture, before any render. The twin walked once.
9. **Commit**, docs with code: the app repo (states, ledger, model, paths, `CHANGES.md`, `app.json`, `what-changed.md`), then the kit if anything in it moved, then each video's folder as its own repo allows. The GitHub run proves the kit.

The engine has its own, shorter route: the kit's engine moves, `vkit upgrade <video>` brings a video's copy up (the old copy kept in the video's `_suggested-trash/`), `vkit twin --build` remakes a twin, and `vkit status` names what is behind. An engine change is proved by frames compared before and after (`docs/ENGINE.md`), never by the sweep alone.

## What each role does in the loop

- **Producer**: notices, watches the changed frames, walks the twin, says yes.
- **Subject expert** (its own chat): `what-changed.md` before any state moves; the fact check again when the words move (`video-fact-check`).
- **Director** (the chat with the repo): captures, states, ledger, model, paths, the version and its line, `vkit app build`, the sweep, the failing rows, the commits.

## What is not here yet

A twin's own check (today the twin is proved by `twin.test.js` on the test app and by a hand on the real one); a video's check knowing which of its rows sit on a state that moved (today the sweep says the version moved and the producer looks at the frames); the change log written for you from the captures (today the director writes it). Each is a line in `docs/ROADMAP.md` when it is wanted.
