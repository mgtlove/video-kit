// The menu: the ten choices a video makes, read and written in video.json.menu.
//
// The items, their words and their fixed options live in menu-defaults.json;
// the option lists that grow live in data folders and are read here, never
// typed anywhere: looks/index.json, brands/, patterns/index.json, and the
// recreated apps in the apps folders. A shell (vkit menu, the plugin, the MCP
// server) walks items() and calls set(); the walk order, the checks and the
// side effects are all here.
//
// set() is the one front door: choosing a look runs vkit look, choosing a
// brand runs vkit brand, so video.json and rig/ never disagree. An item that
// vkit measure locked is refused with the reason, unless the value is the one
// it already has.
const fs = require('fs');
const path = require('path');
const { KIT, EXPLAIN } = require('./new');
const { listBrands } = require('./brand');
const { loadPatterns } = require('./sync');
const apps = require('./apps');

function defaults() { return JSON.parse(fs.readFileSync(path.join(KIT, 'menu-defaults.json'), 'utf8')); }
function readMeta(videoDir) {
  const vj = path.join(path.resolve(videoDir), 'video.json');
  if (!fs.existsSync(vj)) throw new Error(path.resolve(videoDir) + ' is not a video folder (no video.json)');
  return { vj, meta: JSON.parse(fs.readFileSync(vj, 'utf8')) };
}

/* the option lists that come from data folders */
function optionsFrom(source) {
  if (source === 'looks') {
    const f = path.join(KIT, 'looks', 'index.json');
    if (!fs.existsSync(f)) return [];
    return JSON.parse(fs.readFileSync(f, 'utf8')).looks.map((l) => ({ value: l.name, means: (l.voice || l.name) + (l.after ? ' (after ' + l.after.replace(/^styles\//, '').replace(/\.md$/, '') + ')' : '') }));
  }
  if (source === 'brands') return listBrands().map((b) => ({ value: b, means: 'brands/' + b + '/brand.json' }));
  if (source === 'patterns') {
    try { return loadPatterns().moves.map((m) => ({ value: m.id, means: m.title + (m.phrases && m.phrases.length ? ': "' + m.phrases[0] + '"' : ''), group: m.group })); } catch (e) { return []; }
  }
  if (source === 'apps') {
    const out = [];
    for (const root of apps.appDirs ? apps.appDirs() : []) {
      for (const fam of fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory())) {
        for (const tool of fs.readdirSync(path.join(root, fam.name), { withFileTypes: true }).filter((e) => e.isDirectory())) {
          const aj = path.join(root, fam.name, tool.name, 'app.json');
          if (fs.existsSync(aj)) { let title = ''; try { title = JSON.parse(fs.readFileSync(aj, 'utf8')).title || ''; } catch (e) { /* named below anyway */ } out.push({ value: fam.name + '/' + tool.name, means: (title || tool.name) + ' in ' + path.relative(path.join(KIT, '..'), root) }); }
        }
      }
    }
    return out;
  }
  return [];
}

function fieldSpec(def, name) {
  const spec = def.fields ? (def.fields[name] || {}) : (name === 'value' ? def : {});
  let options = (spec.options || []).slice();
  if (spec.options_from) options = options.concat(optionsFrom(spec.options_from));
  return { name, options, free: spec.free || null, many: !!spec.many, from: spec.options_from || null };
}

/* items(videoDir): the ten, in menu order, each with its fields, options and the video's current
   answers; without a videoDir, the kit's defaults are the answers */
function items(videoDir) {
  const d = defaults();
  const menu = videoDir ? (readMeta(videoDir).meta.menu || {}) : null;
  const out = [];
  let n = 0;
  for (const [key, def] of Object.entries(d)) {
    if (key.startsWith('_')) continue;
    n++;
    const names = def.fields ? Object.keys(def.fields) : ['value'];
    const rec = menu ? (menu[key] || {}) : def;
    const fields = names.map((name) => Object.assign(fieldSpec(def, name), { current: rec[name] === undefined ? (def[name] === undefined ? '' : def[name]) : rec[name] }));
    out.push({ n, key, title: def.title || key, ask: def.ask || '', reason: def.reason || '', fields, from: menu ? (rec.from || '') : 'defaults', chosen_on: menu ? (rec.chosen_on || '') : '', note: menu ? (rec.note || '') : '', locked: menu ? (rec.locked || '') : '' });
  }
  return out;
}

function explain(key) {
  const d = defaults()[key];
  if (!d) throw new Error('no menu item ' + key + '. Items: ' + Object.keys(defaults()).filter((k) => !k.startsWith('_')).join(', '));
  const names = d.fields ? Object.keys(d.fields) : ['value'];
  return { key, title: d.title || key, ask: d.ask || '', reason: d.reason || '', fields: names.map((name) => fieldSpec(d, name)) };
}

function show(videoDir) { return { name: readMeta(videoDir).meta.name, items: items(videoDir) }; }

function format(s) {
  const lines = [];
  for (const it of s.items) {
    const vals = it.fields.map((f) => (it.fields.length > 1 ? f.name + ' ' : '') + (Array.isArray(f.current) ? (f.current.length ? f.current.join(', ') : '(none)') : (f.current === '' ? '(not chosen)' : f.current))).join('; ');
    lines.push(String(it.n).padStart(2) + '. ' + it.title.padEnd(16) + vals + '   [' + (it.from || 'not chosen') + (it.chosen_on ? ' ' + it.chosen_on : '') + (it.locked ? '; LOCKED' : '') + ']' + (it.note ? '\n    note: ' + it.note : ''));
  }
  return lines.join('\n');
}

/* set(videoDir, key, field, value, note): one answer. field is omitted for a single-value item.
   A list field takes an array or a comma-separated string. Returns what was written and what it
   ran (vkit look or vkit brand). */
function set(videoDir, key, field, value, note) {
  const d = defaults();
  const def = d[key];
  if (!def || key.startsWith('_')) throw new Error('no menu item ' + key + '. Items: ' + Object.keys(d).filter((k) => !k.startsWith('_')).join(', '));
  const names = def.fields ? Object.keys(def.fields) : ['value'];
  if (!field) { if (names.length !== 1) throw new Error(key + ' has fields ' + names.join(', ') + '; say which: vkit menu --set ' + key + '.' + names[0] + '=...'); field = names[0]; }
  if (!names.includes(field)) throw new Error(key + ' has no field ' + field + ' (' + names.join(', ') + ')');
  const spec = fieldSpec(def, field);
  if (spec.many) value = Array.isArray(value) ? value : String(value).split(',').map((s) => s.trim()).filter(Boolean);
  else value = value == null ? '' : String(value).trim();
  const ok = (v) => spec.options.some((o) => o.value === v);
  if (spec.many) { const bad = value.filter((v) => !ok(v)); if (bad.length) throw new Error(key + '.' + field + ': not in ' + (spec.from || 'the options') + ': ' + bad.join(', ') + '. vkit menu --explain ' + key + ' lists them.'); }
  else if (value !== '' && !ok(value) && !spec.free) throw new Error(key + (names.length > 1 ? '.' + field : '') + ': ' + value + ' is not one of ' + spec.options.map((o) => o.value).join(', ') + (spec.from ? ' (from ' + spec.from + ')' : ''));
  const { vj, meta } = readMeta(videoDir);
  meta.menu = meta.menu || {};
  const rec = meta.menu[key] = meta.menu[key] || {};
  const same = JSON.stringify(rec[field]) === JSON.stringify(value);
  if (rec.locked && !same) throw new Error(key + ' is locked: ' + rec.locked + '. Unlock it in video.json.menu.' + key + ' if you mean it.');
  const today = new Date().toISOString().slice(0, 10);
  let ran = null;
  if (key === 'look' && !same) { ran = 'vkit look ' + (value || 'house'); require('./look').applyLook(videoDir, value || 'house'); }
  if (key === 'brand' && !same) { ran = 'vkit brand ' + (value || 'none'); require('./brand').applyBrand(videoDir, value || 'none'); }
  const fresh = JSON.parse(fs.readFileSync(vj, 'utf8'));   /* look and brand wrote video.json; build on that */
  fresh.menu = fresh.menu || {}; const r = fresh.menu[key] = fresh.menu[key] || {};
  r[field] = value; r.from = 'chosen'; r.chosen_on = today; if (note != null) r.note = note;
  fs.writeFileSync(vj, JSON.stringify(fresh, null, 2) + '\n');
  return { key, field, value, from: 'chosen', chosen_on: today, ran, note: r.note || '' };
}

module.exports = { items, show, set, explain, format, optionsFrom, defaults, EXPLAIN };
