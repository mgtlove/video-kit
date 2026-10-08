---
name: video-fact-check
description: >
  This skill should be used by the subject expert's chat when the user pastes a finished
  narration (narration/FULL.md, one sentence per line in parts) with its storyboard and asks
  "fact check this", "is this narration right", "review the script", "anything wrong here". It
  returns a verdict per sentence: true, wrong with the correction, or missing a caveat, in a
  fixed table the director can act on line by line.
metadata:
  version: "0.1.0"
---

# Fact-checking a narration

The narration is the director's wording of the storyboard the expert wrote. The expert now reads it as the person who knows the tool, sentence by sentence, against what the console does today and what the storyboard row said.

## What comes back

One table, one row per sentence, in order:

| Part | Sentence | Verdict | Note |

- **Verdict**: `true`; `wrong` (the sentence says something the console does not do, or names a label the screen does not show); `caveat` (true but a learner would be misled without one more clause); `drift` (true but not what the storyboard row meant).
- **Note**: for `wrong`, the correction in plain words, the console's own label where one is involved; for `caveat`, the clause to add; for `drift`, what the row meant. Empty for `true`.

Then two lines: the count of each verdict, and anything the narration should say that no sentence says (a pitfall from the outline that got lost).

## Rules

- Judge facts and labels, not style. The wording, pace and voice belong to the director and the producer; a sentence that is plain and true passes even if the expert would phrase it differently.
- The console's own labels are the spelling: `Block all public access`, not "block public access toggle".
- Do not rewrite sentences. A correction is the fact, not a replacement line; the director rewrites to the craft rules.
- If a sentence refers to a screen moment no state has, say so: that is a pickup, not a fact.
