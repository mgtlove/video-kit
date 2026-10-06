// Proof for the fidelity rows that look at a state the way a person does (step 10b, after the
// first side-by-sides were looked at): text drawn over other text or over a picture, a line
// running past the box it sits in, and a face named first in a stack that the browser does not
// have. A throwaway app with two states, both citing a capture (a blank picture; the similarity
// row is not what is proved here): `bad` has an Info placed over a heading, a line that runs
// past its card and a stack whose first two faces do not exist; `good` has the same content
// with the Info running after the heading and the line inside the card. Needs a browser. About 40 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');

test('check sees text over text, text past its box and a missing face, and passes the same content laid out right', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-fidelity-'));
  const apps = path.join(tmp, 'apps'), app = path.join(apps, 'test', 'overlap');
  process.env.VKIT_APPS = apps;
  fs.mkdirSync(path.join(app, 'states'), { recursive: true }); fs.mkdirSync(path.join(app, 'captures'));
  fs.writeFileSync(path.join(app, 'app.json'), JSON.stringify({ name: 'overlap', family: 'test', title: 'Overlap test', version: '0.0.1' }));
  fs.writeFileSync(path.join(app, 'tokens.css'), '#mock{--p-ui:"No Such Face Here","Nor This One",sans-serif;--p-ground:#fff}\n');
  fs.writeFileSync(path.join(app, 'screen.css'), '#mock{position:relative;width:1920px;height:1080px;background:#fff;font:14px/20px var(--p-ui);color:#111}\n#mock .t-card{position:absolute;left:100px;top:100px;width:300px;height:60px;border:1px solid #000}\n#mock .t-line{position:absolute;left:10px;top:10px;white-space:nowrap}\n#mock h1{position:absolute;left:100px;top:300px;margin:0;font:700 24px/30px var(--p-ui)}\n#mock .t-info{font:700 12px/16px var(--p-ui);color:#06c}\n');
  const line = 'A long line of text that runs well past the right edge of the card it sits in';
  fs.writeFileSync(path.join(app, 'states', 'bad.html'), `<div class="t-card" id="card"><span class="t-line" id="line">${line}</span></div><h1 id="head">Heading</h1><span class="t-info" id="info" style="position:absolute;left:150px;top:306px">Info</span>`);
  fs.writeFileSync(path.join(app, 'states', 'good.html'), `<div class="t-card" id="card"><span class="t-line" id="line">A line that fits</span></div><h1 id="head">Heading<span class="t-info" id="info" style="margin-left:11px">Info</span></h1>`);
  const { PNG } = require('pngjs');
  const blank = new PNG({ width: 1920, height: 1080 }); blank.data.fill(255); fs.writeFileSync(path.join(app, 'captures', 'CAP-001.png'), PNG.sync.write(blank));
  fs.writeFileSync(path.join(app, 'manifest.csv'), 'id,file,screen,state,capture,captured_on,note\nbad,bad.html,Test,laid out wrong,CAP-001.png,2026-10-06,\ngood,good.html,Test,laid out right,CAP-001.png,2026-10-06,\n');
  const r = core.newVideo('v', { cwd: tmp, app: 'test/overlap' });
  const report = await core.check(r.dir, require('./opts')({ quick: true }));
  const rows = Object.fromEntries(report.groups.fidelity.map((x) => [x.id, x]));
  assert.strictEqual(rows['state:bad:overlaps'].result, 'fail', JSON.stringify(rows['state:bad:overlaps']));
  assert.ok(/#head "Heading" over #info "Info"|#info "Info" over #head "Heading"/.test(rows['state:bad:overlaps'].measured), rows['state:bad:overlaps'].measured);
  assert.strictEqual(rows['state:bad:overflow'].result, 'fail', JSON.stringify(rows['state:bad:overflow']));
  assert.ok(/#line .* runs \d+ px past #card/.test(rows['state:bad:overflow'].measured), rows['state:bad:overflow'].measured);
  assert.strictEqual(rows.faces.result, 'fail', JSON.stringify(rows.faces));
  assert.ok(/"No Such Face Here" is named first but not available/.test(rows.faces.measured) && !/Nor This One"$/.test(rows.faces.measured), rows.faces.measured);
  assert.strictEqual(rows['state:good:overlaps'].result, 'pass', JSON.stringify(rows['state:good:overlaps']));
  assert.strictEqual(rows['state:good:overflow'].result, 'pass', JSON.stringify(rows['state:good:overflow']));
  console.log('bad: ' + rows['state:bad:overlaps'].measured + ' | ' + rows['state:bad:overflow'].measured + ' | ' + rows.faces.measured);
});
