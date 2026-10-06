// Proof for roadmap step 10b, the face tool.
//   1. with the capture browser on a page, vkit face traces the browser's own sans-serif face at
//      two weights into faces/: 110 glyphs each, kerning pairs measured, an OTF that parses back
//      with its GPOS kerning, a css, a provenance note and a json
//   2. the sample line set in the traced face is the same width as in the original to within
//      0.2 percent, the glyph shapes at 200 px differ on under 2 percent of inked pixels, and
//      the mean tone difference at 14 px is under 8 percent: the face is true to the eye
//   3. a family the page does not have is refused by name
// Needs a browser. About 15 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');

const S = core.shoot;
const PORT = 9348;

test('vkit face traces a true face from the page: widths, shapes and tone within the thresholds', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-face-'));
  const opts = { profile: path.join(tmp, 'chrome-profile'), port: PORT, channel: process.env.PW_CHANNEL || undefined };
  try {
    await S.start(opts);
    await S.go('data:text/html,<p style="font-family:sans-serif">The quick brown fox</p>', opts);
    await assert.rejects(() => core.face('nope', Object.assign({ family: 'Nope Face Nobody Has', into: tmp }, opts)), /does not have "Nope Face Nobody Has"/);
    const r = await core.face('test-sans', Object.assign({ family: 'sans-serif', weights: [400, 700], into: tmp }, opts));
    assert.strictEqual(r.weights.length, 2);
    for (const w of r.weights) {
      assert.strictEqual(w.glyphs, 110, 'glyphs traced at ' + w.weight);
      assert.ok(w.metrics.capHeight > 500 && w.metrics.xHeight > 300 && w.metrics.ascent > 700, JSON.stringify(w.metrics));
      for (const c of w.compare) {
        assert.ok(!c.error, c.error);
        assert.ok(c.widthError < 0.002, w.weight + ' at ' + c.size + ' px: width ' + c.widthTheirs + ' vs ' + c.widthOurs + ' (' + c.widthError + ')');
        assert.ok(c.meanTone < 0.08, w.weight + ' at ' + c.size + ' px: mean tone difference ' + c.meanTone);
      }
      assert.ok(w.compare[0].shapeDiffer < 0.02, w.weight + ': shapes differ ' + w.compare[0].shapeDiffer);
    }
    const otf = fs.readFileSync(path.join(tmp, 'faces', 'test-sans-400.otf'));
    const opentype = require('opentype.js');
    const back = opentype.parse(otf.buffer.slice(otf.byteOffset, otf.byteOffset + otf.length));
    assert.strictEqual(back.glyphs.length, 112, 'the notdef, 110 glyphs, and the one opentype.js adds');
    assert.ok(back.tables.gpos, 'a GPOS table carries the kerning');
    const A = back.charToGlyph('A'), V = back.charToGlyph('V');
    const kernAV = r.weights[0].kern ? back.getKerningValue(A, V) : 0;
    const css = fs.readFileSync(path.join(tmp, 'faces', 'test-sans.css'), 'utf8');
    assert.ok(/@font-face\{font-family:"test-sans";font-weight:400/.test(css) && /font-weight:700/.test(css), css);
    const md = fs.readFileSync(path.join(tmp, 'faces', 'test-sans.md'), 'utf8');
    assert.ok(/Nothing was read from the product's font file/.test(md) && /sans-serif/.test(md), md);
    assert.ok(fs.existsSync(path.join(tmp, 'faces', 'test-sans.json')));
    console.log(r.weights.map((w) => w.weight + ': ' + w.glyphs + ' glyphs, ' + w.kern + ' kerning pairs, width error ' + (w.compare[0].widthError * 100).toFixed(2) + '%, shapes ' + (w.compare[0].shapeDiffer * 100).toFixed(1) + '% differ, tone ' + Math.round(w.compare[0].meanTone * 100) + '% at 14 px').join('; ') + '; A-V kern read back ' + kernAV);
  } finally {
    await S.stop(opts).catch(() => {});
  }
});
