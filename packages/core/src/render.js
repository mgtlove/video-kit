// renderVideo(videoDir, opts): every frame of the run at opts.fps (30) from the
// seek, streamed into ffmpeg; the voice clips muxed at their part offsets; a
// captions sidecar from the storyboard. Writes out/<name>.mp4, .vtt, .srt and
// render.json, and records the render in video.json.
//
// The clips are the clock: the MP4 is exactly the sum of the parts long. A
// beat placed after the last clip (the starter's closing fade) is not footage.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const render = require('./adapters/render');

const CLIP_EXT = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg'];

function ffmpegPath(opts) { return (opts && opts.ffmpeg) || process.env.FFMPEG || 'ffmpeg'; }

// haveFfmpeg(opts) -> version line, or throws with what to do
function haveFfmpeg(opts) {
  const r = spawnSync(ffmpegPath(opts), ['-version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error('ffmpeg is not installed or not on PATH. On a Mac: brew install ffmpeg. Nothing was rendered.');
  return r.stdout.split('\n')[0];
}

// clips(videoDir, parts) -> [{ part, file, offset }] for the parts that have a
// clip in voice/, and the list of parts that have none.
function findClips(videoDir, parts) {
  const dir = path.join(videoDir, 'voice');
  const found = [], missing = [];
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    const file = fs.existsSync(dir) ? CLIP_EXT.map((e) => path.join(dir, 'part-' + (i + 1) + e)).find((f) => fs.existsSync(f)) : null;
    if (file) found.push({ part: i + 1, file, offset: +offset.toFixed(3) }); else missing.push(i + 1);
    offset += parts[i];
  }
  return { found, missing };
}

// storyboardCues(videoDir, parts) -> [{ start, end, text, part }] from the
// rows of storyboard.md: Part | Sentence | Start (s) | ... Start is seconds
// into the part. A cue ends where the next sentence in its part starts, or at
// the part's end.
// storyboardRows(videoDir, parts, opts): the rows of storyboard.md. By default only rows in a part the
// rig has (parts.length); opts.all keeps every row, for checks that read the expert's storyboard
// before the parts exist (a row in part 4 of a three-part rig was dropped unseen, 8 October 2026).
function storyboardRows(videoDir, parts, opts) {
  const all = opts && opts.all;
  const file = path.join(videoDir, 'storyboard.md');
  if (!fs.existsSync(file)) return [];
  const rows = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
    const part = Number(cells[0]), start = Number(cells[2]);
    if (!Number.isInteger(part) || part < 1 || (!all && part > parts.length) || !cells[1] || isNaN(start)) continue;
    rows.push({ part, text: cells[1], start, on: cells[3] || '' });
  }
  return rows;
}
function storyboardCues(videoDir, parts) {
  const rows = storyboardRows(videoDir, parts);
  const P = (i) => parts.slice(0, i).reduce((a, b) => a + b, 0);
  const cues = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], next = rows[i + 1];
    const partEnd = P(r.part);
    const start = +(P(r.part - 1) + r.start).toFixed(3);
    const end = +(next && next.part === r.part ? P(r.part - 1) + next.start : partEnd).toFixed(3);
    if (end > start) cues.push({ start, end, text: r.text, part: r.part });
  }
  return cues;
}

function stamp(sec, sep) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = Math.floor(sec) % 60, ms = Math.round((sec - Math.floor(sec)) * 1000);
  const p = (n, w) => String(n).padStart(w, '0');
  return p(h, 2) + ':' + p(m, 2) + ':' + p(s, 2) + sep + p(ms, 3);
}
function vtt(cues) { return 'WEBVTT\n\n' + cues.map((c, i) => (i + 1) + '\n' + stamp(c.start, '.') + ' --> ' + stamp(c.end, '.') + '\n' + c.text + '\n').join('\n'); }
function srt(cues) { return cues.map((c, i) => (i + 1) + '\n' + stamp(c.start, ',') + ' --> ' + stamp(c.end, ',') + '\n' + c.text + '\n').join('\n'); }

// ffmpegArgs: PNG frames on stdin, the clips delayed to their offsets and
// mixed without normalising, or a silent track when there are none; the
// output pinned to the total so the MP4 is exactly the sum of the parts.
function ffmpegArgs(fps, total, clips, outFile) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  let map;
  if (clips.length) {
    for (const c of clips) args.push('-i', c.file);
    const delayed = clips.map((c, i) => '[' + (i + 1) + ':a]aresample=48000,aformat=channel_layouts=stereo,adelay=' + Math.round(c.offset * 1000) + ':all=1[a' + i + ']').join(';');
    const mix = clips.map((_, i) => '[a' + i + ']').join('') + 'amix=inputs=' + clips.length + ':normalize=0:dropout_transition=0[voice]';
    args.push('-filter_complex', delayed + ';' + mix);
    map = '[voice]';
  } else {
    args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
    map = '1:a';
  }
  args.push('-map', '0:v', '-map', map,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', String(total), '-movflags', '+faststart', outFile);
  return args;
}

async function renderVideo(videoDir, opts) {
  opts = opts || {};
  const dir = path.resolve(videoDir);
  const fps = opts.fps || 30;
  const videoJson = path.join(dir, 'video.json');
  if (!fs.existsSync(videoJson)) throw new Error(dir + ' is not a video folder (no video.json)');
  const meta = JSON.parse(fs.readFileSync(videoJson, 'utf8'));
  const ffmpegVersion = haveFfmpeg(opts);
  const rigDir = path.join(dir, 'rig');
  const info = await render.info(rigDir, opts);
  const total = +info.total.toFixed(3);
  const outDir = opts.outDir || path.join(dir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const name = meta.name || path.basename(dir);
  const mp4 = path.join(outDir, name + '.mp4');
  const { found: clips, missing } = findClips(dir, info.parts);
  const cues = storyboardCues(dir, info.parts);

  const started = Date.now();
  const args = ffmpegArgs(fps, total, clips, mp4);
  const ff = spawn(ffmpegPath(opts), args, { stdio: ['pipe', 'inherit', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', (d) => { ffErr += d; });
  const ffDone = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg failed (' + code + '): ' + ffErr.trim())));
  });
  let frames = 0;
  const stats = {};
  const write = (buf) => new Promise((resolve, reject) => {
    if (!ff.stdin.writable) return reject(new Error('ffmpeg closed its input: ' + ffErr.trim()));
    const ok = ff.stdin.write(buf, (e) => e ? reject(e) : null);
    if (ok) resolve(); else ff.stdin.once('drain', resolve);
  });
  try {
    frames = await render.every(rigDir, fps, async (buf, n, t) => {
      await write(buf);
      if (opts.onFrame) opts.onFrame(n, t);          /* progress */
      if (opts.tap) await opts.tap(buf, n, t);       /* the frame as ffmpeg received it; the proof reads these */
    }, Object.assign({ stats }, require('./progress').phase(opts, 'render')));
    ff.stdin.end();
  } catch (e) { ff.stdin.destroy(); ff.kill('SIGKILL'); throw e; }
  await ffDone;
  const seconds = +((Date.now() - started) / 1000).toFixed(1);

  const files = { mp4 };
  if (cues.length) {
    files.vtt = path.join(outDir, name + '.vtt'); fs.writeFileSync(files.vtt, vtt(cues));
    files.srt = path.join(outDir, name + '.srt'); fs.writeFileSync(files.srt, srt(cues));
  }
  const report = {
    name, rendered_on: new Date().toISOString(), machine: os.hostname() + ' ' + os.platform() + ' ' + os.arch(),
    engine: info.version, browser: render.name + (opts.channel ? ' (' + opts.channel + ')' : ''), ffmpeg: ffmpegVersion,
    fps, frames, total_seconds: total, parts: info.parts, beats: info.beats,
    clips: clips.map((c) => ({ part: c.part, file: path.relative(dir, c.file), offset: c.offset })), parts_without_a_clip: missing,
    captions: cues.length, seconds_to_render: seconds, compositor_waits: stats.waits || 0, ffmpeg_args: args.map((a) => a === mp4 ? path.relative(dir, mp4) : a)
  };
  files.report = path.join(outDir, 'render.json');
  fs.writeFileSync(files.report, JSON.stringify(report, null, 2) + '\n');
  meta.render = Object.assign(meta.render || {}, { fps, rendered_on: report.rendered_on.slice(0, 10), machine: report.machine });
  fs.writeFileSync(videoJson, JSON.stringify(meta, null, 2) + '\n');
  return Object.assign({ files }, report);
}

module.exports = { renderVideo, haveFfmpeg, findClips, storyboardRows, storyboardCues, ffmpegArgs, vtt, srt };
