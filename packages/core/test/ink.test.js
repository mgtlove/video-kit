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
