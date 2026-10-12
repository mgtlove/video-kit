// Proof for maintenance (docs/MAINTENANCE.md, milestone A2): an app is the hub, its videos and twins are spokes.
//   1. in a workspace with the test app and two videos made on it: vkit status lists the app (states, model, path,
//      captures, CHANGES.md current, no twin yet) and both videos current
//   2. the app moves to 0.1.1 (a state changed, app.json bumped, a CHANGES.md line): status shows both videos behind
//      with the line they have not seen; a video's quick check fails app-copy-current and says what moved
//   3. vkit app use --all brings both up, prints the line, runs each one's quick check; status is clean again and
//      the check row passes
//   4. the expert first: a capture newer than the states puts the app on the subject expert in vkit handoffs until
//      what-changed.md is written, then on the director
//   5. vkit app build verifies the states: the hand-written app passes; a state naming a crop that is not there fails
//      by name, exit 1
//   6. the twin built is current in status; the app bumped again with no CHANGES.md line is named, and the twin behind
// Needs a browser for the checks. About 60 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const { writeApp } = require('./form-app');

const KIT = path.join(__dirname, '..', '..', '..');
const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');
const run = (cwd, args) => spawnSync(process.execPath, [VKIT, ...args], { cwd, encoding: 'utf8', env: Object.assign({}, process.env, { VKIT_QUIET: '1' }) });

test('status, the sweep, the stale-copy row, the expert first, app build: the hub and its spokes', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-maint-'));
  const apps = path.join(tmp, 'apps'); process.env.VKIT_APPS = apps;
  const appDir = writeApp(apps);
  fs.writeFileSync(path.join(appDir, 'CHANGES.md'), '# Changes: test/form\n\n- 0.1.0 (2026-10-09): the first five states, invented for the proofs.\n');
  fs.mkdirSync(path.join(appDir, 'captures'), { recursive: true });
  fs.writeFileSync(path.join(appDir, 'captures', 'CAP-010.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const past = new Date(Date.now() - 86400000); fs.utimesSync(path.join(appDir, 'captures', 'CAP-010.png'), past, past); fs.utimesSync(path.join(appDir, 'manifest.csv'), new Date(Date.now() - 3600000), new Date(Date.now() - 3600000));
  const videos = path.join(tmp, 'videos'); fs.mkdirSync(videos);
  for (const n of ['one', 'two']) { const r = run(videos, ['new', n, '--app', 'test/form']); assert.strictEqual(r.status, 0, r.stderr); }
  // 1. everything current
  let s = core.status(tmp);   /* apps beside the kit are listed too (the kit's own apps/ folder, when there is one); the test app is found by name */
  const hub = () => s.apps.find((a) => a.ref === 'test/form');
  assert.deepStrictEqual([hub().version, hub().built, hub().states, hub().transitions, hub().paths, hub().captures, hub().changes, hub().logged, hub().twin, s.videos.length, s.behind], ['0.1.0', 5, 6, 10, ['walk'], 1, 1, true, null, 2, 0], 'the hub and two current spokes: ' + JSON.stringify(s));
  let text = core.formatStatus(s);
  assert.ok(/test\/form  0\.1\.0, 5 of 6 states built, 10 transitions, 1 path \(walk\), 1 captures to CAP-010; CHANGES\.md: 1 line, current/.test(text) && /twin: not built \(vkit twin test\/form\)/.test(text) && /one  engine \d+\.\d+\.\d+ \(current\); app test\/form 0\.1\.0 \(current\); never checked/.test(text) && /Nothing is behind\./.test(text), text);
  // 2. the app moves: a state changed, the version bumped, the line written
  fs.appendFileSync(path.join(appDir, 'states', 'done.html'), '<span class="t" id="extra" style="left:200px;top:300px">Also this</span>');
  const appJson = path.join(appDir, 'app.json'); const aj = JSON.parse(fs.readFileSync(appJson, 'utf8')); aj.version = '0.1.1'; fs.writeFileSync(appJson, JSON.stringify(aj, null, 2));
  fs.writeFileSync(path.join(appDir, 'CHANGES.md'), '# Changes: test/form\n\n- 0.1.1 (2026-10-12): the Done screen gains a line, from CAP-010.\n- 0.1.0 (2026-10-09): the first five states, invented for the proofs.\n');
  s = core.status(tmp); text = core.formatStatus(s);
  assert.ok(s.behind === 2 && s.videos.every((v) => v.app.current === false && v.app.since.length === 1 && v.app.since[0].version === '0.1.1') && /app test\/form 0\.1\.0 \(behind 0\.1\.1: 1 change since; vkit app use test\/form\)/.test(text) && /0\.1\.1 \(2026-10-12\): the Done screen gains a line, from CAP-010\./.test(text) && /2 copies are behind\. vkit app use --all/.test(text), text);
  const opts = require('./opts')();
  let report = await core.check(path.join(videos, 'one'), { quick: true, channel: opts.channel, progress: opts.progress });
  let rowC = report.groups.fidelity.find((r) => r.id === 'app-copy-current');
  assert.ok(rowC && rowC.result === 'fail' && /the copy is 0\.1\.0, the app is 0\.1\.1: 0\.1\.1 the Done screen gains a line/.test(rowC.measured), 'a stale copy fails by name: ' + JSON.stringify(rowC));
  // 3. the sweep
  // (the starter's own timeline on the test app fails rows of its own, beats-on-screen among them: the sweep names them, exits 1, and the copies are current all the same)
  const sw = run(tmp, ['app', 'use', '--all', 'test/form']);
  assert.strictEqual(sw.status, 1, sw.stderr + sw.stdout);
  assert.ok(/one: test\/form 0\.1\.0 to 0\.1\.1; check: \d+ rows, \d+ failing \(beats-on-screen/.test(sw.stdout) && /two: test\/form 0\.1\.0 to 0\.1\.1/.test(sw.stdout) && /    0\.1\.1 \(2026-10-12\): the Done screen gains a line/.test(sw.stdout) && /2 videos swept, 2 with a failing check: look at the rows, then the frames\./.test(sw.stdout), sw.stdout);
  s = core.status(tmp); text = core.formatStatus(s);
  assert.ok(s.behind === 0 && s.videos.every((v) => v.app.current && v.lastCheck && v.lastCheck.failures > 0 && v.lastCheck.quick) && /last check \d{4}-\d\d-\d\d \(quick\): \d+ rows, \d+ failing/.test(text) && /Nothing is behind\./.test(text), text);
  report = JSON.parse(fs.readFileSync(path.join(videos, 'one', 'out', 'check.json'), 'utf8'));
  rowC = report.groups.fidelity.find((r) => r.id === 'app-copy-current');
  assert.ok(rowC && rowC.result === 'pass' && /the copy is at 0\.1\.1/.test(rowC.measured), JSON.stringify(rowC));
  const one = run(path.join(videos, 'one'), ['app', 'use', 'test/form']);
  assert.ok(/refreshed test\/form 0\.1\.1 \(already current\): 6 states\./.test(one.stdout) && !/Since/.test(one.stdout), 'a current copy prints no changes: ' + one.stdout);
  // 4. the expert first
  const now = new Date(); fs.utimesSync(path.join(appDir, 'captures', 'CAP-010.png'), now, now);
  let h = run(tmp, ['handoffs']).stdout;
  assert.ok(/app test\/form: subject expert \(video-brief\): 1 capture newer than the states \(CAP-010\): say what changed in the product and what it means for each lesson, as what-changed\.md in the app folder, before any state is touched/.test(h), h);
  fs.writeFileSync(path.join(appDir, 'what-changed.md'), '# What changed in Test form\n\nCAP-010: the refusal reads differently; the lesson\'s refused row still holds.\n');
  h = run(tmp, ['handoffs']).stdout;
  assert.ok(/app test\/form: director \(video-recreate\): what-changed\.md is in; captures newer than manifest\.csv wait for states, then app\.json bumped, the CHANGES\.md line, vkit app build and vkit app use --all/.test(h), h);
  // 5. app build
  let b = run(tmp, ['app', 'build', 'test/form']);
  assert.ok(b.status === 0 && /test\/form 0\.1\.1: no generator; the states are written by hand; 5 of 6 states built, captured and not built: ghost\./.test(b.stdout) && /Next, after a state changes: bump app\.json/.test(b.stdout), b.stdout + b.stderr);
  fs.appendFileSync(path.join(appDir, 'states', 'empty.html'), '<img src="app/crops/nope.png" alt="">');
  b = run(tmp, ['app', 'build', 'test/form']);
  assert.ok(b.status === 1 && /Crops named that are not in crops\/: empty: nope\.png\./.test(b.stdout) && /Fix the above before any spoke takes this version\./.test(b.stdout), b.stdout + b.stderr);
  // 6. the twin in status; a version with no line; the twin behind
  assert.strictEqual(run(tmp, ['twin', 'test/form', '--build']).status, 0);
  s = core.status(tmp); text = core.formatStatus(s);
  assert.ok(hub().twin && hub().twin.current && /twin: built on engine \d+\.\d+\.\d+, app 0\.1\.1, current/.test(text), text);
  aj.version = '0.1.2'; fs.writeFileSync(appJson, JSON.stringify(aj, null, 2));
  s = core.status(tmp); text = core.formatStatus(s);
  assert.ok(!hub().logged && s.unlogged.includes('test/form') && !hub().twin.current && /CHANGES\.md: 2 lines, no line for 0\.1\.2/.test(text) && /twin: behind: built on engine \d+\.\d+\.\d+, app 0\.1\.1 \(app 0\.1\.2\); vkit twin test\/form --build/.test(text) && /\(behind 0\.1\.2: no CHANGES\.md line says what moved; vkit app use test\/form\)/.test(text) && /CHANGES\.md wants a line for the current version of: test\/form\./.test(text), text);
  console.log('maintenance: status (hub and two spokes), the app moved 0.1.0 to 0.1.1, app-copy-current failed by name then passed, the sweep brought both up with their checks, the expert first in handoffs, app build verified and refused a missing crop, the twin current then behind, an unlogged version named');
});
