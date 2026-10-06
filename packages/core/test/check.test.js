// Proof for roadmap step 6: vkit check tells footage from not-footage and
// well made from not, by rule id, and fidelity is a measurement.
//   1. the starter passes a full check (seek-correct and flashing included)
//   2. a copy with five deliberate breaks fails on exactly those rules:
//      a 40 px heading (C-TYPE-3), a kicker pushed outside title safe
//      (C-COMP-1), an https:// url in the theme (offline), part 3's beats
//      removed so the opener holds 17.8 s (C-PACE-7), and the explanation
//      card made 93 percent translucent over the screen (surface-opaque,
//      docs/FINDINGS.md F1)
//   3. an app state checked against a capture of itself scores 1.000; against
//      the same capture shifted 12 px and blurred it scores lower; the
//      side-by-side image exists
// Needs playwright, pngjs and ffmpeg. About five minutes: the full check plays
// three moments for real and samples the run at 10 fps.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const render = require('../src/adapters/render');

const rowsOf = (report) => Object.values(report.groups).flat();
const rowById = (report, id) => rowsOf(report).find((r) => r.id === id);

test('the starter passes a full check', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-check-'));
  const r = core.newVideo('proof', { cwd: tmp });
  const opts = require('./opts')();
  const report = await core.check(r.dir, opts);
  const failing = rowsOf(report).filter((x) => x.result === 'fail').map((x) => x.id + ': ' + x.measured);
  console.log(rowsOf(report).length + ' rows: ' + ['pass', 'fail', 'info', 'not measured'].map((k) => rowsOf(report).filter((x) => x.result === k).length + ' ' + k).join(', '));
  assert.deepStrictEqual(failing, [], 'the starter fails rules: ' + failing.join(' | '));
  for (const id of ['offline', 'seekable', 'deterministic', 'seek-equals-playback', 'text-floor', 'line-length', 'title-safe', 'accent-share', 'still-run', 'flashing', 'sentences-match', 'text-contrast', 'stroke-contrast']) assert.strictEqual(rowById(report, id).result, 'pass', id);
  assert.ok(fs.existsSync(report.file));
});

test('five deliberate breaks are caught by rule id', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-check-'));
  const r = core.newVideo('broken', { cwd: tmp });
  const opts = require('./opts')({ quick: true });
  const html = path.join(r.dir, 'rig', 'index.html'), theme = path.join(r.dir, 'rig', 'theme.css');
  let page = fs.readFileSync(html, 'utf8');
  page = page.replace('</style>', '.big{font-size:40px !important}\n.kick{margin-left:-140px}\n</style>');            /* a heading under the floor; a kicker outside title safe */
  page = page.split('\n').filter((l) => !/t3 \+ 6\.0|t3 \+ 11\.0/.test(l)).join('\n');                               /* part 3 holds 17.8 s */
  fs.writeFileSync(html, page);
  fs.appendFileSync(theme, '\n.never-used{background-image:url(https://example.invalid/a.png)}\n:root{--panel:#101211ee}\n');   /* an online reference (never fetched); a see-through card */
  const report = await core.check(r.dir, opts);
  const failing = rowsOf(report).filter((x) => x.result === 'fail').map((x) => x.id).sort();
  console.log('broken copy fails: ' + failing.join(', '));
  assert.deepStrictEqual(failing, ['offline', 'still-run', 'surface-opaque', 'text-floor', 'title-safe']);
  assert.ok(/#card at 93 percent over the recreated screen/.test(rowById(report, 'surface-opaque').measured), rowById(report, 'surface-opaque').measured);
  assert.ok(rowById(report, 'text-floor').rules.includes('C-TYPE-3') && /40 px/.test(rowById(report, 'text-floor').measured));
  assert.ok(rowById(report, 'title-safe').rules.includes('C-COMP-1') && /#k1|#k2/.test(rowById(report, 'title-safe').measured));
  assert.ok(rowById(report, 'still-run').rules.includes('C-PACE-7') && /17\.8/.test(rowById(report, 'still-run').measured));
  assert.ok(/example\.invalid/.test(rowById(report, 'offline').measured));
});

test('fidelity scores a state against its capture and responds to a worse one', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-check-'));
  process.env.VKIT_APPS = path.join(tmp, 'apps');
  const opts = require('./opts')({ quick: true });
  const seed = core.newVideo('seed', { cwd: tmp });
  core.apps.appExtract(seed.dir, 'test/fid', 'work-item');
  const appDir = path.join(tmp, 'apps', 'test', 'fid');
  // the capture: the state itself, shot the way the checker shoots it
  const pose = function (id) { var st = document.getElementById('stage'); window.VK.reset(); st.classList.add('snap'); window.fade(true); window.state(id); window.home(); void st.offsetHeight; st.classList.remove('snap'); };
  const backedFirst = core.newVideo('backed', { cwd: tmp, app: 'test/fid' });
  const shot = await render.shoot(path.join(backedFirst.dir, 'rig'), pose, 'work-item', opts);
  fs.writeFileSync(path.join(appDir, 'captures', 'CAP-001.png'), shot);
  fs.writeFileSync(path.join(appDir, 'manifest.csv'), 'id,file,screen,state,capture,captured_on,note\nwork-item,work-item.html,work item,empty,CAP-001.png,2026-10-02,the state shot as its own capture\n');
  const backed = core.newVideo('backed2', { cwd: tmp, app: 'test/fid' });
  const same = await core.check(backed.dir, opts);
  const row1 = rowById(same, 'state:work-item');
  console.log('fidelity against itself: ' + row1.score + ' over ' + rowById(same, 'state:work-item').coverage + ' percent of the screen with structure');
  assert.ok(row1.score >= 0.99, 'a state against a capture of itself: ' + row1.score);
  assert.ok(row1.coverage >= 1, 'the state has structure to compare (' + row1.coverage + ' percent of windows); a 1.000 over nothing would be vacuous');
  const statePng = require('pngjs').PNG.sync.read(fs.readFileSync(path.join(backed.dir, 'out', 'fidelity', 'work-item-state.png')));
  let lo = 255, hi = 0; for (let i = 0; i < statePng.data.length; i += 4) { lo = Math.min(lo, statePng.data[i]); hi = Math.max(hi, statePng.data[i]); }
  assert.ok(hi - lo > 100, 'the state shot is a screen, not a dark frame (red channel spans ' + lo + ' to ' + hi + ')');
  assert.ok(fs.existsSync(path.join(backed.dir, 'out', 'fidelity', 'work-item.png')), 'the side-by-side exists');
  // a worse capture: shifted 12 px and blurred
  const cap = path.join(appDir, 'captures', 'CAP-001.png'), shifted = path.join(appDir, 'captures', 'CAP-001-worse.png');
  const worse = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', cap, '-vf', 'crop=1908:1068:12:12,pad=1920:1080:0:0,boxblur=3', shifted]);
  assert.strictEqual(worse.status, 0, String(worse.stderr));
  fs.renameSync(shifted, cap);
  const diff = await core.check(backed.dir, opts);
  const row2 = rowById(diff, 'state:work-item');
  console.log('fidelity against a shifted, blurred capture: ' + row2.score);
  assert.ok(row2.score < row1.score - 0.1, 'a worse capture scores clearly lower: ' + row2.score + ' vs ' + row1.score);
});

test('a stroke is measured against each surface it sits on, worst surface first', () => {
  /* Found 5 October 2026 when strokes began to draw: the old measure averaged every pixel in the
     stroke's box into one colour, so a frame round a paper card on a dark ground was judged against
     a grey it never touched (2.93:1) while it held 3.5:1 on the paper and 4.5:1 on the ground. */
  const { PNG } = require('pngjs');
  const checkMod = require('../src/check');
  const png = new PNG({ width: 400, height: 120 });
  const fill = (x0, x1, y0, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * 400 + x) * 4; png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255; } };
  const dark = [16, 21, 18], paper = [243, 241, 234], orange = [212, 86, 30], grey = [137, 142, 153];
  fill(0, 200, 0, 120, dark); fill(200, 400, 0, 120, paper); fill(20, 380, 56, 64, orange);   /* one stroke across both surfaces */
  const both = checkMod.strokeContrast(png, { color: orange, box: { l: 20, t: 56, r: 380, b: 64 } });
  assert.ok(Math.abs(both - checkMod.ratio(orange, paper)) < 0.05, 'the worst surface is the paper: ' + both + ' vs ' + checkMod.ratio(orange, paper));
  assert.ok(both >= 3, 'and it holds 3:1: ' + both);
  fill(0, 400, 0, 120, grey); fill(20, 380, 56, 64, orange);   /* the same stroke on a mid grey */
  const onGrey = checkMod.strokeContrast(png, { color: orange, box: { l: 20, t: 56, r: 380, b: 64 } });
  assert.ok(onGrey < 3 && Math.abs(onGrey - checkMod.ratio(orange, grey)) < 0.05, 'on a grey it fails by the grey\'s own ratio: ' + onGrey);
  fill(0, 200, 0, 120, dark); fill(200, 400, 0, 120, paper); fill(20, 200, 56, 64, orange);   /* half drawn: only the dark half carries stroke */
  const half = checkMod.strokeContrast(png, { color: orange, box: { l: 20, t: 56, r: 380, b: 64 } });
  assert.ok(Math.abs(half - checkMod.ratio(orange, dark)) < 0.05, 'a half-drawn stroke is measured where it is: ' + half + ' vs ' + checkMod.ratio(orange, dark));
  console.log('stroke on dark and paper: ' + both.toFixed(2) + ' (the paper); on grey: ' + onGrey.toFixed(2) + '; half drawn on the dark: ' + half.toFixed(2));
});
