# Brands

One folder per brand: `brand.json` (five colours, two faces, a mark and a banner with when, where, size and opacity) and the files it names. `vkit brand` writes `brand.css` from it; the theme reads `--brand-*` with fallbacks, so a video with no brand renders the defaults. `TEMPLATE/` is the empty shape.
