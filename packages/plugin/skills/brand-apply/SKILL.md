---
name: brand-apply
description: >
  This skill should be used when the user asks to "apply the brand", "add the logo", "brand this
  video", "use these colours", "add a watermark", "put the banner on", or "which brand is this on",
  or when video-menu item 4 needs a brand the video does not carry. It sets up or changes the brand
  by asking, showing what it will write, writing rig/brand/, running vkit brand and showing frames.
metadata:
  version: "0.0.1"
---

# Apply a brand

A brand is one folder, `rig/brand/`: `brand.json` (five colours: primary, secondary, tertiary, ground, ink, plus an optional highlight; two faces; a mark and a banner with when, where, size and opacity) and the files it names. `vkit brand` writes `rig/brand.css`; the theme reads `--brand-*` with fallbacks, so "no brand" renders the defaults. The product screen is never branded. Reusable brands live in the kit's `brands/`; `brands/TEMPLATE/` is the empty shape.

1. **What is there.** `vkit brand --check` prints the brand, the colours set, the mark and banner rules, the fonts, the source and the approval, and any problem. Say it in two lines.
2. **Ask once, in one message**, only what the check did not answer: which brand (one in `brands/`, a new one, or none on purpose); hex codes or an attached guide, slide or image to read them from (say which values are unknown, never guess); the mark and banner files; where the mark shows (never, opener, close, both, always, watermark; which corner; discreet or a statement; solid or translucent); whether there is a banner (opener, close, both; a strip or the whole frame); where the values came from. Offer the plain default: mark at the close, bottom right, discreet, no banner.
3. **Show what will be written** (the `brand.json` and the files to copy) and wait for a yes. Then write, run `vkit brand`, fix what it reports (a contrast failure is a brand problem to raise, not a token to bend), record the brand and version in `video.json`.
4. **Show frames**: the opener, a concept scene, the screen, the close. Say what changed. Change only what the person asks.
5. **Make it reusable**: copy the folder to `brands/<name>/` when it is a brand more than one video will carry.

Never write a colour or a logo into the rig to apply a brand; never redraw a logo or lift one from a screenshot; no person's name in `approved_by`.
