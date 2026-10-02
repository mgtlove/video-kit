// applyBrand(videoDir, name): a brand becomes tokens the theme reads first.
//
// A brand is one folder (brands/<name>/): brand.json with five colours, two
// faces, a mark and a banner, plus the files it names. vkit brand <name> copies
// the folder into rig/brand/ and writes rig/brand.css as --brand-* tokens.
// theme.css reads the brand before the look and before its own defaults
//   --stage: var(--brand-ground, var(--look-ground, #1c1e1d))
// so a brand wins where it speaks and is silent where it does not; "no brand"
// is an empty brand.css and renders byte for byte the same (brand.test.js).
//
// The mark and the banner are tokens too (--brand-mark-when and friends); the
// engine (0.4.0) builds the two elements at boot from those tokens and gives
// them beats, so a frame at t shows the mark exactly as playback would. The
// placements are fixed by the craft rules, not by the brand: every corner sits
// inside title safe and above the caption band.
//
// brandCheck(videoDir): what is applied, and each brand colour against the
// surface it will sit on, measured with the contrast rules in rules.json. The
// brand's colours are written as given; a brand is a brand. A ratio that fails
// is reported here and fails vkit check on the rendered pixels; the fix is in
// the brand's own file.
const fs = require('fs');
const path = require('path');
const { loadRules } = require('./sync');
const { KIT } = require('./new');
const { ratio } = require('./check');

const COLOURS = ['ground', 'ink', 'primary', 'secondary', 'highlight'];
const WHEN = ['never', 'opener', 'close', 'both', 'always', 'watermark'];
const MARK_WHERE = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const BANNER_WHERE = ['top', 'bottom'];
const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

function hex(h) { h = String(h).trim().replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); if (!/^[0-9a-fA-F]{6}$/.test(h)) return null; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function brandsDir() { return path.join(KIT, 'brands'); }

function listBrands() {
  const dir = brandsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== 'TEMPLATE' && fs.existsSync(path.join(dir, e.name, 'brand.json'))).map((e) => e.name).sort();
}

function loadBrand(from) {
  const file = fs.existsSync(from) && fs.statSync(from).isDirectory() ? path.join(from, 'brand.json') : from;
  if (!fs.existsSync(file)) throw new Error('no brand.json at ' + file);
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  b.colours = b.colours || {}; b.faces = b.faces || {}; b.mark = b.mark || {}; b.banner = b.banner || {};
  const problems = [];
  for (const k of Object.keys(b.colours)) if (b.colours[k] && !hex(b.colours[k])) problems.push('colours.' + k + ' is not a hex colour: ' + b.colours[k]);
  for (const k of Object.keys(b.colours)) if (!COLOURS.includes(k)) problems.push('colours.' + k + ' is not one of ' + COLOURS.join(', '));
  const when = (x) => x.when || 'never';
  if (!WHEN.includes(when(b.mark))) problems.push('mark.when must be one of ' + WHEN.join(', ') + ': ' + b.mark.when);
  if (!WHEN.includes(when(b.banner))) problems.push('banner.when must be one of ' + WHEN.join(', ') + ': ' + b.banner.when);
  if (b.mark.where && !MARK_WHERE.includes(b.mark.where)) problems.push('mark.where must be a corner: ' + MARK_WHERE.join(', '));
  if (b.banner.where && !BANNER_WHERE.includes(b.banner.where)) problems.push('banner.where must be top or bottom');
  if (b.mark.file && !fs.existsSync(path.join(path.dirname(file), b.mark.file))) problems.push('mark.file not found beside brand.json: ' + b.mark.file);
  if (problems.length) throw new Error('brand.json at ' + file + ':\n  ' + problems.join('\n  '));
  b._dir = path.dirname(file);
  return b;
}

/* the colour a name resolves to inside the brand: a colour name or a literal */
function colourOf(b, v) { if (!v) return null; if (COLOURS.includes(v)) return b.colours[v] || null; return hex(v) ? v : null; }
function autoInk(fill) { const f = hex(fill); if (!f) return null; return ratio(BLACK, f) >= ratio(WHITE, f) ? '#000000' : '#ffffff'; }
function cssString(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }

function tokensFor(b) {
  const t = {}, notes = [];
  for (const k of COLOURS) if (b.colours[k]) t['--brand-' + k] = b.colours[k];
  if (b.colours.primary) { t['--brand-primary-ink'] = autoInk(b.colours.primary); notes.push('primary ink ' + t['--brand-primary-ink'] + ' holds ' + ratio(hex(t['--brand-primary-ink']), hex(b.colours.primary)).toFixed(1) + ':1 on the primary'); }
  if (b.faces.display) t['--brand-font-display'] = b.faces.display;
  if (b.faces.text) t['--brand-font-text'] = b.faces.text;
  const mark = b.mark, mw = mark.when || 'never', hasMark = mw !== 'never' && (mark.text || mark.file);
  if (mw !== 'never' && !hasMark) notes.push('mark.when is ' + mw + ' but the mark has no text and no file; no mark is shown');
  if (hasMark) {
    t['--brand-mark-when'] = mw;
    t['--brand-mark-where'] = mark.where || 'top-right';
    t['--brand-mark-size'] = (mark.size || 40) + 'px';
    t['--brand-mark-opacity'] = mark.opacity == null ? 0.9 : mark.opacity;
    t['--brand-mark-seconds'] = mark.seconds || 5;
    if (mark.text) t['--brand-mark-text'] = cssString(mark.text);
    if (mark.file) t['--brand-mark-image'] = 'url(brand/' + mark.file + ')';
    if (mark.ink) t['--brand-mark-ink'] = colourOf(b, mark.ink) || mark.ink;
  }
  const ban = b.banner, bw = ban.when || 'never', hasBanner = bw !== 'never' && ban.text;
  if (bw !== 'never' && !hasBanner) notes.push('banner.when is ' + bw + ' but the banner has no text; no banner is shown');
  if (hasBanner) {
    const fill = colourOf(b, ban.fill || 'primary') || b.colours.primary || null;
    t['--brand-banner-when'] = bw;
    t['--brand-banner-where'] = ban.where || 'bottom';
    t['--brand-banner-size'] = (ban.size || 36) + 'px';
    t['--brand-banner-opacity'] = ban.opacity == null ? 1 : ban.opacity;
    t['--brand-banner-seconds'] = ban.seconds || 5;
    t['--brand-banner-text'] = cssString(ban.text);
    if (fill) { t['--brand-banner-fill'] = fill; t['--brand-banner-ink'] = (!ban.ink || ban.ink === 'auto') ? autoInk(fill) : (colourOf(b, ban.ink) || ban.ink); }
    else notes.push('banner.fill names no colour the brand has; the theme\'s accent fills it');
  }
  return { tokens: t, notes, hasMark: !!hasMark, hasBanner: !!hasBanner };
}

function brandCss(b, t, notes) {
  const lines = ['/* brand: ' + b.name + '. Written by vkit brand from rig/brand/brand.json; change that file and run vkit brand again. theme.css reads these before the look and before its defaults; the engine builds the mark and the banner from the --brand-mark-* and --brand-banner-* tokens. */'];
  for (const n of notes) lines.push('/* ' + n + ' */');
  lines.push(':root{');
  for (const [k, v] of Object.entries(t)) if (v != null) lines.push('  ' + k + ':' + v + ';');
  lines.push('}');
  return lines.join('\n') + '\n';
}

const EMPTY = '/* no brand: the look and the theme\'s own defaults render. vkit brand <name> fills this file. */\n';

function copyBrandDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.isDirectory()) copyBrandDir(path.join(src, e.name), path.join(dst, e.name));
    else fs.copyFileSync(path.join(src, e.name), path.join(dst, e.name));
  }
}

function linkCss(rig) {
  const html = path.join(rig, 'index.html');
  let page = fs.readFileSync(html, 'utf8');
  if (page.includes('href="brand.css"')) return false;
  const anchor = page.includes('<link rel="stylesheet" href="look.css">') ? '<link rel="stylesheet" href="look.css">' : '<link rel="stylesheet" href="theme.css">';
  if (!page.includes(anchor)) throw new Error('rig/index.html has no theme.css link to anchor brand.css on');
  fs.writeFileSync(html, page.replace(anchor, anchor + '\n<link rel="stylesheet" href="brand.css">'));
  return true;
}

/* applyBrand(videoDir, name): name is a brand in brands/, a path to a brand folder, 'none', or
   nothing (rebuild brand.css from rig/brand/brand.json after a hand edit). */
function applyBrand(videoDir, name) {
  const dir = path.resolve(videoDir), rig = path.join(dir, 'rig');
  const vj = path.join(dir, 'video.json');
  if (!fs.existsSync(vj)) throw new Error(dir + ' is not a video folder (no video.json)');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
  meta.menu = meta.menu || {};
  const file = path.join(rig, 'brand.css'), own = path.join(rig, 'brand');
  const today = new Date().toISOString().slice(0, 10);
  let result;
  if (name === 'none') {
    fs.writeFileSync(file, EMPTY);
    meta.menu.brand = Object.assign(meta.menu.brand || {}, { value: 'none', from: 'vkit brand', chosen_on: today });
    delete meta.menu.brand.notes;
    result = { name: 'none', file, tokens: {}, notes: fs.existsSync(own) ? ['rig/brand/ is left in place and does nothing without brand.css; move it aside if you want it gone'] : [] };
  } else {
    let src;
    if (!name) { if (!fs.existsSync(path.join(own, 'brand.json'))) throw new Error('no rig/brand/brand.json to rebuild from. vkit brand <name> applies one of: ' + (listBrands().join(', ') || '(none in brands/)')); src = null; }
    else if (fs.existsSync(path.join(brandsDir(), name, 'brand.json'))) src = path.join(brandsDir(), name);
    else if (fs.existsSync(path.join(path.resolve(name), 'brand.json'))) src = path.resolve(name);
    else throw new Error('no brand ' + name + ' in brands/ (' + (listBrands().join(', ') || 'empty') + ') and no folder at ' + path.resolve(name));
    if (src) { loadBrand(src); copyBrandDir(src, own); }   /* checked before anything is copied */
    const b = loadBrand(own);
    const { tokens, notes, hasMark, hasBanner } = tokensFor(b);
    fs.writeFileSync(file, brandCss(b, tokens, notes));
    meta.menu.brand = Object.assign(meta.menu.brand || {}, { value: b.name || name, from: 'vkit brand', chosen_on: today, mark: hasMark ? (b.mark.when + ' ' + (b.mark.where || 'top-right')) : 'none', banner: hasBanner ? (b.banner.when + ' ' + (b.banner.where || 'bottom')) : 'none' });
    if (notes.length) meta.menu.brand.notes = notes; else delete meta.menu.brand.notes;
    result = { name: b.name || name, file, tokens, notes, hasMark, hasBanner };
  }
  linkCss(rig);
  fs.writeFileSync(vj, JSON.stringify(meta, null, 2) + '\n');
  return result;
}

/* the value a theme token resolves to without a browser: brand.css, then look.css, then the
   default written in theme.css as the innermost fallback */
function readTokens(file, prefix) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const re = new RegExp('(' + prefix + '[a-z0-9-]+):([^;]+);', 'g');
  let m; const s = fs.readFileSync(file, 'utf8'); while ((m = re.exec(s))) out[m[1]] = m[2].trim();
  return out;
}
function themeDefault(rig, token) {
  const s = fs.existsSync(path.join(rig, 'theme.css')) ? fs.readFileSync(path.join(rig, 'theme.css'), 'utf8') : '';
  const m = new RegExp(token + ':([^;]+);').exec(s);
  if (!m) return null;
  const inner = m[1].match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
  return inner ? inner[inner.length - 1] : null;
}
function resolve(rig, brandName, lookName, themeToken) {
  const b = readTokens(path.join(rig, 'brand.css'), '--brand-'), l = readTokens(path.join(rig, 'look.css'), '--look-');
  if (b['--brand-' + brandName]) return { value: b['--brand-' + brandName], from: 'brand' };
  if (l['--look-' + lookName]) return { value: l['--look-' + lookName], from: 'look' };
  return { value: themeDefault(rig, themeToken), from: 'theme' };
}

/* the recreated screen's ground: the app's tokens.css when the video is app-backed, else the
   inline palette in theme.css; strokes sit on it more than on anything else */
function screenGround(rig) {
  for (const f of [path.join(rig, 'app', 'tokens.css'), path.join(rig, 'theme.css')]) {
    if (!fs.existsSync(f)) continue;
    const m = /--p-ground:\s*(#[0-9a-fA-F]{3,6})/.exec(fs.readFileSync(f, 'utf8'));
    if (m) return { value: m[1], from: path.basename(path.dirname(f)) === 'app' ? 'the app\'s tokens.css' : 'the inline screen in theme.css' };
  }
  return null;
}

function brandCheck(videoDir) {
  const dir = path.resolve(videoDir), rig = path.join(dir, 'rig');
  const rules = loadRules().contrast;
  const css = path.join(rig, 'brand.css');
  const applied = fs.existsSync(css) ? readTokens(css, '--brand-') : {};
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'video.json'), 'utf8'));
  const name = (meta.menu && meta.menu.brand && meta.menu.brand.value) || 'none';
  const ground = resolve(rig, 'ground', 'ground', '--stage'), ink = resolve(rig, 'ink', 'ink', '--ink');
  const primary = resolve(rig, 'primary', 'accent-1', '--accent'), secondary = resolve(rig, 'secondary', 'kind-b', '--kind-b');
  const highlight = resolve(rig, 'highlight', 'stroke', '--hi');
  const rows = [];
  const row = (what, fg, bg, need, place) => {
    const a = hex(fg.value), b = hex(bg.value);
    if (!a || !b) { rows.push({ what, result: 'not measured', measured: 'not a hex colour: ' + fg.value + ' on ' + bg.value, need: need + ':1', place }); return; }
    const r = ratio(a, b);
    rows.push({ what, result: r >= need ? 'pass' : 'fail', measured: r.toFixed(2) + ':1 (' + fg.value + ' from ' + fg.from + ' on ' + bg.value + ' from ' + bg.from + ')', need: need + ':1', place });
  };
  row('ink on ground', ink, ground, rules.text, 'every sentence on the stage');
  row('primary on ground', primary, ground, rules.largeText, 'kickers and the accent');
  row('secondary on ground', secondary, ground, rules.largeText, 'the second kind colour');
  row('highlight on ground', highlight, ground, rules.nonText, 'strokes and the pointer ring on the stage');
  row('highlight on white', highlight, { value: '#ffffff', from: 'a white product screen' }, rules.nonText, 'strokes over a recreated screen');
  const screen = screenGround(rig);
  if (screen && screen.value.toLowerCase() !== '#ffffff') row('highlight on the screen', highlight, screen, rules.nonText, 'strokes over this video\'s recreated screen, whose ground is not white');
  if (applied['--brand-banner-fill']) row('banner ink on its fill', { value: applied['--brand-banner-ink'], from: 'brand' }, { value: applied['--brand-banner-fill'], from: 'brand' }, rules.text, 'the banner');
  if (applied['--brand-mark-text']) row('mark on ground', applied['--brand-mark-ink'] ? { value: applied['--brand-mark-ink'], from: 'brand' } : ink, ground, rules.largeText, 'the text mark in its corner');
  const mark = applied['--brand-mark-when'] ? applied['--brand-mark-when'] + ' at ' + applied['--brand-mark-where'] + ', ' + applied['--brand-mark-size'] + ' high, opacity ' + applied['--brand-mark-opacity'] + (applied['--brand-mark-image'] ? ', image ' + applied['--brand-mark-image'] : '') + (applied['--brand-mark-text'] ? ', text ' + applied['--brand-mark-text'] : '') : 'none';
  const banner = applied['--brand-banner-when'] ? applied['--brand-banner-when'] + ' at the ' + applied['--brand-banner-where'] + ', ' + applied['--brand-banner-size'] + ', ' + applied['--brand-banner-text'] : 'none';
  return { name, applied, mark, banner, rows, failures: rows.filter((r) => r.result === 'fail').length };
}

function formatCheck(r) {
  const out = ['brand: ' + r.name, 'mark: ' + r.mark, 'banner: ' + r.banner, 'tokens written: ' + (Object.keys(r.applied).length || 'none'), ''];
  for (const x of r.rows) out.push((x.result === 'pass' ? 'pass ' : x.result === 'fail' ? 'FAIL ' : 'n/m  ') + x.what.padEnd(24) + x.measured + ', needs ' + x.need + '  (' + x.place + ')');
  out.push('', r.failures ? r.failures + ' ratio(s) under the rule; vkit check will fail on the pixels. The fix is in the brand\'s own colours.' : 'every ratio holds; vkit check measures the rendered pixels.');
  return out.join('\n');
}

module.exports = { applyBrand, brandCheck, formatCheck, listBrands, loadBrand, tokensFor, brandCss, COLOURS, WHEN };
