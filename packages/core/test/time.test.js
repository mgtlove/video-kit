// Proof for vkit time (step 10c): the beats are placed where the words are said.
//   1. timePart aligns written sentences to heard words: a dropped word, a number read as digits
//      and an extra word do not move a sentence off its first heard word; a sentence nobody said
//      is placed between its neighbours and says so
//   2. timeVideo on a starter video with prepared voice/part-N.words.json (no Whisper in the test)
//      writes every row's Start into storyboard.md and voice/times.json; the command line does the same
// No browser. Under a second.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const { timePart } = require('../src/time');
const VKIT = path.join(__dirname, '..', '..', 'cli', 'bin', 'vkit.js');

const W = (text, t0, step) => text.split(' ').map((w, i) => ({ w, s: t0 + i * step, e: t0 + i * step + step * 0.8, p: 0.9 }));

test('a sentence starts at its first heard word, whatever the reader dropped or changed', () => {
  const sentences = ['Before you can put anything in S3, you need a bucket.', 'Lowercase letters, three to sixty-three characters.', 'Nobody said this one.', 'Head back to Buckets and it is in the list.'];
  // heard: "S3" dropped, the number said as digits, "um" added, the third sentence missing entirely
  const heard = W('Before you can put anything in you need a bucket Lowercase letters 3 to 63 characters um Head back to Buckets and it is in the list', 1.0, 0.5);
  const r = timePart(sentences, heard);
  assert.strictEqual(r.rows[0].start, 1.0, 'first sentence at "Before"');
  assert.strictEqual(r.rows[1].start, heard[10].s, 'second sentence at "Lowercase": ' + JSON.stringify(r.rows[1]));
  assert.ok(r.rows[1].heard >= 3 && r.rows[1].heard < r.rows[1].of, 'digits for words count as unheard, the rest is heard');
  assert.ok(r.rows[2].placed && r.rows[2].start > r.rows[1].end && r.rows[2].start < r.rows[3].start, 'the unsaid sentence sits between its neighbours and says so: ' + JSON.stringify(r.rows[2]));
  assert.strictEqual(r.rows[3].start, heard[17].s, 'fourth sentence at "Head"');
  assert.strictEqual(r.extraHeard, heard.length - r.matched);
  console.log('time: starts ' + r.rows.map((x) => x.start).join(', ') + '; ' + r.matched + ' of ' + r.scriptWords + ' heard, ' + r.extraHeard + ' extra');
});

test('vkit time writes every row\'s start from the word files into storyboard.md and times.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-time-'));
  const v = core.newVideo('timed', { cwd: tmp });
  const parts = [1, 2, 3].map((n) => fs.readFileSync(path.join(v.dir, 'narration', 'part-' + n + '.md'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
  fs.mkdirSync(path.join(v.dir, 'voice'), { recursive: true });
  parts.forEach((sentences, i) => {
    fs.writeFileSync(path.join(v.dir, 'voice', 'part-' + (i + 1) + '.m4a'), 'not audio; the words file stands in for the clip');
    const words = []; let t = 0.5;
    for (const s of sentences) { for (const w of s.split(' ')) { words.push({ w, s: t, e: t + 0.3, p: 0.9 }); t += 0.4; } t += 1.2; }
    fs.writeFileSync(path.join(v.dir, 'voice', 'part-' + (i + 1) + '.words.json'), JSON.stringify({ clip: 'part-' + (i + 1) + '.m4a', words }));
  });
  const r = core.timeVideo(v.dir);
  const rows = parts.reduce((a, p) => a + p.length, 0);
  assert.strictEqual(r.rows, rows, 'every storyboard row got a start');
  const sb = fs.readFileSync(path.join(v.dir, 'storyboard.md'), 'utf8').split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l));
  assert.strictEqual(sb.length, rows);
  assert.ok(sb.every((l) => /^\|\s*\d+\s*\|[^|]*\|\s*\d+\.\d\d\s*\|/.test(l)), 'Start is a number to two decimals in every row: ' + sb[0]);
  assert.strictEqual(sb[0].split('|')[3].trim(), '0.50', 'the first sentence starts at its first word');
  const times = JSON.parse(fs.readFileSync(path.join(v.dir, 'voice', 'times.json'), 'utf8'));
  assert.strictEqual(times.parts.length, 3);
  assert.ok(times.parts.every((p) => p.rows.every((x) => x.placed === 'at the first heard word')));
  // the command line, in the folder
  fs.writeFileSync(path.join(v.dir, 'storyboard.md'), fs.readFileSync(path.join(v.dir, 'storyboard.md'), 'utf8').replace(/\| 0\.50 \|/, '|  |'));
  const c = spawnSync(process.execPath, [VKIT, 'time'], { cwd: v.dir, encoding: 'utf8' });
  assert.strictEqual(c.status, 0, c.stdout + c.stderr);
  assert.ok(/wrote Start for \d+ rows/.test(c.stdout) && /part 1: \d+ sentences/.test(c.stdout), c.stdout);
  console.log('time: ' + c.stdout.trim().split('\n')[0]);
});
