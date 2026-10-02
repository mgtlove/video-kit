// Proof for roadmap step 5: vkit render makes an MP4 that is the run.
// Creates a video from the starter in a temp folder, gives it three clips
// (a 0.3 s beep then silence, each exactly its part's length), renders, and
// checks four things:
//   1. the MP4 is exactly the sum of the parts long, at the frame count fps * total
//   2. the frame handed to ffmpeg at each seek-test moment equals vkit frames at
//      that moment (same tolerance as the seek test: 0.05 percent over 8 levels;
//      measured 0 pixels)
//   3. the frame decoded back out of the MP4 at that moment is the same picture
//      under the codec: at least 40 dB PSNR against the seek frame (a frame off
//      by one measures 26 to 28 dB; crf 18 measures 45 to 49 dB)
//   4. the beeps land at the part offsets (0, P(1), P(2)) in the mixed track
// Needs playwright, pngjs and ffmpeg. About three minutes: the starter is 2040
// frames and every one is rendered. PW_CHANNEL=chrome uses the installed Chrome.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { PNG } = require('pngjs');
const core = require('../src');
const render = require('../src/adapters/render');

function readPng(file) { return PNG.sync.read(Buffer.isBuffer(file) ? file : fs.readFileSync(file)); }
function compare(a, b) {
  const A = readPng(a), B = readPng(b);
  let over = 0, max = 0, se = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = A.data[i + c] - B.data[i + c]; se += e * e; d = Math.max(d, Math.abs(e)); }
    if (d > max) max = d;
    if (d > 8) over++;
  }
  const total = A.data.length / 4, mse = se / (total * 3);
  return { over, max, total, psnr: mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse) };
}
function ff(args) {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.strictEqual(r.status, 0, 'ffmpeg ' + args.join(' ') + '\n' + r.stderr);
  return r;
}
function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames,r_frame_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  return { duration: Number(j.format.duration), frames: Number(j.streams[0].nb_read_frames), rate: j.streams[0].r_frame_rate };
}

test('vkit render: the MP4 is the run, the voice sits at the part offsets', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-render-'));
  const r = core.newVideo('proof', { cwd: tmp });
  const rig = path.join(r.dir, 'rig');
  const opts = { channel: process.env.PW_CHANNEL || undefined };
  const fps = 30;

  // clips: a beep at the top of each part, silence to the part's exact length
  const info = await render.info(rig, opts);
  const parts = info.parts, P = (i) => parts.slice(0, i).reduce((a, b) => a + b, 0);
  fs.mkdirSync(path.join(r.dir, 'voice'));
  parts.forEach((sec, i) => ff(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=0.3', '-af', 'apad=whole_dur=' + sec, '-ar', '48000', path.join(r.dir, 'voice', 'part-' + (i + 1) + '.wav')]));

  // the moments the seek test uses, as frame numbers
  const asked = [6.3, 11.3, 28.3, 45.3];
  const want = new Map(asked.map((t) => [Math.round(t * fps), t]));
  const tapped = new Map();
  const out = await core.renderVideo(r.dir, Object.assign({ fps, tap: (buf, n) => { if (want.has(n)) tapped.set(n, buf); } }, opts));

  // 1. length
  const total = P(parts.length);
  const p = probe(out.files.mp4);
  console.log(`mp4: ${p.frames} frames, ${p.duration} s, ${p.rate} fps, rendered in ${out.seconds_to_render} s`);
  assert.strictEqual(out.frames, Math.round(total * fps));
  assert.strictEqual(p.frames, Math.round(total * fps));
  assert.ok(Math.abs(p.duration - total) < 1 / fps, `duration ${p.duration} is not the sum of the parts ${total}`);
  assert.strictEqual(out.clips.length, parts.length);
  assert.strictEqual(out.captions, 12, 'one cue per storyboard sentence');

  // 2 and 3. the picture at each moment
  const sought = await render.frames(rig, asked, path.join(rig, '_seek'), opts);
  for (let i = 0; i < asked.length; i++) {
    const n = Math.round(asked[i] * fps);
    const fed = compare(tapped.get(n), sought[i]);
    console.log(`t=${asked[i]} frame ${n}: fed to ffmpeg vs seek: ${fed.over} of ${fed.total} pixels over 8 levels (max ${fed.max})`);
    assert.ok(fed.over / fed.total <= 0.0005, `the frame fed to ffmpeg at ${asked[i]} differs from the seek frame`);
    const png = path.join(rig, '_seek', 'mp4-' + n + '.png');
    ff(['-y', '-v', 'error', '-i', out.files.mp4, '-vf', 'select=eq(n\\,' + n + ')', '-fps_mode', 'passthrough', '-frames:v', '1', png]);
    const dec = compare(png, sought[i]);
    console.log(`t=${asked[i]} frame ${n}: decoded from the MP4 vs seek: ${dec.psnr.toFixed(2)} dB PSNR, ${dec.over} pixels over 8 levels (max ${dec.max})`);
    assert.ok(dec.psnr >= 40, `the MP4 frame at ${asked[i]} is ${dec.psnr.toFixed(2)} dB from the seek frame; 40 dB is the floor`);
  }

  // 4. the beeps: silence starts 0.3 s after each part offset
  const sd = spawnSync('ffmpeg', ['-v', 'info', '-i', out.files.mp4, '-vn', '-af', 'silencedetect=noise=-40dB:duration=0.5', '-f', 'null', '-'], { encoding: 'utf8' });
  const starts = [...sd.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  console.log('silence starts at ' + starts.map((s) => s.toFixed(3)).join(', ') + ' (beeps at ' + parts.map((_, i) => P(i)).join(', ') + ')');
  assert.strictEqual(starts.length, parts.length, 'one beep per part');
  parts.forEach((_, i) => assert.ok(Math.abs(starts[i] - (P(i) + 0.3)) < 0.06, `part ${i + 1}'s clip is at ${(starts[i] - 0.3).toFixed(3)}, not ${P(i)}`));
});
