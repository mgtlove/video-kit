// Render adapter, local: headless Chromium through Playwright, on this machine.
// A render is a job: a rig folder and times in, image files out. A cloud
// runner implements the same two calls.
//
//   frames(rigDir, times, outDir, opts) -> [filePath]   one PNG per time, seek-correct
//   every(rigDir, fps, outDir, opts)    -> [filePath]   every frame of the run (step 5)
//
// opts.channel: 'chrome' uses the Chrome already installed (no download);
// unset uses Playwright's bundled Chromium if present. Nothing here downloads
// a browser.
const fs = require('fs');
const path = require('path');
const http = require('http');

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

async function open(rigDir, opts) {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { throw new Error('playwright is not installed. npm install in the kit; then use the Chrome already on this machine (channel chrome). Nothing downloads a browser.'); }
  const root = path.resolve(rigDir);
  const { srv, port } = await serve(root);
  const launch = opts && opts.channel ? { channel: opts.channel } : {};
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/index.html');
  await page.waitForFunction(() => window.VK && window.VK.ready());
  await page.evaluate(() => window.VK.recording(true));
  await page.waitForTimeout(150);
  return { browser, page, srv, errors, close: async () => { await browser.close(); srv.close(); } };
}

function fileFor(outDir, t) { return path.join(outDir, 't' + String(t.toFixed(2)).padStart(7, '0') + '.png'); }

async function frames(rigDir, times, outDir, opts) {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await open(rigDir, opts);
  const out = [];
  try {
    for (const t of times) {
      await b.page.evaluate((sec) => window.VK.seekTo(sec), t);
      await b.page.waitForTimeout(60);
      const file = fileFor(outDir, t);
      await b.page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      out.push(file);
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
  const out = [];
  try {
    for (const t of times) {
      const reached = await b.page.evaluate((sec) => new Promise((done) => window.VK.playTo(sec, done)), t);
      const file = fileFor(outDir, t);
      await b.page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      out.push({ file, asked: t, reached });
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

module.exports = { name: 'local-chromium', frames, playbackFrames, info, every: async function () { throw new Error('render.every is not built yet (roadmap step 5)'); } };
