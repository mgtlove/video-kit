// Proof for the brief request and the storyboard coverage row (step 10c).
//   1. vkit brief on an app-backed video writes brief-request.md with every state the app has,
//      by the core call and by the command line itself (inside the folder and with a path),
//      what to hand back, and the storyboard header; on an inline video it says there is no app
//   2. vkit check's storyboard-covered row fails on a row that names a state the app does not
//      have, naming the part and the sentence, and passes once every named state exists
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
  const rows = (bad) => '\n| 1 | Every task starts somewhere. | 0.0 | scene opener | rest | | |\n| 2 | Here is where you set it. | 0.0 | state work-item, the form | rest | | |\n| 2 | The category field is where it starts. | 4.1 | state ' + (bad ? 'work-itm' : 'work-item') + ', the Category field | push on r1 | | |\n';
  fs.writeFileSync(sb, head + rows(true));
  const opts = require('./opts')({ quick: true });
  let report = await core.check(backed.dir, opts);
  let row = report.groups.craft.find((x) => x.id === 'storyboard-covered');
  assert.ok(row && row.result === 'fail' && /part 2 "The category field is where it/.test(row.measured) && /names state work-itm, which the app does not have/.test(row.measured), JSON.stringify(row));
  fs.writeFileSync(sb, head + rows(false));
  report = await core.check(backed.dir, opts);
  row = report.groups.craft.find((x) => x.id === 'storyboard-covered');
  assert.ok(row && row.result === 'pass' && /2 rows name a state the app has/.test(row.measured) && !/neither/.test(row.measured), JSON.stringify(row));
  console.log('brief: ' + r.states + ' state listed; covered: ' + row.measured);
});
