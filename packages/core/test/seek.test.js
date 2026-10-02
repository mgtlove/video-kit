// Proof for roadmap steps 2 and 3: a seek to t shows what playback shows at t.
// Creates a video from the starter in a temp folder, plays it for real to four
// moments (a scene crossfade, a card entrance, a camera move, a pull-back),
// reads the exact time each picture shows, seeks to that time, and compares
// the PNGs pixel by pixel. Needs playwright; PW_CHANNEL=chrome uses the
// installed Chrome. Tolerance: no more than 0.05 percent of pixels may differ
// by more than 8 levels. Measured with engine 0.1.1: 0 pixels at all four
// moments (held transitions are baked on the main thread and every capture
// waits for its commit to be on screen; before that a crossfade measured up
// to 6 levels and a camera move 225 edge pixels, and the figures varied
// between browser sessions).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PNG } = (() => { try { return require('pngjs'); } catch (e) { return {}; } })();
const core = require('../src');
const render = require('../src/adapters/render');

function readPng(file) {
  if (PNG) return PNG.sync.read(fs.readFileSync(file));
  throw new Error('pngjs is needed to compare frames: npm install');
}
function diff(a, b) {
  const A = readPng(a), B = readPng(b);
  let over = 0, max = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    if (d > max) max = d;
    if (d > 8) over++;
  }
  return { over, max, total: A.data.length / 4 };
}

test('seek equals playback on the starter', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-'));
  const r = core.newVideo('proof', { cwd: tmp });
  const rig = path.join(r.dir, 'rig');
  const opts = { channel: process.env.PW_CHANNEL || undefined };
  const asked = [3.3, 6.3, 11.3, 28.3, 33.3, 39.4, 40.4, 41.3, 45.3];   /* the step 3 four, plus step 4: a figure fading in, a stroke drawing on, the pointer mid-glide, the click ring mid-way, typing mid-word */
  const played = await render.playbackFrames(rig, asked, path.join(rig, '_playback'), opts);
  const sought = await render.frames(rig, played.map((p) => p.reached), path.join(rig, '_seek'), opts);
  for (let i = 0; i < asked.length; i++) {
    const d = diff(played[i].file, sought[i]);
    const share = d.over / d.total;
    console.log(`t=${asked[i]} reached ${played[i].reached.toFixed(4)}: ${d.over} of ${d.total} pixels differ by more than 8 (max ${d.max})`);
    assert.ok(share <= 0.0005, `seek differs from playback at ${asked[i]}: ${(share * 100).toFixed(3)} percent of pixels`);
  }
});
