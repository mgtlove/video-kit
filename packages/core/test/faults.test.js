// Proof for engine 0.4.3: a beat that names an id or a state the screen does not have is
// recorded, not thrown and not swallowed. A video from the starter gets four bad beats added
// to its timeline (a camera target, a card, a stroke and a state that do not exist); the page
// still seeks to the end, VK.faults names each miss once with its beat's time, and the good
// beats still fire. Then vkit check reports the misses in its beats-on-screen row.
// Needs a browser. About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const render = require('../src/adapters/render');

test('a beat naming something not on screen is recorded in VK.faults and reported by check', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-faults-'));
  const r = core.newVideo('faulty', { cwd: tmp });
  const page = path.join(r.dir, 'rig', 'index.html');
  let html = fs.readFileSync(page, 'utf8');
  const bad = "  at(1.0, function () { focusEl('nowhere'); card(COPY.cardField, 'nowhere'); ink('circle', 'nowhere-2'); });\n  at(2.0, function () { show('nowhere'); state('no-such-state'); });\n";
  html = html.replace(/(\nfunction timeline\(\) \{\n)/, '$1' + bad);
  assert.notStrictEqual(html.indexOf(bad), -1, 'the bad beats went into the timeline');
  fs.writeFileSync(page, html);
  const opts = require('./opts')();
  const out = await render.survey(path.join(r.dir, 'rig'), [0.5, 2.5, 30], function () { return { faults: window.VK.faults(), version: window.VK.version, mockOn: document.getElementById('mock').classList.contains('on') }; }, opts);
  assert.strictEqual(out[0].data.faults.length, 0, 'nothing missing before the bad beats fire');
  const f = out[1].data.faults;
  const keys = f.map((x) => x.fn + ':' + x.id).sort();
  assert.deepStrictEqual(keys, ['card:nowhere', 'focusEl:nowhere', 'ink:nowhere-2', 'show:nowhere'], 'each miss once, by name: ' + JSON.stringify(f));
  assert.ok(f.every((x) => x.t === 1 || x.t === 2), 'each miss carries its beat time: ' + JSON.stringify(f));
  assert.strictEqual(out[1].data.mockOn, true, 'an inline screen has no STATES, so state() of any id shows it and is not a miss');
  assert.strictEqual(out[2].data.faults.length, 4, 'the later good beats add no faults and the page reaches the end');
  assert.strictEqual(out[2].data.version, '0.5.0');
  // the checker's row
  const report = await core.check(r.dir, Object.assign({ quick: true }, opts));
  const row = report.groups.footage.find((x) => x.id === 'beats-on-screen');
  assert.ok(row && row.result === 'fail', JSON.stringify(row));
  assert.ok(/focusEl\("nowhere"\) at 1\.0 s/.test(row.measured) && /show\("nowhere"\) at 2\.0 s/.test(row.measured), row.measured);
});

test('in an app-backed video a state the app does not have is a recorded miss and nothing is shown', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-faults-app-'));
  process.env.VKIT_APPS = path.join(tmp, 'apps');
  const r = core.newVideo('backed', { cwd: tmp, app: 'example/placeholder' });
  const page = path.join(r.dir, 'rig', 'index.html');
  let html = fs.readFileSync(page, 'utf8');
  html = html.replace(/(\nfunction timeline\(\) \{\n)/, "$1  at(1.0, function () { state('no-such-state'); });\n");
  fs.writeFileSync(page, html);
  const out = await render.survey(path.join(r.dir, 'rig'), [1.5, 24.5], function () { return { faults: window.VK.faults(), mockOn: document.getElementById('mock').classList.contains('on'), inner: document.getElementById('mock').innerHTML.length }; }, require('./opts')());
  assert.deepStrictEqual(out[0].data.faults.map((x) => x.fn + ':' + x.id + '@' + x.t), ['state:no-such-state@1']);
  assert.strictEqual(out[0].data.mockOn, false, 'nothing is shown for a state the app does not have');
  assert.strictEqual(out[1].data.mockOn, true, "the starter's own beat still shows the app's work-item state at 24.2 s");
  assert.ok(out[1].data.inner > 100);
});
