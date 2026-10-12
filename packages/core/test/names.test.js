// The docs name real things. The 10 October 2026 audit found that every drift in the docs was a
// name: a version, a command, a check row, an engine call, a file, a column. None of it was covered,
// because plugin.test.js only checks a backticked `vkit <cmd>`. This proof reads every doc and skill
// and holds each name it finds against its source:
//   1. versions: the kit README and START-HERE name the current engine and plugin; ENGINE.md's newest
//      version is the current one; the skill count in the README is the folder count
//   2. commands: every CLI command appears in the kit README; every backticked `vkit app|shoot <sub>`
//      in a doc or skill is a subcommand the table has
//   3. check rows: a backticked hyphenated id that is not a known non-row name is a row check.js has
//   4. engine calls: every call in ENGINE.md's table is a window global, every global is in the table,
//      every `VK.x` named is a key of the VK object
//   5. files: a backticked path under docs/, claude/, packages/, starter/, looks/, brands/ exists
//   6. the storyboard header is the same wherever it is printed
// No browser. Under a second.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const list = (dir, re) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => re.test(f)).map((f) => path.join(dir, f));
const SKILLS = fs.readdirSync(path.join(ROOT, 'packages/plugin/skills'));
const DOCS = ['README.md', 'CLAUDE.md', 'packages/plugin/README.md', ...list('docs', /\.md$/), ...list('docs/workspace', /\.md$/), ...SKILLS.map((s) => 'packages/plugin/skills/' + s + '/SKILL.md')];
const texts = Object.fromEntries(DOCS.map((d) => [d, read(d)]));
const rig = read('packages/core/engine/rig.js');
const ENGINE = rig.match(/version: '(\d+\.\d+\.\d+)'/)[1];
const PLUGIN = JSON.parse(read('packages/plugin/.claude-plugin/plugin.json'));
const cli = read('packages/cli/bin/vkit.js');
const table = {};
for (const m of cli.slice(cli.indexOf('const COMMANDS = {'), cli.indexOf('\n};', cli.indexOf('const COMMANDS = {'))).matchAll(/^\s+'([a-z-]+)':\s+\['([^']*)'/gm)) table[m[1]] = m[2];

test('versions and counts in the docs are the current ones', () => {
  for (const d of ['README.md', 'docs/workspace/START-HERE.md']) {
    for (const m of texts[d].matchAll(/engine \(?(\d+\.\d+\.\d+)\)?/gi)) assert.strictEqual(m[1], ENGINE, d + ' names engine ' + m[1] + '; the engine is ' + ENGINE);
    for (const m of texts[d].matchAll(/plugin \(?(\d+\.\d+\.\d+)\)?/gi)) assert.strictEqual(m[1], PLUGIN.version, d + ' names plugin ' + m[1] + '; the plugin is ' + PLUGIN.version);
  }
  const named = [...texts['docs/ENGINE.md'].matchAll(/[Ee]ngine (\d+\.\d+\.\d+)/g)].map((m) => m[1]);
  const newest = named.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
  assert.strictEqual(newest, ENGINE, 'ENGINE.md: the newest version it names is ' + newest + '; the engine is ' + ENGINE);
  const count = texts['README.md'].match(/(\d+) skills/);
  assert.ok(count && Number(count[1]) === SKILLS.length, 'README says ' + (count && count[0]) + '; the plugin has ' + SKILLS.length);
  for (const s of SKILLS) assert.ok(PLUGIN.description.includes(s), 'plugin.json description does not name ' + s);
});

test('every command is in the README and every subcommand a doc names exists', () => {
  for (const c of Object.keys(table)) assert.ok(texts['README.md'].includes('vkit ' + c), 'README.md does not name vkit ' + c);
  const subs = {};
  for (const c of ['app', 'shoot']) subs[c] = table[c].split('|').map((s) => s.trim().split(/\s/)[0]);
  for (const [d, md] of Object.entries(texts)) for (const m of md.matchAll(/`(?:PW_CHANNEL=chrome )?vkit (app|shoot) ([a-z-]+)/g)) {
    assert.ok(subs[m[1]].includes(m[2]), d + ' names vkit ' + m[1] + ' ' + m[2] + '; the subcommands are ' + subs[m[1]].join(', '));
  }
});

test('every check row a doc names is a row check.js has', () => {
  const check = read('packages/core/src/check.js');
  const rows = new Set([...check.matchAll(/row\('([a-z-]+)/g)].map((m) => m[1]));
  // names that are hyphenated and backticked but are not rows: skills, repos, attributes, ids on screens
  const cmds = Object.keys(table).concat(...['app', 'shoot'].map((c) => table[c].split('|').map((s) => s.trim().split(/\s/)[0])));
  const notRows = new Set([...SKILLS, ...cmds, 'create-s3-bucket', 'video-kit', 'video-reference', 'video-apps-aws', 'vkit-local', 'work-item', 'aria-label', 'data-testid', 'data-narration', 'data-scrolls', 'data-chrome', 'data-decor', 'create-name-taken', 'brief-request', 'capture-request', 'fact-check', 'part-N', 'rig-engine', 'faster-whisper', 'large-v3-turbo', 'no-cache', 'user-data-dir', 'training-demo-bucket', 'training-demo-bucket-01', 'crumb-buckets', 'crumb-amazon-s3', 'btn-create', 'btn-create-form', 'tab-objects', 'row-name', 'app-model', 'model-json', 'btn-upload', 'bpa-all', 'objects-card', 'name-error', 'bucket-name', 'press-dim', 'stroke-rough', 'size-note', 'note-line', 'note-line-width', 'look-panel-kick', 'panel-kick', 'test-concurrency', 'output-dir', 'allow-hits', 'break-system-packages', 'to-delete']);
  // the plan and the decisions name things to come by definition: the roadmap from "Next, in order" to the end of the parking lot, and decisions.md
  const planned = (d, md) => { if (d === 'docs/workspace/decisions.md') return ''; if (d !== 'docs/ROADMAP.md') return md; const a = md.indexOf('## Next, in order'), b = md.indexOf('## History'); return a < 0 ? md : md.slice(0, a) + (b < 0 ? '' : md.slice(b)); };
  const miss = [];
  for (const [d, md0] of Object.entries(texts)) for (const m of planned(d, md0).matchAll(/`([a-z]+(?:-[a-z0-9]+)+)`/g)) {
    const id = m[1];
    if (rows.has(id) || notRows.has(id) || /^(--|C-|video-apps-)/.test(id)) continue;
    miss.push(d + ': `' + id + '`');
  }
  assert.deepStrictEqual(miss, [], 'backticked names that are neither a check row nor a known non-row name (add a row, fix the name, or list it in names.test.js):\n' + miss.join('\n'));
});

test('ENGINE.md names the engine as it is', () => {
  const md = texts['docs/ENGINE.md'];
  const globals = new Set([...rig.matchAll(/window\.([a-zA-Z]+) = /g)].map((m) => m[1]).filter((g) => g !== 'VK'));
  const vk = new Set([...rig.slice(rig.indexOf('window.VK = {')).matchAll(/\b([a-zA-Z]+): /g)].map((m) => m[1]));
  const inTable = new Set();
  for (const m of md.matchAll(/^\| `([a-zA-Z]+)\(/gm)) { inTable.add(m[1]); assert.ok(globals.has(m[1]), 'ENGINE.md table names ' + m[1] + '(), not a global of the engine'); }
  for (const g of globals) assert.ok(inTable.has(g) || md.includes('`' + g + '('), 'the engine has window.' + g + ' and ENGINE.md does not name it');
  for (const m of md.matchAll(/VK\.([a-zA-Z]+)/g)) assert.ok(vk.has(m[1]), 'ENGINE.md names VK.' + m[1] + ', not a key of VK');
  const calls = [...md.matchAll(/^\| `([a-zA-Z]+)\(/gm)].map((m) => m[1]);
  const twice = calls.filter((c, i) => calls.indexOf(c) !== i);
  assert.deepStrictEqual(twice, [], 'ENGINE.md\'s table has a call twice: ' + twice.join(', '));
});

test('every path a doc names exists', () => {
  const miss = [];
  for (const [d, md] of Object.entries(texts)) for (const m of md.matchAll(/`((?:docs|claude|packages|starter|looks|brands|patterns)\/[^`<>* ]*)`/g)) {
    let p = m[1].replace(/^claude\//, 'docs/workspace/').replace(/\/$/, '');
    if (/<|\.\.\./.test(m[1])) continue;
    if (!fs.existsSync(path.join(ROOT, p))) miss.push(d + ': `' + m[1] + '`');
  }
  assert.deepStrictEqual(miss, [], 'paths named that do not exist:\n' + miss.join('\n'));
});

test('the storyboard header is one header everywhere', () => {
  const head = texts['docs/workspace/README.md'] && fs.readFileSync(path.join(ROOT, 'starter/storyboard.md'), 'utf8').split('\n').find((l) => /^\| Part \| Sentence/.test(l));
  assert.ok(head, 'starter/storyboard.md has the header');
  const brief = read('packages/core/src/brief.js');
  assert.ok(brief.includes(head), 'brief.js prints the starter\'s header');
  for (const [d, md] of Object.entries(texts)) for (const l of md.split('\n')) if (/^\| Part \| Sentence \|/.test(l) && !/Verdict/.test(l)) assert.strictEqual(l.trim(), head.trim(), d + ' prints a different storyboard header');
  console.log('names: engine ' + ENGINE + ', plugin ' + PLUGIN.version + ', ' + SKILLS.length + ' skills, ' + Object.keys(table).length + ' commands, ' + DOCS.length + ' docs read');
});
