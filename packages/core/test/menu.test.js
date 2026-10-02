// Proof for roadmap step 7b, the menu.
//   1. ten items in order; the option lists come from the data files (looks/index.json,
//      brands/, patterns/index.json, the apps folders), not from code; a new video's record
//      carries the answers and none of the menu's words
//   2. set() records an answer with from and chosen_on; refuses a value outside the options by
//      name; choosing a look or a brand through the menu writes the same look.css and brand.css
//      as vkit look and vkit brand; after vkit measure the re-timing items refuse a change and
//      accept the value they already have; the brand still changes
//   3. vkit menu --walk takes answers from a pipe exactly as a person would type them (Enter
//      keeps, a number picks, ? explains, 0 types, Q stops) and --show and --explain print
// Needs ffmpeg for the measure step. About 15 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const { KIT } = require('../src/new');

const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');
const ORDER = ['job', 'sources', 'layout', 'brand', 'look', 'tone', 'patterns', 'voice', 'characters', 'fixed_lines'];

test('ten items in order, options from the data files, a clean record in the video', () => {
  const its = core.menu.items();
  assert.deepStrictEqual(its.map((i) => i.key), ORDER);
  assert.deepStrictEqual(its.map((i) => i.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const field = (key, name) => its.find((i) => i.key === key).fields.find((f) => f.name === name);
  const looks = JSON.parse(fs.readFileSync(path.join(KIT, 'looks', 'index.json'), 'utf8')).looks.map((l) => l.name);
  assert.deepStrictEqual(field('look', 'value').options.map((o) => o.value), ['house', ...looks]);
  assert.deepStrictEqual(field('brand', 'value').options.map((o) => o.value), ['none', ...core.brands.listBrands()]);
  assert.strictEqual(field('patterns', 'walkthrough').options.length, 35);
  assert.ok(field('patterns', 'concept').options.every((o) => o.means && o.group));
  assert.ok(field('sources', 'app').options.some((o) => o.value === 'example/placeholder'), 'the example app is offered');
  assert.ok(its.every((i) => i.title && i.ask && i.reason), 'every item has a title, a question and a reason');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-menu-'));
  const r = core.newVideo('m', { cwd: tmp });
  const menu = JSON.parse(fs.readFileSync(path.join(r.dir, 'video.json'), 'utf8')).menu;
  assert.deepStrictEqual(Object.keys(menu), ORDER);
  for (const k of ORDER) for (const w of core.menu.EXPLAIN) assert.ok(!(w in menu[k]), k + ' carries the menu word ' + w);
  assert.strictEqual(menu.look.from, 'defaults'); assert.strictEqual(menu.job.from, '');
  console.log('10 items; look ' + field('look', 'value').options.length + ' options, brand ' + field('brand', 'value').options.length + ', patterns 35, apps ' + field('sources', 'app').options.length + '; the video records answers only');
});

test('set records, refuses by name, applies looks and brands, and respects the locks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-menu-'));
  const v = core.newVideo('chosen', { cwd: tmp }), ref = core.newVideo('direct', { cwd: tmp });
  const r1 = core.menu.set(v.dir, 'tone', null, 'full', 'the look has range');
  assert.strictEqual(r1.from, 'chosen'); assert.ok(/^\d{4}-\d\d-\d\d$/.test(r1.chosen_on));
  assert.throws(() => core.menu.set(v.dir, 'tone', null, 'loud'), /tone: loud is not one of formal, full/);
  assert.throws(() => core.menu.set(v.dir, 'patterns', 'concept', 'define-in-the-breath, nope'), /not in patterns: nope/);
  assert.throws(() => core.menu.set(v.dir, 'job', null, 'x'), /job has fields kind, length, audience/);
  assert.throws(() => core.menu.set(v.dir, 'nothing', null, 'x'), /no menu item nothing/);
  const r2 = core.menu.set(v.dir, 'patterns', 'concept', 'define-in-the-breath,cut-on-the-last-word');
  assert.deepStrictEqual(r2.value, ['define-in-the-breath', 'cut-on-the-last-word']);
  core.menu.set(v.dir, 'job', 'length', 'about 70 s');   /* a free field takes anything */

  const l = core.menu.set(v.dir, 'look', null, 'doodle'); assert.strictEqual(l.ran, 'vkit look doodle');
  core.look(ref.dir, 'doodle');
  assert.strictEqual(fs.readFileSync(path.join(v.dir, 'rig', 'look.css'), 'utf8'), fs.readFileSync(path.join(ref.dir, 'rig', 'look.css'), 'utf8'), 'the menu writes the same look.css as vkit look');
  const b = core.menu.set(v.dir, 'brand', null, 'example'); assert.strictEqual(b.ran, 'vkit brand example');
  core.brand(ref.dir, 'example');
  assert.strictEqual(fs.readFileSync(path.join(v.dir, 'rig', 'brand.css'), 'utf8'), fs.readFileSync(path.join(ref.dir, 'rig', 'brand.css'), 'utf8'), 'the menu writes the same brand.css as vkit brand');
  let meta = JSON.parse(fs.readFileSync(path.join(v.dir, 'video.json'), 'utf8'));
  assert.strictEqual(meta.menu.look.value, 'doodle'); assert.strictEqual(meta.menu.look.from, 'chosen'); assert.ok(meta.menu.look.guide, 'the look guide written by vkit look is kept');
  assert.strictEqual(meta.menu.brand.value, 'example'); assert.strictEqual(meta.menu.brand.mark, 'both top-right');

  fs.mkdirSync(path.join(v.dir, 'voice'));
  for (let i = 1; i <= 3; i++) { const f = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=' + (10 + i), '-ar', '48000', path.join(v.dir, 'voice', 'part-' + i + '.wav')]); assert.strictEqual(f.status, 0, String(f.stderr)); }
  core.measure(v.dir);
  const locked = core.menu.items(v.dir).filter((i) => i.locked).map((i) => i.key);
  assert.deepStrictEqual(locked, ['look', 'tone', 'patterns', 'voice']);
  assert.throws(() => core.menu.set(v.dir, 'look', null, 'lightboard'), /look is locked: measured/);
  assert.throws(() => core.menu.set(v.dir, 'voice', 'captions', 'none'), /voice is locked/);
  assert.strictEqual(core.menu.set(v.dir, 'look', null, 'doodle').value, 'doodle', 'the value it already has is accepted');
  assert.strictEqual(core.menu.set(v.dir, 'brand', null, 'none').ran, 'vkit brand none', 'the brand does not re-time the video');
  meta = JSON.parse(fs.readFileSync(path.join(v.dir, 'video.json'), 'utf8'));
  assert.strictEqual(meta.menu.look.value, 'doodle');
  console.log(core.menu.format(core.menu.show(v.dir)).split('\n').filter((x) => /LOCKED/.test(x)).length + ' items shown locked after measure; a locked change refused, the same value accepted, the brand still changes');
});

test('vkit menu walks from a pipe, shows and explains', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-menu-'));
  const v = core.newVideo('walked', { cwd: tmp });
  /* job.kind: 2 (concept); length: type "about a minute"; audience: keep; sources: keep all five; layout: keep;
     brand: ? then keep; look: 3 (code-report); tone: keep; patterns.walkthrough: 1,3; then Q */
  const answers = ['2', '0', 'about a minute', '', '', '', '', '', '', '', '?', '', '3', '', '1,3', 'Q'].join('\n') + '\n';
  const w = spawnSync(process.execPath, [VKIT, 'menu', v.dir, '--walk'], { input: answers, encoding: 'utf8', env: Object.assign({}, process.env, { PW_CHANNEL: process.env.PW_CHANNEL || '' }) });
  assert.strictEqual(w.status, 0, w.stderr + w.stdout);
  assert.ok(/concept chosen/.test(w.stdout) && /code-report chosen; ran vkit look code-report/.test(w.stdout) && /No brand until one is applied/.test(w.stdout), w.stdout);
  const meta = JSON.parse(fs.readFileSync(path.join(v.dir, 'video.json'), 'utf8'));
  assert.strictEqual(meta.menu.job.kind, 'concept'); assert.strictEqual(meta.menu.job.length, 'about a minute');
  assert.strictEqual(meta.menu.look.value, 'code-report');
  const ids = core.menu.items().find((i) => i.key === 'patterns').fields[0].options.map((o) => o.value);
  assert.deepStrictEqual(meta.menu.patterns.walkthrough, [ids[0], ids[2]]);
  assert.strictEqual(meta.menu.tone.from, 'defaults', 'an item passed with Enter keeps its default and its from');
  assert.ok(/code-report/.test(fs.readFileSync(path.join(v.dir, 'rig', 'look.css'), 'utf8')), 'the look chosen in the walk is applied');
  const s = spawnSync(process.execPath, [VKIT, 'menu', v.dir, '--show'], { encoding: 'utf8' });
  assert.strictEqual(s.stdout.trim().split('\n').filter((x) => /^\s*\d+\. /.test(x)).length, 10, s.stdout);
  const e = spawnSync(process.execPath, [VKIT, 'menu', '--explain', 'look'], { encoding: 'utf8' });
  assert.ok(/The look: Which studied look\?/.test(e.stdout) && /lightboard/.test(e.stdout) && /doodle/.test(e.stdout), e.stdout);
  const bad = spawnSync(process.execPath, [VKIT, 'menu', v.dir, '--set', 'tone=loud'], { encoding: 'utf8' });
  assert.strictEqual(bad.status, 1); assert.ok(/loud is not one of/.test(bad.stderr));
  console.log('walk: job.kind concept, length typed, look code-report applied, patterns ' + meta.menu.patterns.walkthrough.join(' + ') + ', stopped at Q; --show 10 lines; --explain lists the looks; a bad --set exits 1');
});
