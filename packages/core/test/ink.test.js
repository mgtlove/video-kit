// Proof for roadmap step 4: strokes, the pointer, typing and the cast are
// deterministic. The starter is rendered to its stills twice, in two separate
// browser sessions, and every still must be byte for byte identical: seeded
// geometry, baked motion and the marker-verified capture leave nothing to
// chance. Also checks that the moments the stills sample are the ones the
// storyboard names (typing adds minor beats the stills skip). About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');

test('two renders of the starter are identical, stroke for stroke', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-ink-'));
  const r = core.newVideo('twice', { cwd: tmp });
  const opts = require('./opts')();
  const a = await core.frames(r.dir, Object.assign({ outDir: path.join(r.dir, 'rig', '_a') }, opts));
  const b = await core.frames(r.dir, Object.assign({ outDir: path.join(r.dir, 'rig', '_b') }, opts));
  assert.deepStrictEqual(b.times, a.times);
  assert.strictEqual(a.files.length, 22, 'the starter samples 22 stills: 16 before step 4, the figure, the stroke, the pointer and the first typed character, and the two recap beats of part 3');
  assert.ok(a.times.includes(27.3) === false && a.times.includes(41.3), 'typing lands as one sampled still at its first character, not one per character');
  let same = 0;
  for (let i = 0; i < a.files.length; i++) {
    assert.ok(fs.readFileSync(a.files[i]).equals(fs.readFileSync(b.files[i])), 'renders differ at ' + path.basename(a.files[i]));
    same++;
  }
  console.log(same + ' of ' + a.files.length + ' stills identical across two browser sessions (engine ' + a.engine + ')');
});

test('a stroke draws itself over --stroke-draw, in rendered frames', async () => {
  /* Found 5 October 2026 by a person watching the MP4: the circle appeared whole. Two causes in the
     engine: the start state was written as a transition (0 to L) and the change to 0 reversed it at
     once; and the seek's bake wrote an inline value that lost to the drawn rule's !important. Both
     fixed in 0.4.2. This counts the stroke's pixels at the beat, mid-draw and after. */
  const { PNG } = require('pngjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-ink-'));
  const r = core.newVideo('drawn', { cwd: tmp });
  const opts = require('./opts')();
  const beat = 24 + 9;   /* the circle round Category: t2 + 9.0 in the starter's timeline */
  const f = await core.frames(r.dir, Object.assign({ times: [beat, beat + 0.3, beat + 0.9] }, opts));
  const strokePixels = (file) => { const png = PNG.sync.read(fs.readFileSync(file)); let n = 0; for (let i = 0; i < png.data.length; i += 4) { const R = png.data[i], G = png.data[i + 1], B = png.data[i + 2]; if (R > 160 && G > 50 && G < 130 && B < 90) n++; } return n; };   /* the burnt orange highlight, #d4561e, and nothing else on that screen */
  const [at0, mid, done] = f.files.map(strokePixels);
  assert.ok(at0 < done * 0.05, 'at the beat the stroke has barely begun: ' + at0 + ' px against ' + done + ' when drawn');
  assert.ok(mid > done * 0.2 && mid < done * 0.8, 'at 0.3 s of 0.6 the stroke is part way: ' + mid + ' of ' + done);
  assert.ok(done > 2000, 'the drawn circle has substance: ' + done + ' px');
  console.log('circle pixels: ' + at0 + ' at the beat, ' + mid + ' mid-draw, ' + done + ' drawn');
});
