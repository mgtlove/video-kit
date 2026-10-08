// Proof for the brief request and the storyboard coverage row (step 10c).
//   1. vkit brief on an app-backed video writes brief-request.md with every state the app has,
//      by the core call and by the command line itself (inside the folder and with a path),
//      what to hand back, and the storyboard header; on an inline video it says there is no app
//   2. vkit check's storyboard-covered row fails on a row that names a state the app does not
//      have, naming the part and the sentence, and passes once every named state exists
//   3. vkit handoffs walks the chain by the files alone: request, answer, narration, fact
//      check, recording; a newer request re-opens a handoff; it reads one video or a folder of them
// Needs a browser for the check. About 40 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const { spawnSync } = require('child_process');
const VKIT = path.join(__dirname, '..', '..', 'cli', 'bin', 'vkit.js');

test('vkit brief writes the ask with the states in it, and check covers the storyboard against them', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-brief-'));
  process.env.VKIT_APPS = path.join(tmp, 'apps');
  const backed = core.newVideo('backed', { cwd: tmp, app: 'example/placeholder' });
  const r = core.briefRequest(backed.dir);
  assert.strictEqual(r.states, 1);
  const text = fs.readFileSync(r.file, 'utf8');
  assert.ok(/^# Brief request: backed/m.test(text) && /\| `work-item` \|/.test(text) && /## What to hand back/.test(text) && /\| Part \| Sentence \| Start \(s\) \| On screen \| Camera \| Card \| Capture \|/.test(text) && /state work-item/.test(text), text.slice(0, 400));
  // the command itself, from inside the folder and from outside it (the first real run died on an
  // undefined name in the CLI that the core call above could never see, 8 October 2026)
  const c1 = spawnSync(process.execPath, [VKIT, 'brief'], { cwd: backed.dir, encoding: 'utf8' });
  assert.strictEqual(c1.status, 0, c1.stdout + c1.stderr);
  assert.ok(/wrote brief-request\.md for backed with 1 state of the app listed/.test(c1.stdout), c1.stdout + c1.stderr);
  const c2 = spawnSync(process.execPath, [VKIT, 'brief', backed.dir], { cwd: tmp, encoding: 'utf8' });
  assert.strictEqual(c2.status, 0, c2.stdout + c2.stderr);
  const inline = core.newVideo('plain', { cwd: tmp });
  const r2 = core.briefRequest(inline.dir);
  assert.strictEqual(r2.states, 0);
  assert.ok(/None\. This video has no recreated app/.test(fs.readFileSync(r2.file, 'utf8')));
  // the coverage row: two rows that name the app's state, one that names a state it lacks, one scene
  const sb = path.join(backed.dir, 'storyboard.md');
  const head = fs.readFileSync(sb, 'utf8').split('\n').filter((l) => !/^\|\s*\d/.test(l)).join('\n');
  // the fourth row sits in part 4, which the starter's three-part rig does not have: coverage still reads it (8 October 2026)
  const rows = (bad) => '\n| 1 | Every task starts somewhere. | 0.0 | scene opener | rest | | |\n| 2 | Here is where you set it. | 0.0 | state work-item, the form | rest | | |\n| 2 | The category field is where it starts. | 4.1 | state ' + (bad ? 'work-itm' : 'work-item') + ', the Category field | push on r1 | | |\n| 4 | And it is saved. | | state work-item, the Save button | rest | | |\n';
  fs.writeFileSync(sb, head + rows(true));
  const opts = require('./opts')({ quick: true });
  let report = await core.check(backed.dir, opts);
  let row = report.groups.craft.find((x) => x.id === 'storyboard-covered');
  assert.ok(row && row.result === 'fail' && /part 2 "The category field is where it/.test(row.measured) && /names state work-itm, which the app does not have/.test(row.measured), JSON.stringify(row));
  fs.writeFileSync(sb, head + rows(false));
  report = await core.check(backed.dir, opts);
  row = report.groups.craft.find((x) => x.id === 'storyboard-covered');
  assert.ok(row && row.result === 'pass' && /3 rows name a state the app has/.test(row.measured) && !/neither/.test(row.measured), JSON.stringify(row));
  const sm = report.groups.craft.find((x) => x.id === 'sentences-match');
  assert.ok(sm && /1 storyboard row in part 4, which the rig does not have \(PARTS has 3\)/.test(sm.measured), JSON.stringify(sm));
  console.log('brief: ' + r.states + ' state listed; covered: ' + row.measured);
});

test('vkit handoffs says what is waiting and for whom, from the files alone', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-handoffs-'));
  process.env.VKIT_APPS = path.join(tmp, 'apps');
  const v = core.newVideo('first', { cwd: tmp, app: 'example/placeholder' });
  core.newVideo('second', { cwd: tmp });
  fs.mkdirSync(path.join(tmp, 'not-a-video'));
  let t = Date.now() - 60000;
  const touch = (rel, text) => { const f = path.join(v.dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text || rel); t += 1000; fs.utimesSync(f, new Date(t), new Date(t)); };
  const touchAt = (f, text, sec) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); const d = new Date(Date.now() + sec * 1000); fs.utimesSync(f, d, d); };
  const one = () => core.handoffs(v.dir)[0];
  const step = (who, skill, re) => { const h = one(); assert.strictEqual(h.who + ' / ' + h.skill, who + ' / ' + skill, JSON.stringify(h)); assert.ok(re.test(h.what), h.what); };
  step('director', 'vkit brief', /app example\/placeholder is in; no brief-request/);
  touch('storyboard.md', fs.readFileSync(path.join(v.dir, 'storyboard.md'), 'utf8'));   /* the starter's rows, dated before everything that follows */
  core.briefRequest(v.dir); touch('brief-request.md', fs.readFileSync(path.join(v.dir, 'brief-request.md'), 'utf8'));
  step('subject expert', 'video-brief', /waits for brief\.md/);
  touch('brief.md', '# Outline'); touch('capture-request.md', 'No pickups.');
  step('director', 'video-script', /expert answered \(capture-request\.md listed; pickups first\)/);
  touch('narration/FULL.md', 'One line.');
  step('subject expert', 'video-fact-check', /FULL\.md waits for fact-check/);
  // the verdicts are read, not the file's presence: open verdicts send it back to the director, then all true to the producer
  touch('fact-check.md', '| Part | Sentence | Verdict | Note |\n|---|---|---|---|\n| 1 | One line. | wrong | says the wrong thing |\n| 1 | Two. | caveat | add a clause |\n| 1 | Three. | true | |\n\ntrue 3, wrong 0 (the counts line lies; the rows are read)');
  step('director', 'video-script, step 5', /1 wrong, 1 caveat to apply/);
  touch('narration/FULL.md', 'One line, fixed.');
  step('subject expert', 'video-fact-check', /waits for fact-check/);
  touch('fact-check.md', '| 1 | One line, fixed. | true | |');
  step('producer', 'video-script, step 6', /checked; the words want a yes/);
  // rows changed after the words: the sentences follow the rows
  touch('storyboard.md', fs.readFileSync(path.join(v.dir, 'storyboard.md'), 'utf8'));
  step('director', 'video-script, step 3', /storyboard\.md is newer than the narration/);
  touch('narration/FULL.md', 'One line, following the rows.'); touch('fact-check.md', '| 1 | One line, following the rows. | true | |');
  step('producer', 'video-script, step 6', /checked; the words want a yes/);
  touch('voice/part-1.m4a', 'x'); touch('voice/part-2.m4a', 'x');
  step('director', 'video-measure', /2 clips in voice/);
  // a redo re-opens the handoff: a newer narration wants a new fact check; a newer request, a new answer
  touch('narration/FULL.md', 'One line, changed.');
  step('subject expert', 'video-fact-check', /waits for fact-check/);
  touch('brief-request.md', 'again');
  step('subject expert', 'video-brief', /waits for brief\.md/);
  // a folder of videos, in name order, skipping folders that are not videos; and the command line
  const all = core.handoffs(tmp, { apps: false });
  assert.deepStrictEqual(all.map((h) => h.name), ['first', 'second']);
  // the idea first: a bare video waits for the expert's brief.md; with it and no app, for the director to bring the app in
  assert.strictEqual(all[1].who + ' / ' + all[1].skill, 'subject expert / video-brief');
  const second = path.join(tmp, 'second');
  fs.writeFileSync(path.join(second, 'brief.md'), '# The idea'); fs.writeFileSync(path.join(second, 'capture-request.md'), 'the screens');
  let h2 = core.handoffs(second)[0];
  assert.strictEqual(h2.who + ' / ' + h2.skill, 'director / vkit app use', JSON.stringify(h2));
  assert.ok(/brief\.md, capture-request\.md\) and no app/.test(h2.what), h2.what);
  // vkit app use: into a video that exists, then up to date, never a second app
  const u1 = core.apps.appUse(second, 'example/placeholder');
  assert.strictEqual(u1.action + ' ' + u1.states.join(','), 'installed work-item');
  const html = fs.readFileSync(path.join(second, 'rig', 'index.html'), 'utf8');
  assert.strictEqual((html.match(/app\/states\.js/g) || []).length, 1, 'the page links the app once');
  h2 = core.handoffs(second)[0];
  assert.strictEqual(h2.skill, 'vkit brief', JSON.stringify(h2));
  // the app grows a state and a version; the video's copy follows, the page is not linked twice.
  // The example app is copied into this test's own apps folder first, so the kit's copy is never touched.
  const kitExample = core.apps.resolveApp('example/placeholder').dir;
  const appDir = path.join(process.env.VKIT_APPS, 'example', 'placeholder');
  fs.cpSync(kitExample, appDir, { recursive: true });
  assert.strictEqual(core.apps.resolveApp('example/placeholder').dir, appDir, 'the test apps folder is found first');
  const aj = path.join(appDir, 'app.json'); const app = JSON.parse(fs.readFileSync(aj, 'utf8')); app.version = '0.2.0'; fs.writeFileSync(aj, JSON.stringify(app, null, 2) + '\n');
  fs.copyFileSync(path.join(appDir, 'states', 'work-item.html'), path.join(appDir, 'states', 'work-done.html'));
  core.apps.appAddState('example/placeholder', 'work-done', { screen: 'Work', state: 'done' });
  const u2 = core.apps.appUse(second, 'example/placeholder');
  assert.strictEqual(u2.action + ' ' + u2.from + ' ' + u2.version + ' ' + u2.added.join(','), 'updated 0.1.0 0.2.0 work-done', JSON.stringify(u2));
  assert.ok(fs.existsSync(path.join(second, 'rig', 'app', 'states', 'work-done.html')));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(second, 'video.json'), 'utf8')).app.version, '0.2.0');
  assert.strictEqual((fs.readFileSync(path.join(second, 'rig', 'index.html'), 'utf8').match(/app\/states\.js/g) || []).length, 1);
  assert.throws(() => core.apps.appUse(second, 'example/other'), /made on example\/placeholder, not example\/other/);
  // an app has its own handoff before any video: the coverage waits for captures, captures for states
  const a = core.apps.appNew('aws/demo');
  assert.deepStrictEqual(core.handoffs(tmp).filter((h) => h.name === 'app aws/demo'), [], 'a quiet app is not listed');
  touchAt(path.join(a.dir, 'capture-request.md'), 'Buckets list; Create bucket form', 10);
  let ah = core.handoffs(tmp).find((h) => h.name === 'app aws/demo');
  assert.ok(ah && ah.who === 'director' && ah.skill === 'capture-walkthrough', JSON.stringify(ah));
  touchAt(path.join(a.dir, 'captures', 'CAP-001.png'), 'png', 20);
  ah = core.handoffs(tmp).find((h) => h.name === 'app aws/demo');
  assert.ok(ah && ah.who === 'director' && ah.skill === 'video-recreate', JSON.stringify(ah));
  touchAt(path.join(a.dir, 'manifest.csv'), fs.readFileSync(path.join(a.dir, 'manifest.csv'), 'utf8'), 30);
  assert.strictEqual(core.handoffs(tmp).find((h) => h.name === 'app aws/demo'), undefined, 'states written: quiet again');
  // the command line
  const c = spawnSync(process.execPath, [VKIT, 'handoffs', tmp], { encoding: 'utf8' });
  assert.strictEqual(c.status, 0, c.stdout + c.stderr);
  assert.ok(/^first: subject expert \(video-brief\): brief-request\.md waits/m.test(c.stdout) && /^second: director \(vkit brief\)/m.test(c.stdout), c.stdout);
  const cu = spawnSync(process.execPath, [VKIT, 'app', 'use', 'example/placeholder', second], { encoding: 'utf8' });
  assert.strictEqual(cu.status, 0, cu.stdout + cu.stderr);
  assert.ok(/brought example\/placeholder up to 0\.2\.0: 2 states/.test(cu.stdout), cu.stdout);
  assert.throws(() => core.handoffs(path.join(tmp, 'not-a-video')), /no video folder/);
  console.log('handoffs: ' + c.stdout.trim().split('\n').join(' | ') + ' | app use: ' + cu.stdout.trim());
});
