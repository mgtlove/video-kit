// syncReference(opts): the kit carries small data files made from the
// research repo (video-reference), never read from it at run time:
//   rules.json           the measurable craft rules, for vkit check
//   looks/<name>.json    the look packs, one file each, for vkit look and the menu
//   patterns/index.json  the patterns index, for the menu
// The reference is found at $VKIT_REFERENCE, then ../video-reference beside the
// kit. Each copied file records where it came from and when.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { KIT } = require('./new');

function referenceDir(given) {
  const dirs = [given, process.env.VKIT_REFERENCE, path.join(KIT, '..', 'video-reference')].filter(Boolean).map((d) => path.resolve(d));
  const found = dirs.find((d) => fs.existsSync(path.join(d, 'craft', 'rules.json')) || fs.existsSync(path.join(d, 'catalog.md')));
  if (!found) throw new Error('no video-reference at ' + dirs.join(', ') + '. Clone it beside the kit or set VKIT_REFERENCE.');
  return found;
}
function commitOf(dir) {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

function syncRules(ref) {
  const src = path.join(ref, 'craft', 'rules.json');
  if (!fs.existsSync(src)) throw new Error('the reference has no craft/rules.json at ' + src);
  const rules = JSON.parse(fs.readFileSync(src, 'utf8'));
  rules._source = { repo: 'video-reference', file: 'craft/rules.json', commit: commitOf(ref), copied_on: new Date().toISOString().slice(0, 10),
    note: 'Copied by vkit sync-reference; edit the reference, not this file. The frame geometry rows (rail, caption band) describe the older inset layout; the kit has one full-frame layout and captions as a sidecar, so vkit check applies safe areas, contrast, text, colour, motion and pacing and marks the band and rail rows as not applicable.' };
  const dst = path.join(KIT, 'rules.json');
  fs.writeFileSync(dst, JSON.stringify(rules, null, 2) + '\n');
  return { file: dst, source: src, commit: rules._source.commit };
}

// syncLooks(ref): styles/looks.json -> looks/<name>.json, one file per pack with
// the same keys, plus looks/index.json (name, after, ground, accents, voice) for
// the menu to list.
function syncLooks(ref) {
  const src = path.join(ref, 'styles', 'looks.json');
  if (!fs.existsSync(src)) throw new Error('the reference has no styles/looks.json at ' + src);
  const all = JSON.parse(fs.readFileSync(src, 'utf8'));
  const dir = path.join(KIT, 'looks'); fs.mkdirSync(dir, { recursive: true });
  const stamp = { repo: 'video-reference', file: 'styles/looks.json', commit: commitOf(ref), copied_on: new Date().toISOString().slice(0, 10), note: 'Copied by vkit sync-reference; edit the reference, not this file.' };
  const index = [];
  for (const [name, look] of Object.entries(all.looks)) {
    const out = Object.assign({ name, _source: stamp, _keys: all.keys }, look);
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(out, null, 2) + '\n');
    index.push({ name, after: look.after, ground: look.ground, ink: look.ink, paper: look.paper, accents: look.accents, voice: look.voice, sceneKinds: look.sceneKinds, file: 'looks/' + name + '.json' });
  }
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ _source: stamp, looks: index }, null, 2) + '\n');
  return { count: index.length, dir, source: src, commit: stamp.commit };
}

// syncPatterns(ref): styles/patterns/<move>.md -> patterns/index.json, one entry
// per move: id, title, group, the phrases a person would say, the first line of
// the effect, and the note's path in the reference. The notes stay there; the
// menu's ? opens one when the reference is cloned beside the kit.
function syncPatterns(ref) {
  const dir = path.join(ref, 'styles', 'patterns');
  if (!fs.existsSync(dir)) throw new Error('the reference has no styles/patterns at ' + dir);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !/^(README|PATTERN-TEMPLATE)\.md$/.test(f)).sort();
  const moves = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const title = (text.match(/^#\s+(.+)$/m) || [])[1] || f.replace(/\.md$/, '');
    const head = (text.match(/^Group:\s*([a-z-]+)\.\s*Say it like:\s*(.+)$/m) || []);
    const phrases = head[2] ? [...head[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
    const effect = (text.split(/^## The effect\s*$/m)[1] || '').split(/^## /m)[0].trim().split('\n').filter(Boolean)[0] || '';
    const needs = (text.split(/^## What it needs\s*$/m)[1] || '').split(/^## /m)[0].trim().split('\n').filter(Boolean)[0] || '';
    moves.push({ id: f.replace(/\.md$/, ''), title, group: head[1] || '', phrases, effect, needs, note: 'styles/patterns/' + f });
  }
  const out = path.join(KIT, 'patterns', 'index.json'); fs.mkdirSync(path.dirname(out), { recursive: true });
  const stamp = { repo: 'video-reference', file: 'styles/patterns/', commit: commitOf(ref), copied_on: new Date().toISOString().slice(0, 10), note: 'Made by vkit sync-reference from the pattern notes; edit the notes, not this file.' };
  fs.writeFileSync(out, JSON.stringify({ _source: stamp, groups: [...new Set(moves.map((m) => m.group))].sort(), moves }, null, 2) + '\n');
  return { count: moves.length, file: out, source: dir, commit: stamp.commit };
}

function syncReference(opts) {
  opts = opts || {};
  const ref = referenceDir(opts.path);
  const only = opts.only;                       /* 'rules' | 'looks' | 'patterns' | undefined for all */
  const done = {};
  if (!only || only === 'rules') done.rules = syncRules(ref);
  if (!only || only === 'looks') done.looks = syncLooks(ref);
  if (!only || only === 'patterns') done.patterns = syncPatterns(ref);
  return { reference: ref, done };
}

function loadLook(name) {
  const f = path.join(KIT, 'looks', name + '.json');
  if (!fs.existsSync(f)) { const have = fs.existsSync(path.join(KIT, 'looks')) ? fs.readdirSync(path.join(KIT, 'looks')).filter((x) => x.endsWith('.json') && x !== 'index.json' && x !== 'faces.json').map((x) => x.replace(/\.json$/, '')) : []; throw new Error('no look ' + name + '. The kit has: ' + (have.join(', ') || 'none; run vkit sync-reference')); }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
function loadPatterns() {
  const f = path.join(KIT, 'patterns', 'index.json');
  if (!fs.existsSync(f)) throw new Error('the kit has no patterns/index.json; run vkit sync-reference');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function loadRules() {
  const f = path.join(KIT, 'rules.json');
  if (!fs.existsSync(f)) throw new Error('the kit has no rules.json; run vkit sync-reference with video-reference beside the kit');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

module.exports = { syncReference, syncRules, syncLooks, syncPatterns, referenceDir, loadRules, loadLook, loadPatterns };
