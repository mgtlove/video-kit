// Maintenance (docs/MAINTENANCE.md, milestone A2): an app is the hub and the videos and twins made from it are
// spokes, each carrying a copy. These functions keep the hub one:
//   status(root)            every app with its states, model, paths, captures, change log and twin, and every video
//                           with the engine and app version it carries against the kit's and the app's, marked
//                           current or behind, with the app's changes since the copy
//   readChanges(appDir)     the app's CHANGES.md: one line per version, newest first ("- 0.3.2 (2026-10-12): ...")
//   changesSince(dir, a, b) the lines a copy at version a has not seen
//   sweep(root, opts)       vkit app use --all: every video brought up to its app, then each one's quick check
//   buildApp(ref)           vkit app build: the app's own generator run if it has one, then the states verified
//                           against the manifest and the crops
// Nothing here edits a state or an engine; nothing is deleted.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const apps = require('./apps');
const { KIT, engineVersion } = require('./new');

const CHANGES_HEAD = '# Changes';
const LINE = /^- (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\): (.+)$/;

function cmpVersion(a, b) {
  const A = String(a || '0').split('.').map(Number), B = String(b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (A[i] || 0) - (B[i] || 0); if (d) return d; }
  return 0;
}
function readChanges(appDir) {
  const file = path.join(appDir, 'CHANGES.md');
  if (!fs.existsSync(file)) return null;
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = LINE.exec(line.trim()); if (m) out.push({ version: m[1], date: m[2], text: m[3] }); }
  return out;
}
function changesSince(appDir, from, to) {
  const all = readChanges(appDir) || [];
  return all.filter((c) => cmpVersion(c.version, from) > 0 && (!to || cmpVersion(c.version, to) <= 0));
}

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
function pluginVersion() { const p = readJson(path.join(KIT, 'packages', 'plugin', '.claude-plugin', 'plugin.json')); return p ? p.version : ''; }
function isVideoDir(d) { const f = path.join(d, 'video.json'); return fs.existsSync(f) && !/\{\{NAME\}\}/.test(fs.readFileSync(f, 'utf8')); }   /* the kit's starter/ is a template, not a video */
function findVideos(root) {   /* the folder itself, the folders in it, and a videos/ folder in it */
  root = path.resolve(root || '.');
  if (isVideoDir(root)) return [root];
  const out = [];
  const look = (d) => { let kids = []; try { kids = fs.readdirSync(d, { withFileTypes: true }).filter((k) => k.isDirectory() && !k.name.startsWith('_') && !k.name.startsWith('.')); } catch (e) { kids = []; } for (const k of kids) if (isVideoDir(path.join(d, k.name))) out.push(path.join(d, k.name)); };
  look(root);
  if (fs.existsSync(path.join(root, 'videos'))) look(path.join(root, 'videos'));
  return out.sort();
}
function listApps() {   /* every app folder the kit can see, once each (VKIT_APPS and apps/ beside the kit may be one folder) */
  const out = [], seenBase = new Set();
  for (const base of apps.appDirs()) {
    if (/[\\/]examples[\\/]apps$/.test(base)) continue;
    let real = base; try { real = fs.realpathSync(base); } catch (e) { real = base; }
    if (seenBase.has(real)) continue; seenBase.add(real);
    let families = []; try { families = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch (e) { families = []; }
    for (const fam of families) {
      let tools = []; try { tools = fs.readdirSync(path.join(base, fam.name), { withFileTypes: true }).filter((d) => d.isDirectory()); } catch (e) { tools = []; }
      for (const t of tools) if (fs.existsSync(path.join(base, fam.name, t.name, 'app.json')) && !out.includes(fam.name + '/' + t.name)) out.push(fam.name + '/' + t.name);
    }
  }
  return out.sort();
}
function appStatus(ref) {
  const r = apps.resolveApp(ref);
  const states = r.states, built = states.filter((s) => fs.existsSync(path.join(r.dir, 'states', s.file || s.id + '.html'))).length;
  const model = readJson(path.join(r.dir, 'model.json'));
  let paths = []; try { paths = fs.readdirSync(path.join(r.dir, 'paths')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort(); } catch (e) { paths = []; }
  let caps = []; try { caps = fs.readdirSync(path.join(r.dir, 'captures')).filter((f) => /^CAP-\d+\.png$/i.test(f)).sort(); } catch (e) { caps = []; }
  const changes = readChanges(r.dir);
  const version = r.app.version || '';
  const logged = changes ? changes.some((c) => c.version === version) : false;
  const twinDir = path.join(r.dir, 'twin');
  let twin = null;
  if (fs.existsSync(path.join(twinDir, 'index.html'))) {
    const eng = fs.existsSync(path.join(twinDir, 'engine', 'VERSION')) ? fs.readFileSync(path.join(twinDir, 'engine', 'VERSION'), 'utf8').trim() : '';
    const copy = readJson(path.join(twinDir, 'app', 'app.json'));
    const appV = copy ? copy.version || '' : '';
    twin = { engine: eng, engineCurrent: eng === engineVersion(), app: appV, appCurrent: appV === version, current: eng === engineVersion() && appV === version };
  }
  return { ref, dir: r.dir, version, title: r.app.title || ref, states: states.length, built, transitions: model && Array.isArray(model.transitions) ? model.transitions.length : 0, model: !!model, paths, captures: caps.length, lastCapture: caps.length ? caps[caps.length - 1].replace(/\.png$/i, '') : '', changes: changes ? changes.length : null, logged, twin };
}
function videoStatus(dir, appsByRef) {
  const meta = readJson(path.join(dir, 'video.json')) || {};
  const name = meta.name || path.basename(dir);
  const versionFile = path.join(dir, 'rig', 'engine', 'VERSION');
  const engine = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : (meta.engine || '');
  const kitEngine = engineVersion();
  let app = null;
  if (meta.app && meta.app.ref) {
    const ref = meta.app.ref, have = meta.app.version || '';
    let hub = null; try { hub = appsByRef[ref] || appStatus(ref); } catch (e) { hub = null; }
    app = { ref, version: have, hub: hub ? hub.version : null, current: hub ? cmpVersion(have, hub.version) >= 0 : null, since: hub ? changesSince(hub.dir, have, hub.version) : [], unlogged: hub ? (hub.changes === null || (cmpVersion(hub.version, have) > 0 && !changesSince(hub.dir, have, hub.version).length)) : false };
  }
  const report = readJson(path.join(dir, 'out', 'check.json'));
  const lastCheck = report ? { on: String(report.checked_on || '').slice(0, 10), failures: report.failures || 0, rows: Object.values(report.groups || {}).reduce((n, g) => n + g.length, 0), quick: !!report.quick } : null;
  return { name, dir, engine, engineCurrent: engine === kitEngine, app, lastCheck, behind: engine !== kitEngine || (app && app.current === false) };
}
function status(root) {
  root = path.resolve(root || '.');
  const appList = listApps().map(appStatus);
  const byRef = Object.fromEntries(appList.map((a) => [a.ref, a]));
  const videos = findVideos(root).map((d) => videoStatus(d, byRef));
  const commands = (() => { try { const src = fs.readFileSync(path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js'), 'utf8'); const block = src.slice(src.indexOf('const COMMANDS = {')); return (block.slice(0, block.indexOf('\n};')).match(/^\s+'[a-z-]+':/gm) || []).length; } catch (e) { return 0; } })();
  return { root, on: new Date().toISOString().slice(0, 10), kit: { engine: engineVersion(), plugin: pluginVersion(), commands }, apps: appList, videos, behind: videos.filter((v) => v.behind).length + appList.filter((a) => a.twin && !a.twin.current).length, unlogged: appList.filter((a) => !a.logged).map((a) => a.ref) };
}
function formatStatus(s) {
  const home = require('os').homedir();
  const rel = (d) => (d.startsWith(home) ? '~' + d.slice(home.length) : d);
  const lines = ['vkit status: ' + rel(s.root) + ', ' + s.on, '  kit: engine ' + s.kit.engine + ', plugin ' + s.kit.plugin + ', ' + s.kit.commands + ' commands', ''];
  lines.push('Apps, the hubs' + (s.apps.length ? ':' : ': none found (VKIT_APPS, or apps/ beside the kit)'));
  for (const a of s.apps) {
    lines.push('  ' + a.ref + '  ' + a.version + ', ' + a.built + ' of ' + a.states + ' states built, ' + (a.model ? a.transitions + ' transitions' : 'no model') + ', ' + (a.paths.length ? a.paths.length + ' path' + (a.paths.length === 1 ? '' : 's') + ' (' + a.paths.join(', ') + ')' : 'no paths') + ', ' + (a.captures ? a.captures + ' captures to ' + a.lastCapture : 'no captures') + '; CHANGES.md: ' + (a.changes === null ? 'none (write one; docs/MAINTENANCE.md)' : a.changes + ' line' + (a.changes === 1 ? '' : 's') + (a.logged ? ', current' : ', no line for ' + a.version)));
    lines.push('    twin: ' + (a.twin ? (a.twin.current ? 'built on engine ' + a.twin.engine + ', app ' + a.twin.app + ', current' : 'behind: built on engine ' + a.twin.engine + (a.twin.engineCurrent ? '' : ' (kit ' + s.kit.engine + ')') + ', app ' + a.twin.app + (a.twin.appCurrent ? '' : ' (app ' + a.version + ')') + '; vkit twin ' + a.ref + ' --build') : 'not built (vkit twin ' + a.ref + ')'));
  }
  lines.push('', 'Videos, the spokes' + (s.videos.length ? ':' : ': none here (a video folder, a folder of them, or one with videos/ in it)'));
  for (const v of s.videos) {
    const eng = 'engine ' + v.engine + (v.engineCurrent ? ' (current)' : ' (behind ' + s.kit.engine + ': vkit upgrade)');
    let app = 'no recreated app';
    if (v.app) {
      if (v.app.hub === null) app = 'app ' + v.app.ref + ' ' + v.app.version + ' (the app folder was not found)';
      else if (v.app.current) app = 'app ' + v.app.ref + ' ' + v.app.version + ' (current)';
      else app = 'app ' + v.app.ref + ' ' + v.app.version + ' (behind ' + v.app.hub + ': ' + (v.app.since.length ? v.app.since.length + ' change' + (v.app.since.length === 1 ? '' : 's') + ' since' : 'no CHANGES.md line says what moved') + '; vkit app use ' + v.app.ref + ')';
    }
    const chk = v.lastCheck ? 'last check ' + v.lastCheck.on + (v.lastCheck.quick ? ' (quick)' : '') + ': ' + v.lastCheck.rows + ' rows, ' + v.lastCheck.failures + ' failing' : 'never checked';
    lines.push('  ' + v.name + '  ' + eng + '; ' + app + '; ' + chk);
    if (v.app && v.app.since.length) for (const c of v.app.since) lines.push('      ' + c.version + ' (' + c.date + '): ' + c.text);
  }
  lines.push('', s.behind ? s.behind + ' cop' + (s.behind === 1 ? 'y is' : 'ies are') + ' behind. vkit app use --all brings every video up to its app and checks each; vkit upgrade <video> moves an engine; vkit twin family/tool --build remakes a twin.' : 'Nothing is behind.');
  if (s.unlogged.length) lines.push('CHANGES.md wants a line for the current version of: ' + s.unlogged.join(', ') + '.');
  return lines.join('\n');
}

// the sweep: every video on the app (or on any app) brought up, then its quick check
async function sweep(root, opts) {
  opts = opts || {};
  const videos = findVideos(root).filter((d) => { const m = readJson(path.join(d, 'video.json')); return m && m.app && m.app.ref && (!opts.ref || m.app.ref === opts.ref); });
  const out = [];
  for (const d of videos) {
    const meta = readJson(path.join(d, 'video.json'));
    const r = apps.appUse(d, meta.app.ref);
    const entry = { dir: d, name: meta.name || path.basename(d), ref: r.ref, from: r.from || meta.app.version || '', version: r.version, moved: (r.from || '') !== r.version, added: r.added, gone: r.gone, since: changesSince(apps.resolveApp(r.ref).dir, r.from || meta.app.version || '', r.version), check: null };
    if (opts.check !== false) {
      const report = await require('./check').check(d, { quick: true, progress: opts.progress, channel: opts.channel });
      const rows = Object.values(report.groups || {}).flat();
      entry.check = { failures: report.failures, rows: rows.length, failing: rows.filter((x) => x.result === 'fail').map((x) => x.id) };
    }
    out.push(entry);
  }
  return { root: path.resolve(root || '.'), ref: opts.ref || null, videos: out };
}
function formatSweep(s) {
  if (!s.videos.length) return 'no video on ' + (s.ref || 'a recreated app') + ' under ' + s.root + '.';
  const lines = [];
  for (const v of s.videos) {
    lines.push(v.name + ': ' + v.ref + ' ' + (v.moved ? v.from + ' to ' + v.version : v.version + ' already') + (v.added.length ? ', added ' + v.added.join(', ') : '') + (v.gone.length ? ', no longer in the app (left on disk): ' + v.gone.join(', ') : '') + (v.check ? '; check: ' + v.check.rows + ' rows, ' + (v.check.failures ? v.check.failures + ' failing (' + v.check.failing.join(', ') + ')' : 'nothing failing') : '; not checked'));
    for (const c of v.since) lines.push('    ' + c.version + ' (' + c.date + '): ' + c.text);
  }
  const broke = s.videos.filter((v) => v.check && v.check.failures);
  lines.push(s.videos.length + ' video' + (s.videos.length === 1 ? '' : 's') + ' swept' + (s.videos.some((v) => v.check) ? ', ' + (broke.length ? broke.length + ' with a failing check: look at the rows, then the frames' : 'every check passing') : '; vkit check in each is the proof') + '.');
  return lines.join('\n');
}

// vkit app build: the app's own generator (make-states.js in the app folder, if it has one), then the states verified
function buildApp(ref) {
  const r = apps.resolveApp(ref);
  const gen = path.join(r.dir, 'make-states.js');
  const rows = apps.readManifest(r.dir);
  const snap = () => Object.fromEntries(rows.map((s) => { const f = path.join(r.dir, 'states', s.file || s.id + '.html'); return [s.id, fs.existsSync(f) ? require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex') : null]; }));
  let generated = null, changed = [];
  if (fs.existsSync(gen)) {
    const before = snap();
    const p = spawnSync(process.execPath, [gen], { cwd: r.dir, encoding: 'utf8' });
    if (p.status !== 0) throw new Error('make-states.js failed in ' + r.dir + ':\n' + (p.stderr || p.stdout));
    generated = (p.stdout || '').trim();
    const after = snap();
    changed = rows.map((s) => s.id).filter((id) => before[id] !== after[id]);
  }
  const missing = [], unbuilt = [], badCrops = [], dupIds = [];
  const cropsDir = path.join(r.dir, 'crops');
  for (const s of rows) {
    const f = path.join(r.dir, 'states', s.file || s.id + '.html');
    if (!fs.existsSync(f)) { (s.capture ? unbuilt : missing).push(s.id); continue; }
    const html = fs.readFileSync(f, 'utf8');
    const seen = new Set();
    for (const m of html.matchAll(/\bid="([^"]+)"/g)) { if (seen.has(m[1])) dupIds.push(s.id + ': ' + m[1]); seen.add(m[1]); }
    for (const m of html.matchAll(/app\/crops\/([^"')\s]+)/g)) if (!fs.existsSync(path.join(cropsDir, m[1]))) badCrops.push(s.id + ': ' + m[1]);
  }
  const strays = (() => { try { return fs.readdirSync(path.join(r.dir, 'states')).filter((f) => f.endsWith('.html') && !rows.some((s) => (s.file || s.id + '.html') === f)); } catch (e) { return []; } })();
  return { ref, dir: r.dir, version: r.app.version || '', generated, generator: fs.existsSync(gen), changed, states: rows.length, built: rows.length - missing.length - unbuilt.length, unbuilt, missing, badCrops, dupIds: [...new Set(dupIds)], strays, ok: !missing.length && !badCrops.length && !dupIds.length };
}
function formatBuild(b) {
  const lines = [b.ref + ' ' + b.version + ': ' + (b.generator ? 'make-states.js run, ' + (b.changed.length ? b.changed.length + ' state' + (b.changed.length === 1 ? '' : 's') + ' changed (' + b.changed.join(', ') + ')' : 'every state byte for byte as before') : 'no generator; the states are written by hand') + '; ' + b.built + ' of ' + b.states + ' states built' + (b.unbuilt.length ? ', captured and not built: ' + b.unbuilt.join(', ') : '') + '.'];
  if (b.missing.length) lines.push('Missing, no capture and no file: ' + b.missing.join(', ') + ' (a manifest row with nothing behind it).');
  if (b.badCrops.length) lines.push('Crops named that are not in crops/: ' + b.badCrops.join('; ') + '.');
  if (b.dupIds.length) lines.push('An id twice in one state: ' + b.dupIds.join('; ') + '.');
  if (b.strays.length) lines.push('In states/ and not in the manifest (left on disk): ' + b.strays.join(', ') + '.');
  lines.push(b.ok ? (b.changed.length ? 'Next: look at the changed states against their captures, bump app.json, write the CHANGES.md line, then vkit app use --all.' : (b.generator ? 'Nothing moved; nothing to bump.' : 'Next, after a state changes: bump app.json, write the CHANGES.md line, then vkit app use --all.')) : 'Fix the above before any spoke takes this version.');
  return lines.join('\n');
}

module.exports = { status, formatStatus, sweep, formatSweep, buildApp, formatBuild, readChanges, changesSince, cmpVersion, findVideos, listApps, CHANGES_HEAD };
