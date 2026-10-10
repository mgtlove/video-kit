---
name: video-script
description: >
  This skill should be used in a video folder when the user says "write the narration", "turn
  the storyboard into the script", "script this from the brief", "the SME answered", or when
  vkit handoffs shows a video waiting for the director. It reads the expert's brief.md,
  storyboard rows and capture-request.md from the video folder, writes narration/part-N.md
  under the craft rules and in the narrator's voice, gates it with vkit narration, checks the
  rows against the app's states, and leaves FULL.md for the fact check before anyone records.
metadata:
  version: "0.1.4"
---

# From a storyboard to a narration

The subject expert answered `brief-request.md` in the video folder with `brief.md`, the rows in `storyboard.md` and `capture-request.md` (the `video-brief` skill); `vkit handoffs` shows the video waiting for the director. Nothing is pasted between chats: every handoff is a file in the folder, and `vkit handoffs` says whose turn it is. The director's job here is words and coverage; footage comes after the words are settled and recorded.

## Order

1. **Read the answer.** `vkit handoffs` on the video, then `brief.md`, `storyboard.md` and `capture-request.md`. If any of the three is missing, the handoff is not done; say so, do not fill the gap from memory.
2. **Actions before words.** Every row whose screen changes from the row before needs an Action (the click, the typing, the scroll that caused it); a row that only looks has none. A storyboard written before the Action column has the column empty: fill it from the rows' own sentences where they say what the learner does, and say so in the delivery; where a sentence says nothing and the screen still changed, that is a question for the expert, not a guess.
3. **Coverage before words.** `vkit check --quick` and read `storyboard-covered`: every `state <id>` a row names must exist in `rig/app/manifest.csv`, and the count it reports must equal the rows in the file (a row in a part the rig does not have yet is still read; `sentences-match` names such rows until the parts exist). A row that names a state the app lacks is either a typo or a pickup. Pickups go to the `capture-walkthrough` skill and `video-recreate` before step 3 writes a sentence that depends on them; the storyboard is not "mostly settled" while a row points at a screen that does not exist.
4. **Write the narration.** `narration/part-N.md`, one sentence per line, one line per storyboard row of that part, in order, saying what the row's Sentence column means. Rules: no sentence over 30 words; a part under about 1000 characters; the console's labels spelled as the screen spells them; the narrator's own voice (plain, spoken, no corporate words, no mention of how the video was made); announce, do, explain is the default rhythm (the research's patterns, `vkit menu --explain`). Put the final sentence back into the storyboard's Sentence column so the two files say the same thing.
5. **Gate it.** `vkit narration` checks the limits, writes `narration/FULL.md` and estimates lengths; `vkit check --quick` must show `sentences-match` and `storyboard-covered` passing. Fix the words, not the check.
6. **Fact check.** `vkit narration` wrote `narration/FULL.md`, so `vkit handoffs` now shows the video waiting for the subject expert; tell the producer it is ready and stop. The expert's chat writes `fact-check.md` beside it (`video-fact-check`). When it is there, apply every `wrong` and `caveat`; `drift` is a conversation with the producer. Re-run step 5; the new `FULL.md` goes back for another pass until the table is all `true`.
7. **Hand to the producer** for the words and the voice. Only after the producer's yes do the recordings happen (Voice Memos, one file per part, `voice/part-N.m4a`), then the `video-measure` skill makes the clips the clock and the timeline is written against the spoken words.

## Rules that are not negotiable

- The storyboard is the contract: one row, one sentence, one beat, in the same order. `vkit check` proves it; when they disagree, fix the files, not the rule.
- No sentence describes a screen moment no state has. A missing screen is a capture request, never a description from memory.
- Facts come from the expert's outline and the fact check, not from the writer's memory of the tool.
- The expert judges truth; the producer judges words; the director holds the rules. No one of the three skips the other two.
