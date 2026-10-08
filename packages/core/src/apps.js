// Recreated apps: the screen side of a tool, built once from captures and used
// by many videos (and later a twin). An app is a folder, apps/<family>/<tool>/:
//
//   app.json        name, family, title, extends, version, created_on
//   tokens.css      the tool's measured palette and faces, scoped to #mock
//   screen.css      the screen's structure (bar, nav, rows), scoped to #mock
//   states/<id>.html  one fragment per captured state: the markup inside #mock
//   captures/       the screenshots each state came from
//   manifest.csv    the one list of states: id, file, screen, state, capture, captured_on, note
//
// The kit looks for <family>/<tool>/app.json in $VKIT_APPS, then ../apps beside
// the kit, then the kit's own examples/apps. It never knows which repo a folder
// came from. A video names its app in video.json; vkit new --app copies the app
// into rig/app/ and writes rig/app/states.js so the page needs no fetch and
// opens from disk. States are markup and CSS only: no images, no fetches, so a
// frame is whole the instant it is sought.
//
// The rule for every state: recreate from your own captures, cite each, never
// invent a control.
const fs = require('fs');
const path = require('path');
const { KIT } = require('./new');

const REF = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const MANIFEST_HEAD = 'id,file,screen,state,capture,captured_on,note';
const MARK = { css: ['/* screen:inline */', '/* /screen:inline */'], html: ['<!-- screen:inline -->', '<!-- /screen:inline -->'] };

function appDirs() {
  return [process.env.VKIT_APPS, path.join(KIT, '..', 'apps'), path.join(KIT, 'examples', 'apps')]
    .filter(Boolean).map((d) => path.resolve(d)).filter((d) => fs.existsSync(d));
}
function checkRef(ref) { if (!REF.test(ref || '')) throw new Error('an app is named family/tool, lowercase letters, digits and hyphens: ' + ref); }

// ---- manifest.csv: the one list of states ----
function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function readManifest(dir) {
  const file = path.join(dir, 'manifest.csv');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const head = parseCsvLine(lines[0]);
  return lines.slice(1).map((l) => { const c = parseCsvLine(l), row = {}; head.forEach((h, i) => { row[h] = c[i] || ''; }); return row; });
}
function appendManifest(dir, row) {
  const file = path.join(dir, 'manifest.csv');
  if (!fs.existsSync(file)) fs.writeFileSync(file, MANIFEST_HEAD + '\n');
  const line = MANIFEST_HEAD.split(',').map((h) => csvCell(row[h])).join(',') + '\n';
  fs.appendFileSync(file, line);
}

// resolveApp(ref) -> { ref, family, tool, dir, app, states }
function resolveApp(ref) {
  checkRef(ref);
  const dirs = appDirs();
  for (const d of dirs) {
    const dir = path.join(d, ref);
    if (fs.existsSync(path.join(dir, 'app.json'))) {
      const app = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
      return { ref, family: ref.split('/')[0], tool: ref.split('/')[1], dir, app, states: readManifest(dir) };
    }
  }
  throw new Error('no app ' + ref + ' in ' + (dirs.length ? dirs.join(', ') : 'any apps folder') + '. vkit app new ' + ref + ' makes one; VKIT_APPS points at another folder.');
}

// statesJs(dir, rows): the page loads states from this file, so it opens from disk
function statesJs(dir, rows) {
  const states = {};
  for (const r of rows) states[r.id] = fs.readFileSync(path.join(dir, 'states', r.file || r.id + '.html'), 'utf8').replace(/\s+$/, '');
  return '/* written by vkit from the app\'s states/; edit the app, not this file */\nwindow.STATES = ' + JSON.stringify(states, null, 2) + ';\n';
}

// ---- marker blocks in the starter: the inline screen lives between them ----
function stripBlock(text, marks, replacement) {
  const a = text.indexOf(marks[0]), b = text.indexOf(marks[1]);
  if (a < 0 || b < 0 || b < a) return { text, found: false, inner: '' };
  const inner = text.slice(a + marks[0].length, b);
  return { text: text.slice(0, a) + (replacement || '') + text.slice(b + marks[1].length), found: true, inner };
}

// installApp(videoDir, ref): copy the app into the video and point the page at it
// copyAppFiles(r, dst): the app's files into a video's rig/app/. Nothing is removed: a state the
// app no longer has stays on disk (never delete), but states.js lists only the manifest's.
function copyAppFiles(r, dst) {
  fs.mkdirSync(path.join(dst, 'states'), { recursive: true });
  for (const f of ['app.json', 'tokens.css', 'screen.css', 'manifest.csv']) if (fs.existsSync(path.join(r.dir, f))) fs.copyFileSync(path.join(r.dir, f), path.join(dst, f));
  for (const s of r.states) fs.copyFileSync(path.join(r.dir, 'states', s.file || s.id + '.html'), path.join(dst, 'states', s.file || s.id + '.html'));
  for (const folder of ['crops', 'faces']) {   /* copies of the captures' pixels and the app's own face travel with the states */
    const from = path.join(r.dir, folder);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.join(dst, folder), { recursive: true });
    for (const f of fs.readdirSync(from)) if (fs.statSync(path.join(from, f)).isFile()) fs.copyFileSync(path.join(from, f), path.join(dst, folder, f));
  }
  fs.writeFileSync(path.join(dst, 'states.js'), statesJs(r.dir, r.states));
}
function writeAppMeta(videoDir, ref, r) {
  const vj = path.join(videoDir, 'video.json');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
  meta.app = { ref, version: r.app.version || '', source: r.dir, installed_on: new Date().toISOString().slice(0, 10), states: r.states.map((s) => s.id) };
  if (meta.menu && meta.menu.sources) { meta.menu.sources.kind = 'app'; meta.menu.sources.app = ref; }
  fs.writeFileSync(vj, JSON.stringify(meta, null, 2) + '\n');
}
function installApp(videoDir, ref) {
  const r = resolveApp(ref);
  const rig = path.join(videoDir, 'rig'), dst = path.join(rig, 'app');
  copyAppFiles(r, dst);

  const htmlFile = path.join(rig, 'index.html');
  let html = fs.readFileSync(htmlFile, 'utf8');
  html = stripBlock(html, MARK.css).text;                 /* the inline screen's rules go; screen.css has the app's */
  html = stripBlock(html, MARK.html).text;                /* the inline markup goes; a state fills #mock on its beat */
  const cssAnchor = '<link rel="stylesheet" href="engine/rig.css">';
  const jsAnchor = '<script src="engine/rig.js"></script>';
  if (html.indexOf(cssAnchor) < 0 || html.indexOf(jsAnchor) < 0) throw new Error('rig/index.html has no engine links to anchor the app on');
  html = html.replace(cssAnchor, cssAnchor + '\n<link rel="stylesheet" href="app/tokens.css">\n<link rel="stylesheet" href="app/screen.css">');
  html = html.replace(jsAnchor, '<script src="app/states.js"></script>\n' + jsAnchor);
  fs.writeFileSync(htmlFile, html);

  const themeFile = path.join(rig, 'theme.css');
  if (fs.existsSync(themeFile)) fs.writeFileSync(themeFile, stripBlock(fs.readFileSync(themeFile, 'utf8'), MARK.css, '/* the recreated screen\'s palette comes from app/tokens.css */').text);

  writeAppMeta(videoDir, ref, r);
  return r;
}

// appUse(videoDir, ref): the app into a video that already exists (the idea came before the
// app), or the video's copy brought up to the app's current version (the app was re-captured).
// A video holds one app; a different ref is refused by name.
function appUse(videoDir, ref) {
  const dir = path.resolve(videoDir || '.');
  const vj = path.join(dir, 'video.json');
  if (!fs.existsSync(vj)) throw new Error('no video.json in ' + dir + ' (run inside a video folder made by vkit new)');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
  if (!meta.app || !meta.app.ref) {
    const r = installApp(dir, ref);
    return { action: 'installed', ref, version: r.app.version || '', states: r.states.map((s) => s.id), added: r.states.map((s) => s.id), gone: [] };
  }
  if (meta.app.ref !== ref) throw new Error('this video is made on ' + meta.app.ref + ', not ' + ref + '; a video holds one app, so make another video for another app');
  const r = resolveApp(ref);
  const before = meta.app.states || [];
  copyAppFiles(r, path.join(dir, 'rig', 'app'));
  const now = r.states.map((s) => s.id);
  writeAppMeta(dir, ref, r);
  return { action: 'updated', ref, from: meta.app.version || '', version: r.app.version || '', states: now, added: now.filter((id) => before.indexOf(id) < 0), gone: before.filter((id) => now.indexOf(id) < 0) };
}

// ---- making and growing an app ----
function writableAppsDir() {
  const d = process.env.VKIT_APPS ? path.resolve(process.env.VKIT_APPS) : path.join(KIT, '..', 'apps');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function appNew(ref, opts) {
  checkRef(ref);
  opts = opts || {};
  const base = opts.dir ? path.resolve(opts.dir) : writableAppsDir();
  const dir = path.join(base, ref);
  if (fs.existsSync(path.join(dir, 'app.json'))) throw new Error(dir + ' already exists; nothing written');
  const [family, tool] = ref.split('/');
  fs.mkdirSync(path.join(dir, 'states'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'captures'), { recursive: true });
  const app = { name: tool, family, title: opts.title || tool, extends: opts.extends || '', version: '0.1.0', created_on: new Date().toISOString().slice(0, 10),
    rule: 'Recreate from your own captures, cite each, never invent a control.' };
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify(app, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'tokens.css'), opts.tokens || ('/* ' + ref + ': the tool\'s measured palette and faces, scoped to the screen. Measure from the captures; never restyle. */\n#mock{\n  --p-ui:system-ui,-apple-system,"Segoe UI",sans-serif;\n  --p-ground:#ffffff;--p-surface:#ffffff;--p-border:#e0e0e0;--p-strong:#222222;--p-body:#444444;--p-muted:#777777;--p-accent:#0066cc;\n}\n'));
  fs.writeFileSync(path.join(dir, 'screen.css'), opts.screen || ('/* ' + ref + ': the screen\'s structure (bar, navigation, rows), scoped to #mock. Sizes measured from the captures at 1920x1080. */\n'));
  fs.writeFileSync(path.join(dir, 'manifest.csv'), MANIFEST_HEAD + '\n');
  fs.writeFileSync(path.join(dir, 'captures', 'README.md'), '# Captures for ' + ref + '\n\nThe screenshots each state came from, named by id (CAP-001.png ...). `manifest.csv` says which state uses which. Nothing on a state exists without a capture here.\n');
  return { ref, dir, app };
}
function appAddState(ref, id, opts) {
  opts = opts || {};
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id || '')) throw new Error('a state id is lowercase letters, digits and hyphens: ' + id);
  const r = resolveApp(ref);
  if (r.states.some((s) => s.id === id)) throw new Error(ref + ' already has a state ' + id);
  const file = id + '.html';
  let capture = opts.capture || '';
  if (capture && fs.existsSync(capture)) {
    const name = path.basename(capture);
    fs.copyFileSync(capture, path.join(r.dir, 'captures', name));
    capture = name;
  }
  fs.writeFileSync(path.join(r.dir, 'states', file), opts.markup != null ? opts.markup : '<!-- state ' + id + ' of ' + ref + ': the markup inside #mock, recreated from ' + (capture || 'its capture') + '. Keep the ids the timeline points at. -->\n');
  appendManifest(r.dir, { id, file, screen: opts.screen || '', state: opts.state || '', capture, captured_on: opts.captured_on || '', note: opts.note || '' });
  return { ref, id, file: path.join(r.dir, 'states', file) };
}

// appExtract(videoDir, ref, id): lift a video's inline screen into an app (made
// if missing): the markup inside #mock, the screen's rules from the page's
// style block, the palette from theme.css. A starting point the person finishes.
function appExtract(videoDir, ref, id, opts) {
  opts = opts || {};
  const rig = path.join(path.resolve(videoDir), 'rig');
  const html = fs.readFileSync(path.join(rig, 'index.html'), 'utf8');
  const theme = fs.existsSync(path.join(rig, 'theme.css')) ? fs.readFileSync(path.join(rig, 'theme.css'), 'utf8') : '';
  const markup = stripBlock(html, MARK.html), rules = stripBlock(html, MARK.css), tokens = stripBlock(theme, MARK.css);
  if (!markup.found) throw new Error('rig/index.html has no <!-- screen:inline --> block around the markup inside #mock; mark it and run again');
  let app;
  try { app = resolveApp(ref); }
  catch (e) {
    app = appNew(ref, { dir: opts.dir, title: opts.title, tokens: tokens.found ? '/* ' + ref + ': palette lifted from ' + path.basename(videoDir) + '/rig/theme.css. Measure from the captures; never restyle. */\n' + tokens.inner.trim() + '\n' : undefined,
      screen: rules.found ? '/* ' + ref + ': structure lifted from ' + path.basename(videoDir) + '/rig/index.html. Sizes measured at 1920x1080. */\n' + rules.inner.trim() + '\n' : undefined });
  }
  const s = appAddState(ref, id, { markup: markup.inner.replace(/^\n+/, '').replace(/\s+$/, '') + '\n', capture: opts.capture, screen: opts.screen, state: opts.state, note: opts.note || ('lifted from ' + path.basename(videoDir)) });
  return { ref, id, dir: app.dir, state: s.file, tokens: tokens.found, screen: rules.found };
}

// appCrop(ref, captureId, { name, x, y, w, h }) -> { file, row }
// A copy of a region of one of the app's own captures, for the things on a screen that are
// pictures rather than text: the product's logo, its icons, a chevron. The capture is never
// changed; the crop is a copy of its pixels (in the picture's own pixels, 2x for a 3840x2160
// capture) into crops/<name>.png, with a row in crops.csv saying which capture and where. This
// is the stop-motion way: the recording shows the logo, so the recreation shows the recording's
// logo, and no file of the product's is ever taken.
const CROPS_HEAD = 'name,file,capture,x,y,w,h,scale';
function appCrop(ref, captureId, opts) {
  const app = resolveApp(ref);
  opts = opts || {};
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.name || '')) throw new Error('a crop is named in lowercase letters, digits and hyphens: ' + opts.name);
  const src = path.join(app.dir, 'captures', /\.png$/i.test(captureId) ? captureId : captureId + '.png');
  if (!fs.existsSync(src)) throw new Error('no such capture: ' + path.relative(process.cwd(), src));
  const { PNG } = require('pngjs');
  const png = PNG.sync.read(fs.readFileSync(src));
  const x = Number(opts.x), y = Number(opts.y), w = Number(opts.w), h = Number(opts.h);
  if (![x, y, w, h].every((n) => Number.isInteger(n) && n >= 0) || w === 0 || h === 0 || x + w > png.width || y + h > png.height) throw new Error('the region ' + [x, y, w, h].join(',') + ' is not inside the ' + png.width + 'x' + png.height + ' picture (in the picture\'s own pixels)');
  const out = new PNG({ width: w, height: h });
  for (let row = 0; row < h; row++) png.data.copy(out.data, row * w * 4, ((y + row) * png.width + x) * 4, ((y + row) * png.width + x + w) * 4);
  const dir = path.join(app.dir, 'crops');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, opts.name + '.png');
  if (fs.existsSync(file) && !opts.replace) throw new Error(path.relative(process.cwd(), file) + ' exists; pick another name or --replace');
  fs.writeFileSync(file, PNG.sync.write(out));
  const csv = path.join(dir, 'crops.csv');
  const scale = png.width / 1920;
  const row = { name: opts.name, file: opts.name + '.png', capture: path.basename(src), x, y, w, h, scale };
  let lines = fs.existsSync(csv) ? fs.readFileSync(csv, 'utf8').split(/\r?\n/).filter(Boolean) : [CROPS_HEAD];
  lines = lines.filter((l, i) => i === 0 || parseCsvLine(l)[0] !== opts.name);
  lines.push(CROPS_HEAD.split(',').map((k) => csvCell(row[k])).join(','));
  fs.writeFileSync(csv, lines.join('\n') + '\n');
  return { file, row, width: w, height: h, scale };
}

module.exports = { appDirs, resolveApp, readManifest, appendManifest, statesJs, installApp, appUse, appNew, appAddState, appExtract, appCrop, MARK, MANIFEST_HEAD, CROPS_HEAD };
