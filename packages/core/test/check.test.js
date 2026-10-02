// Proof for roadmap step 6: vkit check tells footage from not-footage and
// well made from not, by rule id, and fidelity is a measurement.
//   1. the starter passes a full check (seek-correct and flashing included)
//   2. a copy with four deliberate breaks fails on exactly those rules:
//      a 40 px heading (C-TYPE-3), a kicker pushed outside title safe
//      (C-COMP-1), an https:// url in the theme (offline), and part 3's
//      beats removed so the opener holds 17.8 s (C-PACE-7)
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
  const opts = { channel: process.env.PW_CHANNEL || undefined };
  const report = await core.check(r.dir, opts);
  const failing = rowsOf(report).filter((x) => x.result === 'fail').map((x) => x.id + ': ' + x.measured);
  console.log(rowsOf(report).length + ' rows: ' + ['pass', 'fail', 'info', 'not measured'].map((k) => rowsOf(report).filter((x) => x.result === k).length + ' ' + k).join(', '));
  assert.deepStrictEqual(failing, [], 'the starter fails rules: ' + failing.join(' | '));
  for (const id of ['offline', 'seekable', 'deterministic', 'seek-equals-playback', 'text-floor', 'line-length', 'title-safe', 'accent-share', 'still-run', 'flashing', 'sentences-match', 'text-contrast', 'stroke-contrast']) assert.strictEqual(rowById(report, id).result, 'pass', id);
  assert.ok(fs.existsSync(report.file));
});

test('four deliberate breaks are caught by rule id', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-check-'));
  const r = core.newVideo('broken', { cwd: tmp });
  const opts = { quick: true, channel: process.env.PW_CHANNEL || undefined };
  const html = path.join(r.dir, 'rig', 'index.html'), theme = path.join(r.dir, 'rig', 'theme.css');
  let page = fs.readFileSync(html, 'utf8');
  page = page.replace('</style>', '.big{font-size:40px !important}\n.kick{margin-left:-140px}\n</style>');            /* a heading under the floor; a kicker outside title safe */
  page = page.split('\n').filter((l) => !/t3 \+ 6\.0|t3 \+ 11\.0/.test(l)).join('\n');                               /* part 3 holds 17.8 s */
  fs.writeFileSync(html, page);
  fs.appendFileSync(theme, '\n.never-used{background-image:url(https://example.invalid/a.png)}\n');                   /* an online reference (never fetched) */
  const report = await core.check(r.dir, opts);
  const failing = rowsOf(report).filter((x) => x.result === 'fail').map((x) => x.id).sort();
  console.log('broken copy fails: ' + failing.join(', '));
  assert.deepStrictEqual(failing, ['offline', 'still-run', 'text-floor', 'title-safe']);
  assert.ok(rowById(report, 'text-floor').rules.includes('C-TYPE-3') && /40 px/.test(rowById(report, 'text-floor').measured));
  assert.ok(rowById(report, 'title-safe').rules.includes('C-COMP-1') && /#k1|#k2/.test(rowById(report, 'title-safe').measured));
  assert.ok(rowById(report, 'still-run').rules.includes('C-PACE-7') && /17\.8/.test(rowById(report, 'still-run').measured));
  assert.ok(/example\.invalid/.test(rowById(report, 'offline').measured));
});

test('fidelity scores a state against its capture and responds to a worse one', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-check-'));
  process.env.VKIT_APPS = path.join(tmp, 'apps');
  const opts = { quick: true, channel: process.env.PW_CHANNEL || undefined };
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
