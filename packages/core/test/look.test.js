// Proof for roadmap step 7a, looks: the seven look packs are usable footage
// and the look layer is inert when empty.
//   1. the kit's looks/ and patterns/index.json come from the reference: seven
//      looks on one key set, 35 moves each with phrases
//   2. the starter with each look applied passes vkit check --quick, contrast
//      included; a look that fails is a finding about the pack, not hidden
//   3. a video whose page has no look.css link renders byte for byte the same
//      stills as one with the starter's empty look.css: the layer adds nothing
//      until a look is applied
//   4. vkit look none after a look puts the stills back to identical
// About four minutes: eight quick checks and three sets of stills.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const { KIT } = require('../src/new');

const LOOKS = ['lightboard', 'code-report', 'studio-walkthrough', 'clippings', 'doodle', 'lecture-slides', 'archive-camera'];

test('the kit carries seven looks and 35 moves from the reference', () => {
  const index = JSON.parse(fs.readFileSync(path.join(KIT, 'looks', 'index.json'), 'utf8'));
  assert.deepStrictEqual(index.looks.map((l) => l.name).sort(), LOOKS.slice().sort());
  const keys = Object.keys(JSON.parse(fs.readFileSync(path.join(KIT, 'looks', 'lightboard.json'), 'utf8'))._keys);
  for (const name of LOOKS) { const look = JSON.parse(fs.readFileSync(path.join(KIT, 'looks', name + '.json'), 'utf8')); for (const k of keys) assert.ok(k in look, name + ' lacks ' + k); }
  const patterns = JSON.parse(fs.readFileSync(path.join(KIT, 'patterns', 'index.json'), 'utf8'));
  assert.strictEqual(patterns.moves.length, 35);
  assert.ok(patterns.moves.every((m) => m.phrases.length > 0 && m.group && m.title), 'every move has a title, a group and phrases');
  assert.deepStrictEqual(patterns.groups, ['argument', 'camera', 'voice-and-sound', 'word-and-picture']);
});

test('every look passes the checker on the starter', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-look-'));
  const r = core.newVideo('looked', { cwd: tmp });
  const opts = require('./opts')({ quick: true });
  const results = [];
  for (const name of LOOKS) {
    const l = core.look(r.dir, name);
    const report = await core.check(r.dir, opts);
    const failing = Object.values(report.groups).flat().filter((x) => x.result === 'fail').map((x) => x.id + ': ' + x.measured.slice(0, 120));
    results.push(name + ': ' + (failing.length ? 'FAIL ' + failing.join(' | ') : 'pass') + (l.notes.length ? ' (' + l.notes.length + ' mapping notes)' : ''));
    assert.deepStrictEqual(failing, [], name + ' fails the checker: ' + failing.join(' | '));
  }
  console.log(results.join('\n'));
});

test('the look layer is inert until a look is applied, and none restores it', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-look-'));
  const opts = require('./opts')();
  const plain = core.newVideo('plain', { cwd: tmp });
  const html = path.join(plain.dir, 'rig', 'index.html');
  fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('<link rel="stylesheet" href="look.css">\n', ''));   /* no look layer at all */
  const layered = core.newVideo('layered', { cwd: tmp });
  const a = await core.frames(plain.dir, opts), b = await core.frames(layered.dir, opts);
  assert.strictEqual(a.files.length, b.files.length);
  for (let i = 0; i < a.files.length; i++) assert.ok(fs.readFileSync(a.files[i]).equals(fs.readFileSync(b.files[i])), 'the empty look layer changed ' + path.basename(a.files[i]));
  core.look(layered.dir, 'doodle');
  const c = await core.frames(layered.dir, Object.assign({ outDir: path.join(layered.dir, 'rig', '_doodle') }, opts));
  const changed = c.files.filter((f, i) => !fs.readFileSync(f).equals(fs.readFileSync(a.files[i]))).length;
  assert.ok(changed >= a.files.length - 2, 'a look changes the stills (' + changed + ' of ' + a.files.length + ' differ; the black opener and the fade may not)');
  const back = core.look(layered.dir, 'none');
  assert.strictEqual(back.name, 'none');
  const d = await core.frames(layered.dir, Object.assign({ outDir: path.join(layered.dir, 'rig', '_none') }, opts));
  for (let i = 0; i < a.files.length; i++) assert.ok(fs.readFileSync(a.files[i]).equals(fs.readFileSync(d.files[i])), 'vkit look none did not restore ' + path.basename(a.files[i]));
  console.log(a.files.length + ' stills identical with and without the empty look layer; ' + changed + ' of ' + a.files.length + ' change under doodle; all identical again after none');
});
