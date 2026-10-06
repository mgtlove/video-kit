// Render adapter, local: headless Chromium through Playwright, on this machine.
// A render is a job: a rig folder and times in, image files out. A cloud
// runner implements the same two calls.
//
//   frames(rigDir, times, outDir, opts) -> [filePath]   one PNG per time, seek-correct
//   every(rigDir, fps, onFrame, opts)   -> count        every frame of the run, each PNG
//                                                       buffer handed to onFrame(buf, n, t)
//                                                       in order; nothing written to disk
//   survey(rigDir, times, fn, opts)     -> [{t,png,data}] a still and fn's reading of the page at each time
//   shoot(rigDir, poseFn, arg, opts)    -> PNG buffer   one still after poseFn(arg) ran in the page
//
// opts.channel: 'chrome' uses the Chrome already installed (no download);
// unset uses Playwright's bundled Chromium if present. Nothing here downloads
// a browser.
const fs = require('fs');
const progress = require('../progress');
const path = require('path');
const http = require('http');
const { PNG } = require('pngjs');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

// The page is opened at 1920x1082: the stage sits at rows 1 to 1080 (#fit
// centres it) and row 0 holds a 1 px marker strip that is not footage. Every
// capture proves the compositor has drawn the commit it wants before it takes
// the footage (see capture); the marker is how.
const VIEW = { width: 1920, height: 1082 };
const FOOTAGE = { x: 0, y: 1, width: 1920, height: 1080 };

async function open(rigDir, opts) {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { throw new Error('playwright is not installed. npm install in the kit; then use the Chrome already on this machine (channel chrome). Nothing downloads a browser.'); }
  const root = path.resolve(rigDir);
  const { srv, port } = await serve(root);
  const launch = opts && opts.channel ? { channel: opts.channel } : {};
  if (!launch.channel) {
    /* no channel asked for: Playwright would look for its bundled Chromium and, missing it, tell the caller to download one. Stop first, plainly. */
    const exe = chromium.executablePath();
    if (!exe || !fs.existsSync(exe)) { srv.close(); throw new Error('no browser: set PW_CHANNEL=chrome to use the Chrome already on this machine (nothing downloads a browser). No bundled Chromium at ' + exe); }
  }
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: VIEW });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/index.html');
  await page.waitForFunction(() => window.VK && window.VK.ready());
  await page.evaluate(() => {
    window.VK.recording(true);
    var m = document.createElement('div');
    m.id = 'vk-mark';
    m.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:1px;z-index:1000;pointer-events:none;background:#000';   /* a black base, so a white page cannot read as a mark */
    var bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:0;top:0;width:0;height:1px;background:#fff';
    m.appendChild(bar);
    document.body.appendChild(m);
    window.__vkSetMark = function (w) { bar.style.width = w + 'px'; };
  });
  await page.waitForTimeout(150);
  return { browser, page, srv, errors, mark: 0, waits: 0, close: async () => { await browser.close(); srv.close(); } };
}

function fileFor(outDir, t) { return path.join(outDir, 't' + String(t.toFixed(2)).padStart(7, '0') + '.png'); }

// seek(b, t): VK.seekTo and a new mark in one task, so they land in the same
// commit. capture(b) then waits for that commit to be on screen. The mark is
// the width of a white strip on row 0, 1 to 1900 px and never the same twice
// running; a colour would not survive the screenshot's colour conversion.
function nextMark(b) { b.mark = (b.mark % 1900) + 1; return b.mark; }
function seek(b, t) {
  return b.page.evaluate(([sec, w]) => { window.VK.seekTo(sec); window.__vkSetMark(w); }, [t, nextMark(b)]);
}

// capture(b, file): the footage, taken only once the marker strip shows the
// current mark. A screenshot straight after a seek can show the frame before
// it: the main thread has committed the seek, the compositor has not drawn it
// yet. Measured on the starter's crossfade at 6.3 s: about 47,000 pixels off
// by up to 43 levels, different on every repeat, worse under load; waiting a
// fixed number of animation frames narrows it but does not close it. The
// marker is painted in the same commit as the seek (or the pause after
// playback), so once a 1 px screenshot of row 0 shows it, the next screenshot
// shows that commit. Returns the PNG buffer, and writes it when file is given.
async function capture(b, file) {
  for (let tries = 0; ; tries++) {
    const strip = PNG.sync.read(await b.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1 } }));
    let got = 0;
    while (got < 1920 && strip.data[got * 4] > 128) got++;
    if (got === b.mark) break;
    if (tries >= 120) throw new Error('the compositor never showed mark ' + b.mark + ' (saw ' + got + ' after ' + tries + ' frames)');
    b.waits++;
    await b.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  }
  const buf = await b.page.screenshot({ type: 'png', clip: FOOTAGE });
  if (file) fs.writeFileSync(file, buf);
  return buf;
}

async function frames(rigDir, times, outDir, opts) {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await open(rigDir, opts);
  const out = [], report = progress.of(opts);
  try {
    report('stills', 0, times.length, 'page open');
    for (const t of times) {
      await seek(b, t);
      const file = fileFor(outDir, t);
      await capture(b, file);
      out.push(file);
      report('stills', out.length, times.length, 'at ' + t.toFixed(2) + ' s');
    }
  } finally { await b.close(); }
  if (b.errors.length) throw new Error('page errors: ' + b.errors.join('; '));
  return out;
}

// playbackFrames: real playback from 0 to each time, then paused. Returns the
// exact time each picture shows (a beat fires on a frame boundary, so it is
// not quite the time asked); a seek to that time must match. Slow; vkit check.
async function playbackFrames(rigDir, times, outDir, opts) {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await open(rigDir, opts);
  const out = [], report = progress.of(opts);
  try {
    for (const t of times) {
      report('playback', out.length, times.length, 'playing to ' + t.toFixed(1) + ' s in real time');
      const reached = await b.page.evaluate(([sec, w]) => new Promise((done) => window.VK.playTo(sec, (r) => { window.__vkSetMark(w); done(r); })), [t, nextMark(b)]);
      const file = fileFor(outDir, t);
      await capture(b, file);
      out.push({ file, asked: t, reached });
      report('playback', out.length, times.length, 'reached ' + reached.toFixed(2) + ' s');
    }
  } finally { await b.close(); }
  return out;
}

async function info(rigDir, opts) {
  const b = await open(rigDir, opts);
  try {
    return await b.page.evaluate(() => ({ total: window.VK.total(), parts: window.VK.parts(), beats: window.VK.beats(), version: window.VK.version }));
  } finally { await b.close(); }
}

// every(rigDir, fps, onFrame, opts): every frame of the run, in order, from the
// seek. Frame n shows t = n / fps; the last frame is the one before the total,
// so the run is exactly total * fps frames long (the clips are the clock; a
// beat placed after the last clip never reaches the footage). opts.until
// renders a shorter run (seconds) for a quick check. onFrame may return a
// promise; it is awaited, so a slow sink (ffmpeg's stdin) applies back
// pressure here instead of filling memory.
async function every(rigDir, fps, onFrame, opts) {
  opts = opts || {};
  const b = await open(rigDir, opts);
  let n = 0;
  const report = progress.of(opts);
  try {
    const total = opts.until != null ? opts.until : await b.page.evaluate(() => window.VK.total());
    const count = Math.round(total * fps);
    report('frames', 0, count, 'at ' + fps + ' fps');
    for (n = 0; n < count; n++) {
      const t = n / fps;
      await seek(b, t);
      await onFrame(await capture(b), n, t);
      report('frames', n + 1, count, 'frame at ' + t.toFixed(2) + ' s');
    }
  } finally { await b.close(); }
  if (b.errors.length) throw new Error('page errors: ' + b.errors.join('; '));
  if (opts.stats) opts.stats.waits = b.waits;     /* how many frames the compositor was still behind on */
  return n;
}

// survey(rigDir, times, measureFn, opts): at each time, the still as a PNG
// buffer and whatever measureFn (a function serialised into the page) returns
// about the page state at that time. vkit check reads the DOM this way: sizes,
// colours, boxes, with the camera where it is at that moment.
async function survey(rigDir, times, measureFn, opts) {
  const b = await open(rigDir, opts);
  const out = [], report = progress.of(opts);
  try {
    report('survey', 0, times.length, 'page open');
    for (const t of times) {
      await seek(b, t);
      const png = await capture(b);
      const data = await b.page.evaluate(measureFn, t);
      out.push({ t, png, data });
      report('survey', out.length, times.length, 'at ' + t.toFixed(2) + ' s');
    }
  } finally { await b.close(); }
  if (b.errors.length) throw new Error('page errors: ' + b.errors.join('; '));
  return out;
}

// shoot(rigDir, poseFn, arg, opts): one still of the page after poseFn(arg) has
// run in it (a state shown alone, say), captured once its commit is on screen.
async function shoot(rigDir, poseFn, arg, opts) {
  const b = await open(rigDir, opts);
  try {
    await b.page.evaluate(([fnSource, a, w]) => { (new Function('return (' + fnSource + ')')())(a); window.__vkSetMark(w); }, [poseFn.toString(), arg, nextMark(b)]);
    return await capture(b);
  } finally { await b.close(); }
}

module.exports = { name: 'local-chromium', frames, playbackFrames, info, every, survey, shoot };
