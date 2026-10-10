// vkit time: the beats are placed where the words are said. timeVideo(dir) reads each part's
// sentences (narration/part-N.md) and the word times of its clip (voice/part-N.words.json,
// written by time/words.py from faster-whisper with word timestamps), aligns the written words
// to the heard words, and writes each sentence's start (seconds inside its part, as the storyboard
// defines Start) into storyboard.md and voice/times.json. The alignment tolerates a read that
// strays from the script (a dropped word, a number said as digits): it is the longest common run
// of normalised words, and a sentence whose words were not heard at all is placed between its
// neighbours and named in the report, never guessed silently. Nothing leaves the machine.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HELPER = path.join(__dirname, '..', 'time', 'words.py');
const CLIP_EXT = ['.m4a', '.wav', '.mp3', '.flac', '.ogg', '.aac'];

function norm(w) { return String(w).toLowerCase().replace(/[^a-z0-9']+/g, ''); }

// alignTokens(a, b): indices of the longest common subsequence of two token lists, as pairs [i, j].
function alignTokens(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return pairs;
}

// timePart(sentences, words): per sentence { start, end, heard, of } from the heard words of one clip
function timePart(sentences, words) {
  const script = []; sentences.forEach((s, si) => s.split(/\s+/).map(norm).filter(Boolean).forEach((t) => script.push({ t, si })));
  const heard = words.map((w) => norm(w.w));
  const pairs = alignTokens(script.map((x) => x.t), heard);
  const out = sentences.map((s, si) => ({ sentence: s, start: null, end: null, heard: 0, of: script.filter((x) => x.si === si).length }));
  for (const [i, j] of pairs) {
    const o = out[script[i].si];
    if (o.start === null || words[j].s < o.start) o.start = words[j].s;
    if (o.end === null || words[j].e > o.end) o.end = words[j].e;
    o.heard++;
  }
  // a sentence with nothing heard sits between its neighbours (or at the clip's edges), and says so
  for (let k = 0; k < out.length; k++) {
    if (out[k].start !== null) continue;
    const prev = out.slice(0, k).reverse().find((o) => o.end !== null), next = out.slice(k + 1).find((o) => o.start !== null);
    const a = prev ? prev.end : 0, b = next ? next.start : (words.length ? words[words.length - 1].e : 0);
    out[k].start = Math.round((a + (b - a) / 2) * 100) / 100; out[k].end = out[k].start; out[k].placed = 'between neighbours, no word of it was heard';
  }
  const extra = heard.length - pairs.length;
  return { rows: out, heardWords: heard.length, scriptWords: script.length, matched: pairs.length, extraHeard: extra };
}

function readSentences(dir, n) {
  const f = path.join(dir, 'narration', 'part-' + n + '.md');
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function wordsFor(dir, n, opts) {
  const voice = path.join(dir, 'voice');
  const clip = CLIP_EXT.map((e) => path.join(voice, 'part-' + n + e)).find((f) => fs.existsSync(f));
  if (!clip) return { error: 'no voice/part-' + n + ' clip' };
  const json = path.join(voice, 'part-' + n + '.words.json');
  if (!fs.existsSync(json) || opts.redo) {
    const args = [HELPER, clip, json];
    if (opts.prompt) args.push('--prompt', opts.prompt);
    if (opts.model) args.push('--model', opts.model);
    const r = spawnSync(opts.python || 'python3', args, { encoding: 'utf8' });
    if (r.status !== 0) return { error: 'word times for part ' + n + ' failed: ' + ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-3).join(' ') };
  }
  return { clip, words: JSON.parse(fs.readFileSync(json, 'utf8')).words };
}

// writeStarts(dir, timed): the Start column of storyboard.md, row by row in order, per part
function writeStarts(dir, timed) {
  const f = path.join(dir, 'storyboard.md');
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const counters = {};
  let written = 0;
  const out = lines.map((line) => {
    if (!/^\|\s*\d+\s*\|/.test(line)) return line;
    const cells = line.split('|');
    const part = Number(cells[1].trim());
    const k = counters[part] = (counters[part] || 0) + 1;
    const t = timed[part - 1] && timed[part - 1].rows[k - 1];
    if (!t) return line;
    cells[3] = ' ' + t.start.toFixed(2) + ' ';
    written++;
    return cells.join('|');
  });
  fs.writeFileSync(f, out.join('\n'));
  return written;
}

function timeVideo(videoDir, opts) {
  opts = opts || {};
  const dir = path.resolve(videoDir || '.');
  if (!fs.existsSync(path.join(dir, 'video.json'))) throw new Error('no video.json in ' + dir);
  const timed = []; const report = [];
  for (let n = 1; ; n++) {
    const sentences = readSentences(dir, n);
    if (!sentences) break;
    const w = wordsFor(dir, n, opts);
    if (w.error) throw new Error(w.error);
    const t = timePart(sentences, w.words);
    timed.push(t);
    const misses = t.rows.filter((r) => r.placed).length;
    report.push('part ' + n + ': ' + sentences.length + ' sentences, ' + t.matched + ' of ' + t.scriptWords + ' written words heard' + (t.extraHeard ? ', ' + t.extraHeard + ' heard words not in the script' : '') + (misses ? ', ' + misses + ' sentence' + (misses === 1 ? '' : 's') + ' placed between neighbours' : '') + '; starts ' + t.rows.map((r) => r.start.toFixed(2)).join(', '));
  }
  if (!timed.length) throw new Error('no narration/part-1.md in ' + dir);
  const written = writeStarts(dir, timed);
  const times = { made_on: new Date().toISOString().slice(0, 10), parts: timed.map((t, i) => ({ part: i + 1, rows: t.rows.map((r) => ({ start: r.start, end: r.end, heard: r.heard, of: r.of, placed: r.placed || 'at the first heard word' })), heardWords: t.heardWords, matched: t.matched })) };
  fs.writeFileSync(path.join(dir, 'voice', 'times.json'), JSON.stringify(times, null, 1) + '\n');
  return { parts: timed.length, rows: written, report, times };
}

module.exports = { timeVideo, timePart, alignTokens };
