# Looks

One JSON per look pack, the same keys in every one (ground, ink, paper, accents, type, strokes, entrance, camera, cut and hold seconds, text on frame, evidence, scene kinds, pacing, voice), plus `index.json`, which `vkit menu` reads for its look options. Made from `video-reference/styles/looks.json` by `vkit sync-reference`; each file names its source and commit. `vkit look <name>` turns one into `rig/look.css`.

`faces.json` is the one hand-kept file here: a pack names a type family as a class ("rounded hand-style sans"), and this maps each class to a stack of faces already on a Mac or Windows machine. Nothing downloads and no licence is taken on; a face shipped inside a video needs its own licence row first (C-TYPE-15).
