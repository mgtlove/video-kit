// Proof for roadmap step 9b, the capture browser.
//   1. vkit shoot start runs the browser headless on a profile of its own with the page's
//      viewport at exactly 1920x1080 and a device pixel ratio of 2; status reads it back
//   2. a page with an account-id-shaped number and an email address is refused: the sweep names
//      the kind and the element, nothing is written; with those elements masked in shoot.json
//      the shot is written at 3840x2160, the masked badge is gone from the pixels (the header's
//      own ground shows there), the values json carries the header's colour, the walkthrough
//      and the csv carry the row; the same page again is refused as a repeat; a second state
//      becomes CAP-002 under its own heading
//   3. the cookie handoff: a persistent cookie set in one run of the browser is still there
//      after stop and start on the same profile (a session cookie is not, by design)
//   4. the CLI exits 1 for status with no browser and 3 for a shot refused by the sweep
// Needs a browser (PW_CHANNEL=chrome, or a bundled Chromium). About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { PNG } = require('pngjs');
const core = require('../src');
const { KIT } = require('../src/new');

const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');
const S = core.shoot;
const PORT = 9344;

function page(state) {
  return '<!doctype html><html><head><title>Bucket list ' + state + '</title><style>body{margin:0;font:16px Arial,sans-serif;background:#f2f3f3;color:#16191f}header{background:#232f3e;color:#fff;height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 24px}nav{width:240px;background:#fff;position:absolute;top:40px;bottom:0;left:0;border-right:1px solid #d5dbdb}main{position:absolute;left:260px;top:60px;right:20px}button{background:#ec7211;color:#fff;border:0;padding:8px 20px;font-weight:700;font-size:14px}h1{font-size:24px}</style></head><body>' +
    '<header><span>Amazon S3</span><span id="badge">Account: 123456789012</span></header><nav><p>Buckets</p></nav><main><h1>General purpose buckets (' + state + ')</h1><p class="who">Signed in as someone@example.com</p><label>Bucket name <input required placeholder="my-bucket"></label> <button>Create bucket</button><p>' + (state === 2 ? 'Successfully created bucket "training-demo-bucket-01".' : 'No buckets.') + '</p></main>' +
    '<script>document.cookie="vkit_persistent=yes; max-age=31536000; path=/"; document.cookie="vkit_session=yes; path=/";</script></body></html>';
}

function serve() {
  return new Promise((resolve) => {
    const seen = [];   /* the Cookie header of every request, so the test can see what the browser sent */
    const srv = http.createServer((req, res) => { seen.push(req.headers.cookie || ''); const state = /state=2/.test(req.url) ? 2 : 1; res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page(state)); });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, seen, url: 'http://127.0.0.1:' + srv.address().port + '/' }));
  });
}

test('the capture browser: exact viewport, the sweep refuses, masks make the shot, repeats are refused, cookies carry over', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-shoot-'));
  const profile = path.join(tmp, 'chrome-profile');
  const into = path.join(tmp, 'app'); fs.mkdirSync(into);
  const opts = { profile, port: PORT, channel: process.env.PW_CHANNEL || undefined };
  const { srv, seen, url } = await serve();
  try {
    const s = await S.start(opts);
    assert.ok(s.pid && s.port === PORT && !s.show);
    assert.deepStrictEqual(s.viewport, { w: 1920, h: 1080, dpr: 2 }, 'viewport after start: ' + JSON.stringify(s.viewport));
    await assert.rejects(() => S.start(opts), /already running/);
    const st = await S.status(opts);
    assert.ok(st.running && st.viewport.w === 1920 && st.viewport.h === 1080 && st.viewport.dpr === 2, JSON.stringify(st.viewport));

    await S.go(url, opts);
    let refused = null;
    try { await S.shoot('Step 1: the bucket list', 'Opened the list.', Object.assign({ into }, opts)); } catch (e) { refused = e; }
    assert.ok(refused && refused.hits, 'the sweep must refuse: ' + (refused && refused.message));
    const kinds = refused.hits.map((h) => h.kind + ' in ' + h.where).sort();
    assert.deepStrictEqual(kinds, ['account-id in span#badge', 'email in p.who:nth-of-type(1)'], JSON.stringify(refused.hits));
    assert.ok(!fs.existsSync(path.join(into, 'captures')), 'nothing written when refused');

    fs.writeFileSync(path.join(into, 'shoot.json'), JSON.stringify({ start: url, session_hours: 1, mask: ['#badge', '.who', '#nothing-here'] }, null, 2));
    const r1 = await S.shoot('Step 1: the bucket list', 'Opened the list.', Object.assign({ into }, opts));
    assert.strictEqual(r1.id, 'CAP-001'); assert.strictEqual(r1.width, 3840); assert.strictEqual(r1.height, 2160); assert.strictEqual(r1.scale, 2);
    assert.deepStrictEqual(r1.unmatched.map((m) => m.selector), ['#nothing-here'], 'a mask that matches nothing is reported');
    assert.deepStrictEqual(r1.hits, []);
    const png = PNG.sync.read(fs.readFileSync(r1.file));
    const px = (x, y) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
    /* the badge sat at the right end of the 40 px header: at 2x, x 3500..3800, y 20..60 must all be the header's ground */
    let off = 0; for (let x = 3500; x < 3800; x += 10) for (let y = 20; y < 60; y += 10) { const p = px(x, y); if (Math.abs(p[0] - 35) > 3 || Math.abs(p[1] - 47) > 3 || Math.abs(p[2] - 62) > 3) off++; }
    assert.strictEqual(off, 0, off + ' badge-region pixels are not the header ground');
    const left = px(100, 40); assert.ok(Math.abs(left[0] - 35) <= 3, 'the header itself is still drawn: ' + left);
    const values = JSON.parse(fs.readFileSync(path.join(into, 'captures', 'CAP-001.json'), 'utf8'));
    assert.strictEqual(values.regions.header.background, 'rgb(35, 47, 62)');
    assert.strictEqual(values.regions.header.box.h, 40); assert.strictEqual(values.regions.nav.box.w, 241);   /* 240 plus its 1 px border */
    assert.ok(values.buttons.some((b) => b.text === 'Create bucket' && b.background === 'rgb(236, 114, 17)'), JSON.stringify(values.buttons));
    assert.ok(values.inputs.some((i) => i.required && i.placeholder === 'my-bucket'));
    assert.strictEqual(values.headings[0].text, 'General purpose buckets (1)');
    const md = fs.readFileSync(path.join(into, 'captures', 'walkthrough.md'), 'utf8');
    assert.ok(/## Step 1: the bucket list\n\nOpened the list\.\n\n!\[CAP-001\]\(CAP-001\.png\)\n\nMeasured \(CAP-001\.json has all of it\): body 1920x1080 at 0,0, ground #f2f3f3, text #16191f, 16px Arial; header 1920x40/.test(md), md);
    assert.ok(/button "Create bucket" #ec7211 on #ffffff, 14px 700/.test(md), md);
    const csv = fs.readFileSync(path.join(into, 'captures', 'captures.csv'), 'utf8').trim().split('\n');
    assert.strictEqual(csv[0], 'id,file,step,text,width,height,scale,captured_on,source');
    assert.ok(/^CAP-001,CAP-001\.png,Step 1: the bucket list,Opened the list\.,3840,2160,2,\d{4}-\d{2}-\d{2},vkit shoot 127\.0\.0\.1:\d+$/.test(csv[1]), csv[1]);

    await assert.rejects(() => S.shoot('Step 1: the bucket list', 'Nothing changed.', Object.assign({ into }, opts)), /looks exactly like CAP-001/);
    await S.go(url + '?state=2', opts);
    const r2 = await S.shoot('Step 2: after creating', 'Clicked Create bucket.', Object.assign({ into }, opts));
    assert.strictEqual(r2.id, 'CAP-002');
    const md2 = fs.readFileSync(path.join(into, 'captures', 'walkthrough.md'), 'utf8');
    assert.deepStrictEqual(md2.match(/^## .*$/gm), ['## Step 1: the bucket list', '## Step 2: after creating']);
    assert.strictEqual(fs.readFileSync(path.join(into, 'captures', 'captures.csv'), 'utf8').trim().split('\n').length, 3);

    /* the cookie handoff: stop, start on the same profile, the persistent cookie arrives with the first request, the session cookie does not */
    const before = await (async () => { const c = await S.connect(PORT); try { return await c.page.evaluate(() => document.cookie); } finally { await c.close(); } })();
    assert.ok(/vkit_persistent=yes/.test(before) && /vkit_session=yes/.test(before), 'both cookies set in the first run: ' + before);
    const stopped = await S.stop(opts);
    assert.ok(stopped.stopped);
    assert.ok(!(await S.status(opts)).running);
    await S.start(opts);
    seen.length = 0;
    await S.go(url, opts);
    const arrived = seen[0];
    assert.ok(/vkit_persistent=yes/.test(arrived), 'the persistent cookie survived stop and start: ' + JSON.stringify(arrived));
    assert.ok(!/vkit_session=yes/.test(arrived), 'the session cookie did not (by design): ' + JSON.stringify(arrived));
    await S.stop(opts);
    console.log('cookies: first request after relaunch carried ' + JSON.stringify(arrived) + ' (persistent kept, session dropped)');
    console.log('viewport ' + s.viewport.w + 'x' + s.viewport.h + ' at ' + s.viewport.dpr + 'x; refused on ' + kinds.join(' and ') + '; CAP-001 and CAP-002 written at 3840x2160 with the badge masked; header ' + values.regions.header.background + ', nav ' + values.regions.nav.box.w + ' wide; repeat refused');
  } finally {
    srv.close();
    const left = S.readSession(opts); if (left && left.pid) { try { process.kill(left.pid, 'SIGKILL'); } catch (e) { /* gone */ } }
  }
});

test('the CLI: status exits 1 with no browser; a refused shot exits 3', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-shoot-'));
  const env = Object.assign({}, process.env, { VKIT_CHROME_PROFILE: path.join(tmp, 'p') });
  const st = spawnSync(process.execPath, [VKIT, 'shoot', 'status'], { encoding: 'utf8', env });
  assert.strictEqual(st.status, 1, st.stdout + st.stderr);
  assert.ok(/no capture browser running/.test(st.stdout), st.stdout);
  const shot = spawnSync(process.execPath, [VKIT, 'shoot', 'Step 1', 'Opened it.'], { encoding: 'utf8', env });
  assert.strictEqual(shot.status, 1); assert.ok(/no capture browser is running/.test(shot.stderr), shot.stderr);
  /* a file URL: spawnSync blocks this process, so an in-process server could not answer */
  const file = path.join(tmp, 'page.html'); fs.writeFileSync(file, page(1)); const url = 'file://' + file;
  try {
    const started = spawnSync(process.execPath, [VKIT, 'shoot', 'start', '--port', '9345'], { encoding: 'utf8', env, timeout: 40000 });
    assert.strictEqual(started.status, 0, 'start: status ' + started.status + ' signal ' + started.signal + ' out ' + JSON.stringify(started.stdout) + ' err ' + JSON.stringify(started.stderr));
    assert.ok(/headless, pid \d+, port 9345, .*viewport 1920x1080 at 2x/.test(started.stdout), started.stdout);
    const went = spawnSync(process.execPath, [VKIT, 'shoot', 'go', url], { encoding: 'utf8', env }); assert.strictEqual(went.status, 0, 'go: ' + went.stdout + went.stderr);
    const refused = spawnSync(process.execPath, [VKIT, 'shoot', 'Step 1', 'Opened it.', '--into', tmp], { encoding: 'utf8', env });
    assert.strictEqual(refused.status, 3, refused.stdout + refused.stderr);
    assert.ok(/not written: 2 things on screen must not be copied: account-id in span#badge; email in/.test(refused.stderr), refused.stderr);
    const status = spawnSync(process.execPath, [VKIT, 'shoot', 'status', '--into', tmp], { encoding: 'utf8', env });
    assert.ok(/viewport 1920x1080 at 2x/.test(status.stdout) && !/NOT 1920x1080/.test(status.stdout), status.stdout);
    console.log(refused.stderr.trim().split('\n')[0].slice(0, 160));
  } finally {
    spawnSync(process.execPath, [VKIT, 'shoot', 'stop'], { encoding: 'utf8', env });
  }
});
