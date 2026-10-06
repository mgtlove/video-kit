// Shoot: the capture browser, for an agent or a person on this machine.
//
// The document path (capture.js) takes a walkthrough someone else wrote. This is
// the other path: the kit runs the Chrome already on this machine, headless by
// default, on a profile folder of its own, at an exact 1920x1080 viewport with a
// device pixel ratio of 2, with a debugging port open on localhost only. Whoever
// drives the page (a person in a --show window, or an agent through the Playwright
// MCP server pointed at the same port) calls shoot() at each screen, and the kit
// takes the page-only picture at 3840x2160, hides the elements the app folder's
// shoot.json names first, sweeps the page's text for the shapes that must not be
// copied (a 12-digit account id, an ARN, an email address, an IP address, and any
// literal the folder lists), refuses to write while any remain, reads the page's
// own colours, faces and region sizes, and appends to the same captures/ set the
// document path writes: CAP-NNN.png, CAP-NNN.json, walkthrough.md, captures.csv.
//
// Sign-in is the one human step: `vkit shoot start --show` opens a visible window
// on the same profile, the person signs in, `stop`, then `start` headless carries
// the session on in Chrome's own cookie store. Nothing is exported. The profile is
// launched with Chrome's mock keychain on every launch (never mixed with the real
// one, which would leave the cookies unreadable); at rest the folder is protected
// by its permissions and the session's own length, which is why a capture account
// is an empty one with a one-hour session.
//
// The sweep reads text, so it catches text: nothing drawn on a canvas or baked
// into an image. The pictures are still read by a reader, every one.
//
//   start(opts) -> session      stop() -> {stopped}      status(opts) -> {...}
//   go(url) -> {url, title}     shoot(step, text, opts) -> {id, file, ...}
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { KIT } = require('./new');

const PORT = 9333;
const VIEW = { width: 1920, height: 1080 };

function profileDir(opts) {
  const d = (opts && opts.profile) || process.env.VKIT_CHROME_PROFILE || path.join(KIT, '..', 'chrome-profile');
  return path.resolve(d);
}
function sessionFile(opts) { return path.join(profileDir(opts), 'session.json'); }
function readSession(opts) { const f = sessionFile(opts); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; }
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return false; } }

/* the browser binary: the Chrome already on this machine when PW_CHANNEL=chrome, else Playwright's
   bundled Chromium if it is there; nothing downloads a browser */
function executable(channel) {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { throw new Error('playwright is not installed. npm install in the kit.'); }
  if (channel === 'chrome') {
    const candidates = process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')]
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'];
    const found = candidates.find((c) => fs.existsSync(c));
    if (!found) throw new Error('PW_CHANNEL=chrome but Google Chrome was not found at ' + candidates.join(' or ') + '. Install Chrome, or unset PW_CHANNEL to use a bundled Chromium if one is present.');
    return found;
  }
  const exe = chromium.executablePath();
  if (!exe || !fs.existsSync(exe)) throw new Error('no browser: set PW_CHANNEL=chrome to use the Chrome already on this machine (nothing downloads a browser). No bundled Chromium at ' + exe);
  return exe;
}

function getJson(url, ms) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: ms || 2000 }, (res) => { let s = ''; res.on('data', (d) => { s += d; }); res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } }); });
    req.on('error', reject); req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}
async function waitForPort(port, ms) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < ms) { try { return await getJson('http://127.0.0.1:' + port + '/json/version', 1500); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 200)); } }
  throw new Error('the browser did not open its debugging port ' + port + ' within ' + ms + ' ms' + (last ? ' (' + last.message + ')' : ''));
}

async function connect(port) {
  const { chromium } = require('playwright');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:' + port);
  const ctx = browser.contexts()[0];
  if (!ctx) { await browser.close(); throw new Error('the browser has no context to drive'); }
  const pages = ctx.pages();
  const page = pages.slice().reverse().find((p) => p.url() !== 'about:blank') || pages[pages.length - 1];
  if (!page) { await browser.close(); throw new Error('the browser has no page open'); }
  return { browser, ctx, page, close: () => browser.close() };
}

/* the raw window is sized until the page's own viewport is exactly 1920x1080, so every client
   that connects (the kit, the MCP server) sees the same page and the picture is 3840x2160 */
async function calibrate(page) {
  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  let h = VIEW.height, w = VIEW.width, inner = null;
  for (let i = 0; i < 6; i++) {
    inner = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
    if (inner.w === VIEW.width && inner.h === VIEW.height) break;
    h += VIEW.height - inner.h; w += VIEW.width - inner.w;
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: w, height: h } });
    await new Promise((r) => setTimeout(r, 250));
  }
  await cdp.detach();
  return inner;
}

async function start(opts) {
  opts = opts || {};
  const port = Number(opts.port || PORT);
  const dir = profileDir(opts);
  const have = readSession(opts);
  if (have && alive(have.pid)) throw new Error('the capture browser is already running (pid ' + have.pid + ', port ' + have.port + (have.show ? ', visible' : ', headless') + '). vkit shoot stop first.');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch (e) { /* not every file system has modes */ }
  const exe = executable(opts.channel);
  const args = [
    '--user-data-dir=' + dir,
    '--remote-debugging-port=' + port,
    '--window-size=' + VIEW.width + ',' + VIEW.height,
    '--force-device-scale-factor=' + (opts.scale || 2),
    '--no-first-run', '--no-default-browser-check', '--disable-sync', '--use-mock-keychain',
    '--hide-crash-restore-bubble', '--disable-session-crashed-bubble'
  ];
  if (!opts.show) args.push('--headless=new');
  if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) args.push('--no-sandbox');   /* a root sandbox, never a Mac */
  args.push(opts.url || 'about:blank');
  const log = fs.openSync(path.join(dir, 'browser.log'), 'w');
  const child = spawn(exe, args, { detached: true, stdio: ['ignore', log, log] });
  child.unref();
  const version = await waitForPort(port, opts.waitMs || 20000);
  const c = await connect(port);
  let inner;
  try { inner = await calibrate(c.page); } finally { await c.close(); }
  const session = { pid: child.pid, port, show: !!opts.show, started: new Date().toISOString(), exe, profile: dir, browser: version.Browser, viewport: inner, scale: opts.scale || 2 };
  fs.writeFileSync(sessionFile(opts), JSON.stringify(session, null, 2) + '\n');
  return session;
}

async function stop(opts) {
  const s = readSession(opts);
  if (!s) return { stopped: false, reason: 'no capture browser session recorded' };
  let how = 'was not running';
  if (alive(s.pid)) {
    /* ask the browser to close itself first: a signal is a crash to Chrome, and cookies not yet flushed to disk would be lost with it */
    how = 'closed by the browser';
    try { const c = await connect(s.port); const cdp = await c.browser.newBrowserCDPSession(); await cdp.send('Browser.close'); } catch (e) { how = 'closed by signal (' + e.message.split('\n')[0].slice(0, 60) + ')'; try { process.kill(s.pid, 'SIGTERM'); } catch (e2) { /* gone */ } }
    const t0 = Date.now();
    while (alive(s.pid) && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 100));
    if (alive(s.pid)) { how += ', then killed'; try { process.kill(s.pid, 'SIGKILL'); } catch (e) { /* gone */ } }
  }
  fs.unlinkSync(sessionFile(opts));   /* the kit's own run file, not a person's data */
  return { stopped: true, pid: s.pid, port: s.port, how };
}

function readShootJson(into) {
  const f = path.join(path.resolve(into || '.'), 'shoot.json');
  if (!fs.existsSync(f)) return { file: f, mask: [], known: [], session_hours: null, start: '' };
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Object.assign({ file: f, mask: [], known: [], session_hours: null, start: '' }, j);
}

async function status(opts) {
  opts = opts || {};
  const s = readSession(opts);
  const out = { session: s, running: !!(s && alive(s.pid)) };
  if (!out.running) return out;
  const c = await connect(s.port);
  try {
    const page = c.page;
    out.url = page.url();
    out.title = await page.title().catch(() => '');
    out.viewport = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
    out.at_sign_in = /signin|\/start\b|login|sso/i.test(out.url);
    const cfg = readShootJson(opts.into);
    if (cfg.session_hours) {
      const mins = (Date.now() - Date.parse(s.started)) / 60000;
      out.session_minutes = Math.round(mins);
      out.session_left_minutes = Math.round(cfg.session_hours * 60 - mins);
    }
  } finally { await c.close(); }
  return out;
}

async function go(url, opts) {
  const s = readSession(opts);
  if (!s || !alive(s.pid)) throw new Error('no capture browser is running. vkit shoot start first.');
  const c = await connect(s.port);
  try { await c.page.goto(url, { waitUntil: 'load' }); const v = await calibrate(c.page); return { url: c.page.url(), title: await c.page.title(), viewport: v }; } finally { await c.close(); }
}

const PATTERNS = [
  { kind: 'account-id', re: /\b\d{12}\b/g },
  { kind: 'arn', re: /\barn:aws[a-z-]*:[^\s"'<>]+/g },
  { kind: 'email', re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { kind: 'ipv4', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g }
];

const csvCell = (s) => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const hex = (rgb) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb || ''); if (!m) return ''; if (m[4] !== undefined && Number(m[4]) === 0) return 'transparent'; return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join(''); };

/* runs in the page: hide the masks, sweep the visible text, read the values */
function inPage(arg) {
  const masks = arg.masks, known = arg.known, patterns = arg.patterns;
  const masked = [];
  for (const sel of masks) {
    let n = 0;
    try { document.querySelectorAll(sel).forEach((el) => { el.style.visibility = 'hidden'; n++; }); } catch (e) { n = -1; }
    masked.push({ selector: sel, matched: n });
  }
  const text = document.body ? document.body.innerText : '';
  const hits = [];
  const whereIs = (needle) => {
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      if (el.children.length && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(needle))) continue;
      if (!(el.innerText || '').includes(needle)) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
      const cls = [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
      let p = el.parentElement, idx = 1; if (p) { idx = [...p.children].filter((c) => c.tagName === el.tagName).indexOf(el) + 1; }
      return (p && p.id ? '#' + p.id + ' > ' : '') + el.tagName.toLowerCase() + cls + ':nth-of-type(' + idx + ')';
    }
    return '(not located)';
  };
  for (const p of patterns) { const re = new RegExp(p.re, 'g'); let m; const seen = new Set(); while ((m = re.exec(text))) { if (seen.has(m[0])) continue; seen.add(m[0]); hits.push({ kind: p.kind, where: whereIs(m[0]), length: m[0].length }); } }
  for (const k of known) if (k && text.includes(k)) hits.push({ kind: 'known', where: whereIs(k), length: k.length });
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const bg = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(c)) return c; e = e.parentElement; } return 'rgb(255, 255, 255)'; };
  const styleOf = (el) => { const cs = getComputedStyle(el); return { box: box(el), background: bg(el), color: cs.color, font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight }; };
  const first = (sel) => document.querySelector(sel);
  const regions = {};
  for (const [name, sel] of [['body', 'body'], ['header', 'header, [role=banner]'], ['nav', 'nav, [role=navigation]'], ['main', 'main, [role=main]'], ['aside', 'aside, [role=complementary]'], ['footer', 'footer, [role=contentinfo]']]) { const el = first(sel); if (el) regions[name] = styleOf(el); }
  if (regions.body) regions.body.box = { x: 0, y: 0, w: innerWidth, h: innerHeight };   /* the page, not the body element's own box, which absolute children leave short */
  const short = (s) => (s || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const buttons = [...document.querySelectorAll('button, [role=button], input[type=submit], a.btn')].filter((b) => getComputedStyle(b).visibility !== 'hidden').slice(0, 40).map((b) => Object.assign({ text: short(b.innerText || b.value) }, styleOf(b)));
  const headings = [...document.querySelectorAll('h1, h2, h3')].slice(0, 20).map((h) => ({ level: h.tagName.toLowerCase(), text: short(h.innerText), size: getComputedStyle(h).fontSize, weight: getComputedStyle(h).fontWeight, color: getComputedStyle(h).color }));
  const labels = [...document.querySelectorAll('label, th, [role=columnheader], [role=tab]')].slice(0, 60).map((l) => short(l.innerText)).filter(Boolean);
  const inputs = [...document.querySelectorAll('input, select, textarea')].filter((i) => !/hidden|submit|button/.test(i.type)).slice(0, 40).map((i) => ({ type: i.type || i.tagName.toLowerCase(), placeholder: short(i.placeholder), required: !!i.required, disabled: !!i.disabled, box: box(i) }));
  return { masked, hits, title: document.title, url: location.href, regions, buttons, headings, labels, inputs, viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio } };
}

async function shoot(step, text, opts) {
  opts = opts || {};
  if (!step || !text) throw new Error('vkit shoot "<step heading>" "<what was done to reach this screen>" [--into dir]');
  const s = readSession(opts);
  if (!s || !alive(s.pid)) throw new Error('no capture browser is running. vkit shoot start first (and --show to sign in).');
  const into = path.resolve(opts.into || '.');
  const dir = path.join(into, 'captures');
  const cfg = readShootJson(into);
  const c = await connect(s.port);
  try {
    const page = c.page;
    /* the headless window's own reserve for its UI changes after a navigation, so the window is sized again before every shot until the page's viewport is exactly 1920x1080 */
    let v = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
    if (v.w !== VIEW.width || v.h !== VIEW.height) { v = await calibrate(page); await page.waitForTimeout(250); }
    if (v.w !== VIEW.width || v.h !== VIEW.height) throw new Error('the page\'s viewport is ' + v.w + 'x' + v.h + ' and would not size to 1920x1080 (a visible window may be too small for the screen; the headless one is sized by the kit). vkit shoot stop, then vkit shoot start.');
    if (v.dpr !== (s.scale || 2)) throw new Error('the page\'s device pixel ratio is ' + v.dpr + ', not ' + (s.scale || 2) + '; the browser was not started by vkit shoot start.');
    if (/signin|\/start\b|login|sso/i.test(page.url())) throw new Error('the page is a sign-in page (' + page.url().slice(0, 80) + '). ' + (cfg.session_hours ? 'The session is ' + Math.round((Date.now() - Date.parse(s.started)) / 60000) + ' minutes old against a ' + cfg.session_hours + ' hour limit that starts at sign-in; if it ran out, vkit shoot stop, start --show, sign in again, stop, start.' : 'Sign in with vkit shoot start --show first.'));
    await page.waitForLoadState('load').catch(() => {});
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
    await page.waitForTimeout(opts.settleMs == null ? 400 : opts.settleMs);
    const read = await page.evaluate(inPage, { masks: cfg.mask, known: cfg.known, patterns: PATTERNS.map((p) => ({ kind: p.kind, re: p.re.source })) });
    const unmatched = read.masked.filter((m) => m.matched <= 0);
    if (read.hits.length && !opts.allowHits) {
      const err = new Error('not written: ' + read.hits.length + ' thing' + (read.hits.length === 1 ? '' : 's') + ' on screen must not be copied: ' + read.hits.map((h) => h.kind + ' in ' + h.where).join('; ') + '. Add a selector for each to ' + path.relative(process.cwd(), cfg.file) + ' under "mask" and shoot again, or --allow-hits to write anyway and say why.');
      err.hits = read.hits; err.masked = read.masked; throw err;
    }
    const png = await page.screenshot({ type: 'png' });
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    const hash = crypto.createHash('sha256').update(png).digest('hex');
    fs.mkdirSync(dir, { recursive: true });
    const existing = fs.readdirSync(dir).filter((f) => /^CAP-\d{3}\.png$/.test(f)).sort();
    for (const f of existing) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex') === hash) throw new Error('not written: the page looks exactly like ' + f + '. Nothing changed on screen since that shot.');
    const n = existing.length ? Number(existing[existing.length - 1].slice(4, 7)) + 1 : 1;
    const id = 'CAP-' + String(n).padStart(3, '0');
    fs.writeFileSync(path.join(dir, id + '.png'), png);
    const values = { id, step, text, url: read.url, title: read.title, shot_on: new Date().toISOString(), viewport: read.viewport, picture: { width: w, height: h, scale: w / VIEW.width }, masked: read.masked, hits_allowed: read.hits, regions: read.regions, buttons: read.buttons, headings: read.headings, labels: read.labels, inputs: read.inputs };
    fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(values, null, 2) + '\n');
    /* walkthrough.md: a heading when the step changes, the line, the picture, the measured block */
    const md = path.join(dir, 'walkthrough.md');
    let body = fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : '<!-- captured by vkit shoot, in order. Each picture is a capture; look at every one. -->\n';
    const lastStep = (body.match(/^## .*$/gm) || []).pop();
    if (lastStep !== '## ' + step) body += '\n## ' + step + '\n';
    const r = read.regions;
    const line = (name) => (r[name] ? name + ' ' + r[name].box.w + 'x' + r[name].box.h + ' at ' + r[name].box.x + ',' + r[name].box.y + ', ground ' + hex(r[name].background) + ', text ' + hex(r[name].color) + ', ' + r[name].size + ' ' + r[name].font.split(',')[0].replace(/"/g, '') : null);
    const measured = ['body', 'header', 'nav', 'main'].map(line).filter(Boolean);
    const btn = read.buttons.find((b) => b.text);
    if (btn) measured.push('button "' + btn.text + '" ' + hex(btn.background) + ' on ' + hex(btn.color) + ', ' + btn.size + ' ' + btn.weight);
    body += '\n' + text + '\n\n![' + id + '](' + id + '.png)\n\n' + (measured.length ? 'Measured (' + id + '.json has all of it): ' + measured.join('; ') + '.\n' : '');
    fs.writeFileSync(md, body);
    const csv = path.join(dir, 'captures.csv');
    if (!fs.existsSync(csv)) fs.writeFileSync(csv, 'id,file,step,text,width,height,scale,captured_on,source\n');
    fs.appendFileSync(csv, [id, id + '.png', step, text, w, h, w / VIEW.width, new Date().toISOString().slice(0, 10), 'vkit shoot ' + (() => { try { return new URL(read.url).host; } catch (e) { return read.url.slice(0, 40); } })()].map(csvCell).join(',') + '\n');
    return { id, file: path.join(dir, id + '.png'), width: w, height: h, scale: w / VIEW.width, masked: read.masked, unmatched, hits: read.hits, url: read.url, title: read.title, regions: Object.keys(read.regions), buttons: read.buttons.length, headings: read.headings.length, dir };
  } finally { await c.close(); }
}

function formatStatus(st) {
  if (!st.running) return 'no capture browser running' + (st.session ? ' (a session file from ' + st.session.started + ' was left behind; vkit shoot start clears it)' : '') + '. vkit shoot start [--show]';
  const s = st.session;
  const out = ['capture browser pid ' + s.pid + ' on port ' + s.port + ', ' + (s.show ? 'visible' : 'headless') + ', ' + s.browser + ', profile ' + s.profile];
  out.push('page: ' + (st.title || '(no title)') + '  ' + st.url);
  out.push('viewport ' + st.viewport.w + 'x' + st.viewport.h + ' at ' + st.viewport.dpr + 'x' + (st.viewport.w === 1920 && st.viewport.h === 1080 ? '' : '  NOT 1920x1080'));
  if (st.at_sign_in) out.push('at a sign-in page: sign in here (--show), or the session has ended');
  if (st.session_minutes != null) out.push('session ' + st.session_minutes + ' min old, about ' + st.session_left_minutes + ' min left of the ' + 'limit that started at sign-in');
  return out.join('\n');
}

function formatShot(r) {
  const out = [r.id + ': ' + r.width + 'x' + r.height + ' (' + r.scale + 'x) of ' + (r.title || r.url) + ' into ' + path.relative(process.cwd(), r.dir) + '/'];
  if (r.masked.length) out.push('  masked: ' + r.masked.map((m) => m.selector + ' (' + (m.matched < 0 ? 'bad selector' : m.matched + ' element' + (m.matched === 1 ? '' : 's')) + ')').join(', '));
  if (r.unmatched.length) out.push('  WARNING: ' + r.unmatched.length + ' mask' + (r.unmatched.length === 1 ? '' : 's') + ' matched nothing on this page: ' + r.unmatched.map((m) => m.selector).join(', '));
  if (r.hits.length) out.push('  WRITTEN WITH ' + r.hits.length + ' HIT' + (r.hits.length === 1 ? '' : 'S') + ' ALLOWED: ' + r.hits.map((h) => h.kind + ' in ' + h.where).join('; '));
  out.push('  measured: ' + r.regions.join(', ') + '; ' + r.buttons + ' buttons, ' + r.headings + ' headings (' + r.id + '.json)');
  return out.join('\n');
}

module.exports = { start, stop, status, go, shoot, connect, profileDir, readSession, readShootJson, formatStatus, formatShot, PORT, VIEW, PATTERNS };
