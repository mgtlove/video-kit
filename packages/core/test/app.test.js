// Proof for roadmap step 5a: an app-backed video is the same footage as the
// inline one. Three videos from the starter in a temp folder:
//   inline   plain vkit new: the screen built inline in rig/index.html
//   backed   vkit new --app example/placeholder: the kit's example app, whose
//            one state is the starter's screen
//   lifted   vkit app extract on the inline video into a new app in a temp
//            apps folder, then vkit new --app on that (the round trip)
// Every one of the starter's stills (20 since step 4) must be byte for byte identical across
// the three. Also checks the shape of what vkit new --app wrote. About 30 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const render = require('../src/adapters/render');

test('an app-backed video renders the same frames as the inline one, and the round trip holds', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-app-'));
  const apps = path.join(tmp, 'apps');
  process.env.VKIT_APPS = apps;            /* new apps go here, never into the repo; the example app is still found in examples/apps */
  const opts = { channel: process.env.PW_CHANNEL || undefined };

  const inline = core.newVideo('inline', { cwd: tmp });
  const backed = core.newVideo('backed', { cwd: tmp, app: 'example/placeholder' });
  assert.deepStrictEqual(backed.app, { ref: 'example/placeholder', version: '0.1.0', states: ['work-item'] });

  // what --app wrote
  const html = fs.readFileSync(path.join(backed.dir, 'rig', 'index.html'), 'utf8');
  assert.ok(!html.includes('screen:inline'), 'the inline screen block is gone from the app-backed page');
  assert.ok(html.includes('href="app/tokens.css"') && html.includes('href="app/screen.css"') && html.includes('src="app/states.js"'), 'the page points at the app');
  for (const f of ['app.json', 'tokens.css', 'screen.css', 'manifest.csv', 'states.js', 'states/work-item.html']) assert.ok(fs.existsSync(path.join(backed.dir, 'rig', 'app', f)), 'rig/app/' + f);
  const meta = JSON.parse(fs.readFileSync(path.join(backed.dir, 'video.json'), 'utf8'));
  assert.strictEqual(meta.app.ref, 'example/placeholder');
  assert.deepStrictEqual(meta.app.states, ['work-item']);
  assert.ok(!fs.existsSync(path.join(backed.dir, 'rig', 'app', 'captures')), 'captures stay with the app, not the video');

  // the round trip: lift the inline screen into a new app, make a video on it
  const lifted = core.apps.appExtract(inline.dir, 'test/lifted', 'work-item', { note: 'round trip' });
  assert.ok(lifted.tokens && lifted.screen, 'extract found the palette and the rules blocks');
  assert.ok(fs.existsSync(path.join(apps, 'test', 'lifted', 'states', 'work-item.html')));
  const rows = core.apps.readManifest(path.join(apps, 'test', 'lifted'));
  assert.strictEqual(rows.length, 1); assert.strictEqual(rows[0].id, 'work-item'); assert.strictEqual(rows[0].note, 'round trip');
  const relifted = core.newVideo('relifted', { cwd: tmp, app: 'test/lifted' });
  assert.deepStrictEqual(relifted.app.states, ['work-item']);

  // the footage
  const a = await core.frames(inline.dir, opts);
  const b = await core.frames(backed.dir, opts);
  const c = await core.frames(relifted.dir, opts);
  assert.strictEqual(a.files.length, 20); assert.strictEqual(b.files.length, 20); assert.strictEqual(c.files.length, 20);
  assert.deepStrictEqual(b.times, a.times); assert.deepStrictEqual(c.times, a.times);
  let same = 0;
  for (let i = 0; i < a.files.length; i++) {
    const A = fs.readFileSync(a.files[i]);
    assert.ok(A.equals(fs.readFileSync(b.files[i])), 'inline and app-backed differ at ' + path.basename(a.files[i]));
    assert.ok(A.equals(fs.readFileSync(c.files[i])), 'inline and round-tripped differ at ' + path.basename(a.files[i]));
    same++;
  }
  console.log(same + ' of ' + a.files.length + ' frames byte for byte identical across inline, app-backed and round-tripped (engine ' + a.engine + ')');
});
