// Proof for roadmap step 7b, the brand kit.
//   1. brands/example and brands/TEMPLATE load; a brand with a bad `when` or a missing mark
//      file is refused by name before anything is copied
//   2. the brand layer is inert: a page with no brand.css link renders byte for byte the same
//      stills as the starter's empty brand.css (engine 0.4.0 with no brand is the old engine)
//   3. vkit brand example changes the stills, passes vkit check --quick (contrast measured on
//      the pixels), puts the mark inside title safe and the banner above the caption band,
//      shows the mark for the opener and the close only, and vkit brand none restores every
//      still byte for byte
//   4. `always` hides the mark while a recreated screen is up; `watermark` keeps it; both
//      measured in the page at a moment the screen fills the frame
//   5. brandCheck names a highlight that cannot hold 3:1 on a white screen or on the
//      recreated screen's own ground, and nothing else
// About four minutes: three sets of stills, a quick check, two surveys.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const render = require('../src/adapters/render');
const { KIT } = require('../src/new');

const SAFE_X = 96, SAFE_Y = 54, CAPTION_BAND = 200;

test('the kit carries the example brand and the template; a broken brand is refused by name', () => {
  assert.deepStrictEqual(core.brands.listBrands(), ['example']);
  const ex = core.brands.loadBrand(path.join(KIT, 'brands', 'example'));
  assert.deepStrictEqual(Object.keys(ex.colours).sort(), core.brands.COLOURS.slice().sort());
  const tpl = core.brands.loadBrand(path.join(KIT, 'brands', 'TEMPLATE'));
  assert.strictEqual(core.brands.tokensFor(tpl).hasMark, false, 'the template shows nothing');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-brand-'));
  const bad = JSON.parse(fs.readFileSync(path.join(KIT, 'brands', 'example', 'brand.json'), 'utf8'));
  bad.mark.when = 'sometimes'; bad.mark.file = 'missing.svg';
  fs.writeFileSync(path.join(tmp, 'brand.json'), JSON.stringify(bad));
  assert.throws(() => core.brands.loadBrand(tmp), /mark\.when must be one of[\s\S]*mark\.file not found/);
  const r = core.newVideo('refused', { cwd: tmp });
  assert.throws(() => core.brand(r.dir, tmp), /mark\.when/);
  assert.ok(!fs.existsSync(path.join(r.dir, 'rig', 'brand')), 'a refused brand copies nothing');
  console.log('example: ' + Object.keys(core.brands.tokensFor(ex).tokens).length + ' tokens; the template is empty; a bad when and a missing file are both named');
});

test('no brand is inert; the example brand holds the rules, shows at the right times and comes off clean', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-brand-'));
  const opts = require('./opts')();
  const plain = core.newVideo('plain', { cwd: tmp });
  const html = path.join(plain.dir, 'rig', 'index.html');
  fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('<link rel="stylesheet" href="brand.css">\n', ''));   /* no brand layer at all */
  const v = core.newVideo('branded', { cwd: tmp });
  const a = await core.frames(plain.dir, opts), b = await core.frames(v.dir, opts);
  assert.strictEqual(a.files.length, b.files.length);
  for (let i = 0; i < a.files.length; i++) assert.ok(fs.readFileSync(a.files[i]).equals(fs.readFileSync(b.files[i])), 'the empty brand layer changed ' + path.basename(a.files[i]));

  const applied = core.brand(v.dir, 'example');
  assert.ok(applied.hasMark && applied.hasBanner);
  assert.ok(fs.existsSync(path.join(v.dir, 'rig', 'brand', 'mark.svg')), 'the brand folder is copied in');
  const meta = JSON.parse(fs.readFileSync(path.join(v.dir, 'video.json'), 'utf8'));
  assert.strictEqual(meta.menu.brand.value, 'example'); assert.strictEqual(meta.menu.brand.from, 'vkit brand');
  const chk = core.brandCheck(v.dir);
  assert.strictEqual(chk.failures, 0, core.brands.formatCheck(chk));

  const c = await core.frames(v.dir, Object.assign({ outDir: path.join(v.dir, 'rig', '_branded') }, opts));
  const changed = c.files.filter((f, i) => !fs.readFileSync(f).equals(fs.readFileSync(a.files[i]))).length;
  assert.ok(changed >= a.files.length - 1, 'the brand changes the stills (' + changed + ' of ' + a.files.length + '; the black opener may not)');

  const report = await core.check(v.dir, Object.assign({ quick: true }, opts));
  const failing = Object.values(report.groups).flat().filter((x) => x.result === 'fail').map((x) => x.id + ': ' + x.measured.slice(0, 120));
  assert.deepStrictEqual(failing, [], 'the branded starter fails the checker: ' + failing.join(' | '));

  /* the mark for the opener (0 to 5 s) and the close (last 5 s), the banner for the close; boxes inside the rules */
  const total = c.total;
  const measure = () => {
    const box = (id) => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top, opacity: parseFloat(getComputedStyle(el).opacity) }; };
    return { mark: box('mark'), banner: box('banner') };
  };
  const seen = await render.survey(path.join(v.dir, 'rig'), [2, 12, 30, total - 2], measure, opts);
  const at = (t) => seen.find((s) => s.t === t).data;
  assert.ok(at(2).mark.opacity > 0.8 && at(2).banner.opacity === 0, 'at 2 s the mark is up and the banner is not');
  assert.ok(at(12).mark.opacity === 0 && at(12).banner.opacity === 0, 'at 12 s neither is up');
  assert.ok(at(30).mark.opacity === 0, 'at 30 s (the screen is up) the mark is not');
  assert.ok(at(total - 2).mark.opacity > 0.8 && at(total - 2).banner.opacity === 1, 'in the close both are up');
  const m = at(2).mark, bn = at(total - 2).banner;
  assert.ok(m.t >= SAFE_Y && m.r <= 1920 - SAFE_X && m.l >= SAFE_X, 'the mark sits inside title safe: ' + JSON.stringify(m));
  assert.ok(Math.round(m.b - m.t) === 40, 'the mark is its size high: ' + (m.b - m.t));
  assert.ok(bn.b <= 1080 - CAPTION_BAND && bn.l === 0 && bn.r === 1920, 'the banner spans the frame above the caption band: ' + JSON.stringify(bn));

  const off = core.brand(v.dir, 'none');
  assert.strictEqual(off.name, 'none');
  const d = await core.frames(v.dir, Object.assign({ outDir: path.join(v.dir, 'rig', '_none') }, opts));
  for (let i = 0; i < a.files.length; i++) assert.ok(fs.readFileSync(a.files[i]).equals(fs.readFileSync(d.files[i])), 'vkit brand none did not restore ' + path.basename(a.files[i]));
  console.log(a.files.length + ' stills identical with and without the empty brand layer; ' + changed + ' of ' + a.files.length + ' change under the example brand, which passes check --quick; mark ' + JSON.stringify(m) + '; banner bottom ' + bn.b + '; all identical again after none');
});

test('always hides the mark over a recreated screen, watermark keeps it; a weak highlight is named', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-brand-'));
  const opts = require('./opts')();
  const make = (name, when) => {
    const src = JSON.parse(fs.readFileSync(path.join(KIT, 'brands', 'example', 'brand.json'), 'utf8'));
    src.name = name; src.mark.when = when; src.mark.file = ''; src.banner.when = 'never';
    const dir = path.join(tmp, name + '-brand'); fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, 'brand.json'), JSON.stringify(src));
    const v = core.newVideo(name, { cwd: tmp }); core.brand(v.dir, dir); return v.dir;
  };
  const always = make('always', 'always'), water = make('watermark', 'watermark');
  const op = () => parseFloat(getComputedStyle(document.getElementById('mark')).opacity);
  const sa = await render.survey(path.join(always, 'rig'), [12, 30], op, opts);
  const sw = await render.survey(path.join(water, 'rig'), [12, 30], op, opts);
  assert.ok(sa[0].data > 0.8 && sa[1].data === 0, 'always: up on the stage, down over the screen: ' + sa.map((s) => s.data));
  assert.ok(sw[0].data > 0.8 && sw[1].data > 0.8, 'watermark: up both times: ' + sw.map((s) => s.data));

  const weak = JSON.parse(fs.readFileSync(path.join(KIT, 'brands', 'example', 'brand.json'), 'utf8'));
  weak.colours.highlight = '#ff7b54';
  const wd = path.join(tmp, 'weak-brand'); fs.mkdirSync(wd); fs.writeFileSync(path.join(wd, 'brand.json'), JSON.stringify(weak)); fs.copyFileSync(path.join(KIT, 'brands', 'example', 'mark.svg'), path.join(wd, 'mark.svg'));
  const v = core.newVideo('weak', { cwd: tmp }); core.brand(v.dir, wd);
  const chk = core.brandCheck(v.dir);
  const bad = chk.rows.filter((r) => r.result === 'fail').map((r) => r.what);
  assert.deepStrictEqual(bad, ['highlight on white', 'highlight on the screen'], core.brands.formatCheck(chk));   /* the two surfaces a stroke sits on; nothing else moves */
  console.log('always ' + sa.map((s) => s.t + 's:' + s.data).join(' ') + '; watermark ' + sw.map((s) => s.t + 's:' + s.data).join(' ') + '; #ff7b54 fails only ' + bad.join(', '));
});
