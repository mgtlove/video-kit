// Proof for roadmap step 7a, words and clips.
//   narration: the starter's parts pass the limits, FULL.md is written with
//   every sentence, the estimate is words over the rate; a 1001-character part
//   and a 31-word sentence are refused by name.
//   measure: three clips of odd lengths (23.47, 25.91, 17.62 s) go into the
//   page's PARTS line and video.json exactly; the page's own total then equals
//   their sum; the menu items that would re-time the video are locked; a
//   missing clip stops everything with nothing written.
// Needs ffmpeg and ffprobe. About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const render = require('../src/adapters/render');

test('narration holds the parts to the limits and writes FULL.md', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-words-'));
  const r = core.newVideo('n', { cwd: tmp });
  const ok = core.narration(r.dir);
  assert.strictEqual(ok.problems, 0);
  assert.deepStrictEqual(ok.parts.map((p) => p.sentences), [6, 8, 3]);
  const full = fs.readFileSync(ok.full, 'utf8');
  for (const f of ['part-1.md', 'part-2.md', 'part-3.md']) for (const line of fs.readFileSync(path.join(r.dir, 'narration', f), 'utf8').split('\n').filter(Boolean)) assert.ok(full.includes(line), 'FULL.md lacks: ' + line);
  assert.ok(Math.abs(ok.parts[0].estimateSeconds - ok.parts[0].words / 150 * 60) < 0.1);
  fs.appendFileSync(path.join(r.dir, 'narration', 'part-3.md'), 'word '.repeat(31).trim() + '.\n' + 'x'.repeat(1001) + '\n');
  const bad = core.narration(r.dir);
  assert.ok(bad.problems >= 2, 'the long sentence and the long part are both named');
  assert.ok(bad.parts[2].problems.some((p) => /31 words/.test(p)) && bad.parts[2].problems.some((p) => /characters/.test(p)));
  console.log('starter narration: ' + ok.parts.map((p) => p.words + ' words').join(', ') + ', about ' + ok.total + ' s at 150 wpm; the broken part named ' + bad.parts[2].problems.length + ' problems');
});

test('measure writes the exact clip lengths and locks what would re-time the video', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-words-'));
  const r = core.newVideo('m', { cwd: tmp });
  const opts = { channel: process.env.PW_CHANNEL || undefined };
  assert.throws(() => core.measure(r.dir), /no voice\/ folder/);
  fs.mkdirSync(path.join(r.dir, 'voice'));
  const lengths = [23.47, 25.91, 17.62];
  lengths.forEach((sec, i) => { if (i === 2) return; const f = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=' + sec, '-ar', '48000', path.join(r.dir, 'voice', 'part-' + (i + 1) + '.wav')]); assert.strictEqual(f.status, 0, String(f.stderr)); });
  const before = fs.readFileSync(path.join(r.dir, 'rig', 'index.html'), 'utf8');
  assert.throws(() => core.measure(r.dir), /no clip for part 3/);
  assert.strictEqual(fs.readFileSync(path.join(r.dir, 'rig', 'index.html'), 'utf8'), before, 'a missing clip writes nothing');
  const f3 = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=17.62', '-ar', '48000', path.join(r.dir, 'voice', 'part-3.wav')]); assert.strictEqual(f3.status, 0);
  const m = core.measure(r.dir);
  assert.deepStrictEqual(m.clips.map((c) => c.seconds), lengths);
  assert.ok(/var PARTS = \[23\.47, 25\.91, 17\.62\];/.test(fs.readFileSync(path.join(r.dir, 'rig', 'index.html'), 'utf8')));
  const meta = JSON.parse(fs.readFileSync(path.join(r.dir, 'video.json'), 'utf8'));
  assert.deepStrictEqual(meta.parts.part_seconds, lengths);
  assert.ok(meta.parts.measured_on && meta.menu.look.locked && meta.menu.tone.locked && meta.menu.patterns.locked && meta.menu.voice.locked);
  const info = await render.info(path.join(r.dir, 'rig'), opts);
  assert.ok(Math.abs(info.total - 67.0) < 0.001, 'the page total is the sum of the clips: ' + info.total);
  assert.throws(() => core.look(r.dir, 'doodle'), /locked/);
  console.log('PARTS ' + JSON.stringify(info.parts) + ', total ' + info.total + ' s; look, tone, patterns, voice locked; a look change is refused');
});
