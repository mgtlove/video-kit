---
name: video-fact-check
description: Use in the subject expert's chat when the user says a narration is ready to check, asks what is waiting, or asks to fact check or review a video's script. Finds the video's narration/FULL.md and storyboard.md, writes fact-check.md beside them with a verdict per sentence.
metadata:
  version: "0.1.4"
---

# Fact-checking a narration

The narration is the director's wording of the storyboard the expert wrote. The expert now reads it as the person who knows the tool, sentence by sentence, against what the console does today and what the storyboard row said. The folder is the handoff: the narration is read from the video folder and the verdicts are written beside it.

## 1. Find the narration

Run `vkit handoffs ~/Developer/video/videos` (the videos live beside `video-kit`; a shell without the command runs `node ~/Developer/video/video-kit/packages/cli/bin/vkit.js handoffs ...`); take the video the person named, or the one marked `subject expert (video-fact-check)`. Without `vkit`, the rule is the files: a video is waiting when its `narration/FULL.md` is newer than its `fact-check.md` or there is no `fact-check.md`. Read `narration/FULL.md` (one sentence per line, in parts), `storyboard.md` (the rows the sentences came from) and `brief.md` (the outline, for the pitfalls that must be said). Then open the captures the rows cite (`rig/app/captures/` is not in the video; the pictures are in the app folder, `apps/family/tool/captures/CAP-NNN.png`) and judge each sentence against the picture, not against the manifest's note or the row's words: a count, a label, a state of a control. The first real check found "all four boxes checked" copied through four files when the picture showed one control and four it governs.

## 2. Write `fact-check.md`

One table, one row per sentence, in order:

| Part | Sentence | Verdict | Note |

- **Verdict**: `true`; `wrong` (the sentence says something the console does not do, or names a label the screen does not show); `caveat` (true but a learner would be misled without one more clause); `drift` (true but not what the storyboard row meant).
- **Note**: for `wrong`, the correction in plain words, the console's own label where one is involved; for `caveat`, the clause to add; for `drift`, what the row meant. Empty for `true`.

Then two lines: the count of each verdict, and anything the narration should say that no sentence says (a pitfall from the outline that got lost).

## 3. Say what was written

One line: the video's name, the counts. `vkit handoffs` now shows the video waiting for the director, who applies every `wrong` and `caveat`, re-runs `vkit narration`, and the new `FULL.md` comes back here for another pass until the table is all `true`. If the folder cannot be reached from this chat, give the table as text under the file name; that is the fallback, not the way.

## Rules

- Judge facts and labels, not style. The wording, pace and voice belong to the director and the producer; a sentence that is plain and true passes even if the expert would phrase it differently.
- The console's own labels are the spelling: `Block all public access`, not "block public access toggle".
- Do not rewrite sentences. A correction is the fact, not a replacement line; the director rewrites to the craft rules.
- If a sentence refers to a screen moment no state has, say so: that is a pickup, not a fact.
- Do not touch `narration/` or `brief.md`. The one exception on `storyboard.md`: a `drift` or a `wrong` whose cause is the expert's own row (the order, a wrong state, a screen the console never shows at that point, an On screen or Card text that misdescribes the picture) is fixed in the rows in the same pass, said so in the notes, and `vkit handoffs` then sends the director back to the words; the director never reorders rows, and the expert never rewords sentences.
