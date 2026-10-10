---
name: brand-apply
description: >
  This skill should be used when the user asks to "apply the brand", "add the logo", "brand this
  video", "use these colours", "add a watermark", "put the banner on", or "which brand is this on",
  or when video-menu item 4 needs a brand the video does not carry. It sets up or changes the brand
  by asking, showing what it will write, writing rig/brand/, running vkit brand and showing frames.
metadata:
  version: "0.1.2"
---

# Apply a brand

A brand is one folder in the kit's `brands/<name>/`: `brand.json` (five colours: ground, ink, primary, secondary, highlight, any of them empty; two faces, display and text; a mark and a banner with when, where, size, opacity and seconds) and the files it names. `vkit brand <name>` copies it into the video's `rig/brand/` and writes `rig/brand.css`; the theme reads `--brand-*` first, so "no brand" renders the look and the defaults; `vkit brand none` takes it off; `vkit brand` with no name rebuilds after a hand edit; `vkit brand --check` measures every colour against the surface it sits on. The product screen is never branded, and a mark set to `always` hides while the screen is up. `brands/example/` is a neutral brand to look at; `brands/TEMPLATE/` is the empty shape.

1. **What is there.** `vkit brand --check` prints the brand on the video, its mark and banner, the tokens written, and each colour against the surface it sits on with the ratio the rule needs. Say it in two lines.
2. **Ask once, in one message**, only what the check did not answer: which brand (one in `brands/`, a new one, or none on purpose); hex codes or an attached guide, slide or image to read them from (say which values are unknown, never guess); the mark and banner files; where the mark shows (never, opener, close, both, always, watermark; which corner; discreet or a statement; solid or translucent); whether there is a banner (opener, close, both; a strip or the whole frame); where the values came from. Offer the plain default: mark at the close, bottom right, discreet, no banner.
3. **Show what will be written** (the `brand.json`, starting from `brands/TEMPLATE/brand.json`, and the files to copy into `brands/<name>/`) and wait for a yes. Then write it, run `vkit brand <name>` in the video (or `vkit menu --set brand=<name>`), and read what `--check` printed: a ratio under the rule is a brand problem to raise with the person, never a token to bend; `vkit check --quick` then measures the rendered pixels.
4. **Show frames**: the opener, a concept scene, the screen, the close. Say what changed. Change only what the person asks.
5. **Make it reusable**: copy the folder to `brands/<name>/` when it is a brand more than one video will carry.

Never write a colour or a logo into the rig to apply a brand; never redraw a logo or lift one from a screenshot; a mark image needs its own file from the brand's owner, square, and no face is shipped without a licence row.
