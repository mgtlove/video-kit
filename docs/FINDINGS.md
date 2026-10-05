# Findings

Faults seen in rendered frames that are not fixed yet. Each says where it shows, what causes it when known, and what would prove it fixed. A finding leaves the open list in the commit that fixes it and goes to the closed list with the step that fixed it. The `video-frames` skill writes here when it sees something the checker does not measure.

## Open

None.

## Closed

- F1, the explanation card was see-through: `--panel` carried a 93 percent alpha and the fields' values showed under the card's words; the checker passed it because `text-contrast` measures the surface, not what shows through. F2, the card landed on the named field's neighbours and cut their labels. F3, the camera cut the side menu and the top bar. All three seen 5 October 2026 in a fresh starter video (engine 0.4.0) by the `video-frames` skill looking at each still at full size; fixed in roadmap step 8a: an opaque panel and the `surface-opaque` checker row; card placement clear of neighbours in engine 0.4.1; the starter's part 2 frame measured past the chrome.
