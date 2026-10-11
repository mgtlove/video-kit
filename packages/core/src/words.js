// The words and the clock.
//
// narration(videoDir): reads narration/part-N.md (one sentence per line), holds
// each part to its limits (about 1000 characters, so a clip is cheap to make
// again; no sentence over 30 words, rules.json pacing), writes narration/FULL.md
// (every part in order, for a voice session or a reviewer), and estimates each
// part's length at the target rate so a PARTS line exists before any clip does.
// It also writes the final sentences into storyboard.md's Sentence column, one row per
// sentence, and logs every row whose words changed from the expert's in
// narration/changes.md (part, row, the expert's words as first seen, the director's words,
// the date): the director keeps the final call on the words and nothing moves silently.
// The fact check judges drift against that log; vkit handoffs counts it.
//
// measure(videoDir): the clips are the clock. ffprobe reads voice/part-N.* to
// the millisecond; the lengths go into rig/index.html's PARTS line to two
// decimals, exactly, never padded or stretched, and into video.json.parts with
// the date. From then on the menu items that would re-time the video are locked.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadRules } = require('./sync');

const CLIP_EXT = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg'];
const PART_CHARS = 1000;

function words(s) { return (s.match(/[A-Za-z0-9'’]+/g) || []).length; }
function partFiles(dir) {
  const nd = path.join(dir, 'narration');
  if (!fs.existsSync(nd)) return [];
  return fs.readdirSync(nd).filter((f) => /^part-\d+\.md$/.test(f)).sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10)).map((f) => path.join(nd, f));
}
function sentencesOf(file) { return fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')); }

function narration(videoDir, opts) {
  opts = opts || {};
  const dir = path.resolve(videoDir);
  const rules = loadRules();
  const wpm = opts.wpm || 150;
  const files = partFiles(dir);
  if (!files.length) throw new Error('no narration/part-N.md in ' + dir);
  const parts = files.map((f, i) => {
    const sentences = sentencesOf(f);
    const text = sentences.join(' ');
    const w = sentences.reduce((a, s) => a + words(s), 0);
    const problems = [];
    if (text.length > PART_CHARS) problems.push('part is ' + text.length + ' characters; about ' + PART_CHARS + ' is the ceiling so a clip is cheap to make again');
    sentences.forEach((s, k) => { if (words(s) > rules.pacing.maxWordsPerSentence) problems.push('sentence ' + (k + 1) + ' has ' + words(s) + ' words; ' + rules.pacing.maxWordsPerSentence + ' is the ceiling'); });
    return { part: i + 1, file: path.relative(dir, f), sentences: sentences.length, words: w, characters: text.length, estimateSeconds: +(w / wpm * 60).toFixed(1), problems };
  });
  const full = ['# ' + path.basename(dir) + ': the narration, every part in order', '', 'One sentence per line; one line is one beat. Written by vkit narration from narration/part-N.md; edit the parts, not this file.', ''];
  files.forEach((f, i) => { full.push('## Part ' + (i + 1) + ' (' + parts[i].words + ' words, about ' + parts[i].estimateSeconds + ' s at ' + wpm + ' wpm)', '', ...sentencesOf(f), ''); });
  const fullFile = path.join(dir, 'narration', 'FULL.md');
  fs.writeFileSync(fullFile, full.join('\n'));
  const sync = syncStoryboard(dir, files.map(sentencesOf));
  const total = parts.reduce((a, p) => a + p.estimateSeconds, 0);
  return { parts, wpm, estimate: parts.map((p) => p.estimateSeconds), total: +total.toFixed(1), full: fullFile, storyboard: sync, problems: parts.reduce((a, p) => a + p.problems.length, 0), partsLine: 'var PARTS = [' + parts.map((p) => p.estimateSeconds).join(', ') + '];   /* ESTIMATES at ' + wpm + ' wpm until the clips are measured */' };
}

// syncStoryboard(dir, partSentences): the storyboard's Sentence column follows the narration, row
// by row inside each part, and the rows whose words changed are logged with the words they had.
// A part whose row count is not its sentence count is left alone and named (sentences-match says
// the same in vkit check). Only the Sentence cell is rewritten; Start, Action and the rest stay.
const CHANGES_HEAD = ['# The words, as the expert wrote them and as the narration says them', '', 'Written by vkit narration. One row per storyboard row whose sentence differs from the expert\'s; the expert\'s words are kept as first seen, the director\'s are the latest. A row put back to the expert\'s words leaves the table. The fact check judges drift against this file.', '', '| Part | Row | Expert\'s words | Director\'s words | Changed on |', '|---|---|---|---|---|'];
function readChanges(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!/^\|\s*\d+\s*\|\s*\d+\s*\|/.test(line)) continue;
    const c = line.split('|').map((x) => x.trim());
    out[c[1] + ':' + c[2]] = { part: +c[1], row: +c[2], expert: c[3], director: c[4], on: c[5] };
  }
  return out;
}
function syncStoryboard(dir, partSentences) {
  const sb = path.join(dir, 'storyboard.md');
  const result = { rows: 0, written: 0, changed: [], mismatched: [], file: null };
  if (!fs.existsSync(sb)) return result;
  const lines = fs.readFileSync(sb, 'utf8').split('\n');
  const byPart = {};
  lines.forEach((l, i) => { const m = l.match(/^\|\s*(\d+)\s*\|/); if (m) (byPart[+m[1]] = byPart[+m[1]] || []).push(i); });
  const changesFile = path.join(dir, 'narration', 'changes.md');
  const log = readChanges(changesFile);
  const today = new Date().toISOString().slice(0, 10);
  partSentences.forEach((sentences, pi) => {
    const part = pi + 1, idx = byPart[part] || [];
    result.rows += idx.length;
    if (!idx.length) return;
    if (idx.length !== sentences.length) { result.mismatched.push('part ' + part + ': ' + idx.length + ' rows, ' + sentences.length + ' sentences'); return; }
    idx.forEach((li, k) => {
      const cells = lines[li].split('|');
      const had = cells[2].trim(), want = sentences[k], key = part + ':' + (k + 1);
      if (had !== want) {
        const expert = log[key] ? log[key].expert : had;
        if (expert === want) delete log[key]; else log[key] = { part, row: k + 1, expert, director: want, on: today };
        cells[2] = ' ' + want + ' ';
        lines[li] = cells.join('|');
        result.written++;
      }
    });
  });
  if (result.written) fs.writeFileSync(sb, lines.join('\n'));
  const entries = Object.values(log).sort((a, b) => a.part - b.part || a.row - b.row);
  result.changed = entries.map((e) => 'part ' + e.part + ' row ' + e.row);
  if (entries.length || fs.existsSync(changesFile)) {
    fs.writeFileSync(changesFile, CHANGES_HEAD.concat(entries.map((e) => '| ' + e.part + ' | ' + e.row + ' | ' + e.expert + ' | ' + e.director + ' | ' + e.on + ' |'), entries.length ? '' : 'Every row says what the expert wrote.', '').join('\n'));
    result.file = changesFile;
  }
  return result;
}

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error('ffprobe could not read ' + file + (r.stderr ? ': ' + r.stderr.trim() : '') + '. On a Mac: brew install ffmpeg.');
  const d = parseFloat(r.stdout); if (isNaN(d)) throw new Error('ffprobe gave no duration for ' + file);
  return d;
}

function measure(videoDir) {
  const dir = path.resolve(videoDir);
  const vj = path.join(dir, 'video.json');
  if (!fs.existsSync(vj)) throw new Error(dir + ' is not a video folder (no video.json)');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
  const html = path.join(dir, 'rig', 'index.html');
  const page = fs.readFileSync(html, 'utf8');
  const m = /var PARTS = \[([^\]]*)\];[^\n]*/.exec(page);
  if (!m) throw new Error('rig/index.html has no "var PARTS = [...]" line');
  const count = m[1].split(',').filter((x) => x.trim()).length;
  const voice = path.join(dir, 'voice');
  if (!fs.existsSync(voice)) throw new Error('no voice/ folder in ' + dir + '. Clips go in voice/part-N.m4a, .wav, .mp3, .aac, .flac or .ogg, one per part.');
  const clips = [], missing = [];
  for (let i = 1; i <= count; i++) {
    const f = CLIP_EXT.map((e) => path.join(voice, 'part-' + i + e)).find((x) => fs.existsSync(x));
    if (f) clips.push({ part: i, file: path.relative(dir, f), seconds: Math.round(probe(f) * 100) / 100 }); else missing.push(i);
  }
  if (missing.length) throw new Error('no clip for part ' + missing.join(', ') + ' (PARTS has ' + count + ' entries). Nothing written.');
  const extra = fs.readdirSync(voice).filter((f) => /^part-\d+\./.test(f)).map((f) => parseInt(f.slice(5), 10)).filter((n) => n > count);
  const line = 'var PARTS = [' + clips.map((c) => c.seconds.toFixed(2)).join(', ') + '];   /* measured by vkit measure on ' + new Date().toISOString().slice(0, 10) + ' from voice/; the clips are the clock */';
  fs.writeFileSync(html, page.replace(m[0], line));
  meta.parts = Object.assign(meta.parts || {}, { part_seconds: clips.map((c) => c.seconds), measured_on: new Date().toISOString().slice(0, 10), clips: clips.map((c) => c.file) });
  meta.menu = meta.menu || {};
  for (const item of ['look', 'tone', 'patterns', 'voice']) if (meta.menu[item]) meta.menu[item].locked = 'measured ' + meta.parts.measured_on + ': this item would re-time the video';
  fs.writeFileSync(vj, JSON.stringify(meta, null, 2) + '\n');
  return { clips, total: +clips.reduce((a, c) => a + c.seconds, 0).toFixed(2), line, extra, locked: ['look', 'tone', 'patterns', 'voice'].filter((i) => meta.menu[i]) };
}

module.exports = { narration, measure, words, readChanges, PART_CHARS };
