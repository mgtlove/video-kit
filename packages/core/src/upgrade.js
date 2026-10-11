// upgradeEngine(videoDir): the kit's engine into a video, the way vkit app use brings an app copy up
// to date. A video carries its own copy of rig.js and rig.css (rig/engine/) and never edits it; when
// the kit's engine moves, this copies the two files in, writes rig/engine/VERSION and video.json.engine,
// and says what changed. The old copy is not deleted: it goes to _suggested-trash/engine-<from>-<date>/
// in the video, and the report says so. A copy that differs from the kit's at the same version is named
// (someone edited the engine inside the video, which the rules forbid), then replaced like any other.
//
// packPlugin(opts): the plugin folder as the zip claude.ai's upload takes (packages/plugin/ without
// node_modules and .DS_Store), written to opts.out or ~/Desktop/vkit-plugin.zip, stored not deflated
// so two packs of the same files are byte for byte the same. Returns the path, the entries, the version.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { KIT, engineVersion } = require('./new');
const { writeZip } = require('./zip');

const ENGINE_FILES = ['rig.js', 'rig.css'];

function upgradeEngine(videoDir) {
  const dir = path.resolve(videoDir || '.');
  const vj = path.join(dir, 'video.json');
  if (!fs.existsSync(vj)) throw new Error('no video.json in ' + dir + ' (run inside a video folder made by vkit new)');
  const eng = path.join(dir, 'rig', 'engine');
  const to = engineVersion();
  const versionFile = path.join(eng, 'VERSION');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
  const from = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : (meta.engine || 'none');
  const differed = [], same = [];
  for (const f of ENGINE_FILES) {
    const have = path.join(eng, f), want = path.join(KIT, 'packages', 'core', 'engine', f);
    if (!fs.existsSync(have)) { differed.push(f + ' (missing)'); continue; }
    if (fs.readFileSync(have).equals(fs.readFileSync(want))) same.push(f); else differed.push(f);
  }
  const current = from === to && !differed.length && meta.engine === to;
  let kept = null;
  if (!current) {
    if (fs.existsSync(eng) && differed.length) {   /* the old copy is kept, never deleted */
      kept = path.join(dir, '_suggested-trash', 'engine-' + from + '-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
      fs.mkdirSync(kept, { recursive: true });
      for (const f of fs.readdirSync(eng)) fs.copyFileSync(path.join(eng, f), path.join(kept, f));
    }
    fs.mkdirSync(eng, { recursive: true });
    for (const f of ENGINE_FILES) fs.copyFileSync(path.join(KIT, 'packages', 'core', 'engine', f), path.join(eng, f));
    fs.writeFileSync(versionFile, to + '\n');
    meta.engine = to;
    fs.writeFileSync(vj, JSON.stringify(meta, null, 2) + '\n');
  }
  const edited = from === to ? differed.filter((f) => !/missing/.test(f)) : [];
  return { dir, from, to, current, changed: differed, kept, edited };
}

function formatUpgrade(r) {
  const rel = (f) => path.relative(process.cwd(), f) || '.';
  if (r.current) return rel(r.dir) + ' is on engine ' + r.to + ' already; nothing written.';
  const lines = [rel(r.dir) + ': engine ' + r.from + ' to ' + r.to + ' (' + (r.changed.length ? r.changed.join(', ') : 'VERSION and video.json only') + '); rig/engine/VERSION and video.json.engine written.'];
  if (r.edited.length) lines.push('Note: ' + r.edited.join(', ') + ' differed from the kit\'s ' + r.to + '. An engine is never edited inside a video; the kit\'s copy is in place now.');
  if (r.kept) lines.push('The old copy is in ' + rel(r.kept) + ' (not deleted).');
  lines.push('Next: PW_CHANNEL=chrome vkit frames, and look.');
  return lines.join('\n');
}

function packPlugin(opts) {
  opts = opts || {};
  const src = path.join(KIT, 'packages', 'plugin');
  const skip = (name) => name === 'node_modules' || name === '.DS_Store' || name === '__pycache__';
  const entries = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (skip(e.name)) continue;
      const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(p, r); else entries.push({ name: 'plugin/' + r, data: fs.readFileSync(p) });
    }
  })(src, '');
  const version = JSON.parse(fs.readFileSync(path.join(src, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  const desktop = path.join(os.homedir(), 'Desktop');
  const out = path.resolve(opts.out || path.join(fs.existsSync(desktop) ? desktop : process.cwd(), 'vkit-plugin.zip'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, writeZip(entries));
  return { file: out, entries: entries.map((e) => e.name), version, bytes: fs.statSync(out).size };
}

module.exports = { upgradeEngine, formatUpgrade, packPlugin, ENGINE_FILES };
