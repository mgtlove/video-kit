// newVideo(name, opts): a video is a folder. Copies starter/, fills the
// placeholders, copies the engine in at this kit's version, writes video.json
// with the menu defaults marked "from: defaults". opts.app (family/tool) makes
// it app-backed: the recreated app is copied into rig/app/ (see apps.js).
const fs = require('fs');
const path = require('path');

const KIT = path.resolve(__dirname, '..', '..', '..');

function copyDir(src, dst, fill) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, fill);
    else {
      const buf = fs.readFileSync(s);
      const text = /\.(html|css|js|md|json|txt)$/.test(e.name) ? fill(buf.toString('utf8')) : buf;
      fs.writeFileSync(d, text);
    }
  }
}

function engineVersion() {
  const src = fs.readFileSync(path.join(KIT, 'packages', 'core', 'engine', 'rig.js'), 'utf8');
  const m = src.match(/version:\s*'([^']+)'/);
  return m ? m[1] : '0.0.0';
}

const EXPLAIN = ['reason', 'kinds', 'title', 'ask', 'options', 'options_from', 'fields'];
function menuDefaults() {
  const d = JSON.parse(fs.readFileSync(path.join(KIT, 'menu-defaults.json'), 'utf8'));
  const menu = {};
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('_')) continue;
    const item = Object.assign({}, v);
    for (const x of EXPLAIN) delete item[x];   /* the menu's words stay in the kit; a video records choices */
    const own = k === 'job' || k === 'sources';
    menu[k] = Object.assign(item, { from: own ? '' : 'defaults', chosen_on: '', note: '' });
  }
  return menu;
}

function newVideo(name, opts) {
  opts = opts || {};
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error('name must be lowercase letters, digits and hyphens: ' + name);
  const dst = path.resolve(opts.cwd || process.cwd(), name);
  if (fs.existsSync(dst)) throw new Error(dst + ' already exists; nothing written');
  const engine = engineVersion();
  const date = new Date().toISOString().slice(0, 10);
  const menu = JSON.stringify(menuDefaults(), null, 2).replace(/\n/g, '\n  ');
  const fill = (s) => s.replace(/\{\{NAME\}\}/g, name).replace(/\{\{ENGINE\}\}/g, engine).replace(/\{\{DATE\}\}/g, date).replace(/\{\{MENU\}\}/g, menu);
  copyDir(path.join(KIT, 'starter'), dst, fill);
  const eng = path.join(dst, 'rig', 'engine');
  fs.mkdirSync(eng, { recursive: true });
  for (const f of ['rig.js', 'rig.css']) fs.copyFileSync(path.join(KIT, 'packages', 'core', 'engine', f), path.join(eng, f));
  fs.writeFileSync(path.join(eng, 'VERSION'), engine + '\n');
  JSON.parse(fs.readFileSync(path.join(dst, 'video.json'), 'utf8'));   // proves the fill produced valid JSON
  let app = null;
  if (opts.app) app = require('./apps').installApp(dst, opts.app);     // app-backed: the app copied in, the page pointed at it
  return { dir: dst, engine: engine, app: app ? { ref: app.ref, version: app.app.version, states: app.states.map((s) => s.id) } : null };
}

module.exports = { newVideo, engineVersion, menuDefaults, EXPLAIN, KIT };
