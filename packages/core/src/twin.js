// The twin (docs/MODEL.md): the app's states and model served as a page a learner clicks through, on the
// same engine a video renders with. buildTwin(ref, { path }) writes apps/<family>/<tool>/twin/ (the runner page,
// the engine, the app's files, states.js with the model, the path the sidekick walks); serveTwin(dir, opts) serves it on localhost.
// The runner is generic kit code (packages/core/twin/); everything that names the product comes from the
// app folder. The built folder is a build product: vkit twin remakes it in a second.
const fs = require('fs');
const http = require('http');
const path = require('path');
const apps = require('./apps');
const { KIT, engineVersion } = require('./new');

const RUNNER = path.join(KIT, 'packages', 'core', 'twin');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8' };

function buildTwin(ref, opts) {
  opts = opts || {};
  const r = apps.resolveApp(ref);
  const modelFile = path.join(r.dir, 'model.json');
  if (!fs.existsSync(modelFile)) throw new Error(ref + ' has no model.json: write the app\'s behaviour first (docs/MODEL.md)');
  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const dst = path.resolve(opts.out || path.join(r.dir, 'twin'));
  fs.mkdirSync(path.join(dst, 'engine'), { recursive: true });
  for (const f of ['rig.js', 'rig.css']) fs.copyFileSync(path.join(KIT, 'packages', 'core', 'engine', f), path.join(dst, 'engine', f));
  fs.writeFileSync(path.join(dst, 'engine', 'VERSION'), engineVersion() + '\n');
  apps.copyAppFiles(r, path.join(dst, 'app'));
  for (const f of ['twin.js', 'twin.css']) fs.copyFileSync(path.join(RUNNER, f), path.join(dst, f));
  const title = r.app.title || ref;
  /* each state's real address, from the capture it cites (CAP-NNN.json, written by vkit shoot), else model.urls; a twin shows it in
     its address bar. Swept like a shot: an address carrying a 12-digit number is left out and named. */
  const urls = {}, swept = [];
  for (const st of r.states) {
    let url = (model.urls && model.urls[st.id]) || '';
    const cap = st.capture && path.join(r.dir, 'captures', st.capture.replace(/\.png$/i, '.json'));
    if (cap && fs.existsSync(cap)) { try { url = JSON.parse(fs.readFileSync(cap, 'utf8')).url || url; } catch (e) { /* a values file that is not json: no address */ } }
    if (/\d{12}/.test(url)) { swept.push(st.id); url = ''; }
    urls[st.id] = url;
  }
  /* the path the sidekick walks (docs/MODEL.md, "A path as data"): apps/<f>/<t>/paths/<name>.json, the one asked for by opts.path, else the
     first by name; an app with no paths/ gets a sidekick with no steps (the panel still holds Start over and the notices). */
  const pathsDir = path.join(r.dir, 'paths');
  const pathNames = fs.existsSync(pathsDir) ? fs.readdirSync(pathsDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort() : [];
  let walk = null;
  if (opts.path && pathNames.indexOf(opts.path) < 0) throw new Error(ref + ' has no paths/' + opts.path + '.json' + (pathNames.length ? ' (it has: ' + pathNames.join(', ') + ')' : ''));
  const pathName = opts.path || pathNames[0] || null;
  if (pathName) {
    walk = JSON.parse(fs.readFileSync(path.join(pathsDir, pathName + '.json'), 'utf8'));
    const states = new Set(r.states.map((s) => s.id));
    for (const st of walk.steps || []) {
      if (!st.control) throw new Error('paths/' + pathName + '.json: a step with no control');
      if (!(model.transitions || []).some((t) => t.control === st.control && states.has(t.from))) throw new Error('paths/' + pathName + '.json: step ' + st.control + ' is not a control in any transition of the model');
    }
  }
  fs.writeFileSync(path.join(dst, 'index.html'), fs.readFileSync(path.join(RUNNER, 'index.html'), 'utf8').replace(/\{\{TITLE\}\}/g, title).replace('{{URLS}}', JSON.stringify(urls)).replace('{{PATH}}', JSON.stringify(walk)));
  fs.writeFileSync(path.join(dst, 'README.md'), '# ' + title + ': the practice copy\n\nWritten by `vkit twin ' + ref + '` on engine ' + engineVersion() + '; a build product, made again by the command. Serve it with `vkit twin ' + ref + '` and open the URL it prints; `index.html` opened from disk works too. The states, pictures and face are the app\'s (`../states/`, `../model.json`); nothing here is edited by hand.\n');
  const built = r.states.filter((s) => fs.existsSync(path.join(r.dir, 'states', s.file || s.id + '.html'))).length;
  return { dir: dst, ref, title, engine: engineVersion(), states: r.states.length, built, transitions: (model.transitions || []).length, start: model.start, urls: Object.values(urls).filter(Boolean).length, swept, path: pathName, steps: walk ? (walk.steps || []).length : 0, paths: pathNames, rules: Object.values(model.fields || {}).reduce((n, f) => n + (f.rules || []).length, 0) };
}

function serveTwin(dir, opts) {
  opts = opts || {};
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not here: ' + p); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(opts.port || 0, '127.0.0.1', () => resolve({ server, port: server.address().port, url: 'http://127.0.0.1:' + server.address().port + '/', close: () => new Promise((r) => server.close(r)) }));
  });
}

module.exports = { buildTwin, serveTwin };
