// Proof for the commands of the hardening pass (10 October 2026): vkit upgrade, vkit plugin pack, and
// vkit with no command (the front door).
//   1. a video made by vkit new is on the kit's engine already: upgrade writes nothing and says so
//   2. a video on an older copy (VERSION and video.json say 0.0.1, rig.js edited): upgrade puts the
//      kit's two files in place byte for byte, writes VERSION and video.json.engine, keeps the old copy
//      in _suggested-trash/ and names it; the command line prints the same
//   3. plugin pack writes a zip of packages/plugin/ with every skill and no node_modules, and the same
//      files twice give the same bytes
//   4. vkit with no command says what this is, what is waiting here (a video folder, a folder of them,
//      or neither) and the three ways in, in plain words; vkit help is the command table
// No browser. About a second.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const { readZip } = require('../src/zip');

const KIT = path.join(__dirname, '..', '..', '..');
const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');

test('vkit upgrade brings a video to the kit engine and keeps the old copy', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-upgrade-'));
  const v = core.newVideo('up', { cwd: tmp });
  const r0 = core.upgradeEngine(v.dir);
  assert.ok(r0.current && r0.from === v.engine && r0.to === v.engine, 'a new video is current: ' + JSON.stringify(r0));
  assert.ok(!fs.existsSync(path.join(v.dir, '_suggested-trash')), 'nothing kept aside when nothing changed');
  // an older copy, edited
  const eng = path.join(v.dir, 'rig', 'engine');
  fs.writeFileSync(path.join(eng, 'VERSION'), '0.0.1\n');
  fs.appendFileSync(path.join(eng, 'rig.js'), '\n/* edited inside the video */\n');
  const vj = path.join(v.dir, 'video.json');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8')); meta.engine = '0.0.1'; fs.writeFileSync(vj, JSON.stringify(meta, null, 2) + '\n');
  const r = core.upgradeEngine(v.dir);
  assert.strictEqual(r.from, '0.0.1'); assert.strictEqual(r.to, v.engine); assert.deepStrictEqual(r.changed, ['rig.js']);
  for (const f of ['rig.js', 'rig.css']) assert.ok(fs.readFileSync(path.join(eng, f)).equals(fs.readFileSync(path.join(KIT, 'packages', 'core', 'engine', f))), f + ' is the kit\'s byte for byte');
  assert.strictEqual(fs.readFileSync(path.join(eng, 'VERSION'), 'utf8').trim(), v.engine);
  assert.strictEqual(JSON.parse(fs.readFileSync(vj, 'utf8')).engine, v.engine);
  assert.ok(r.kept && fs.existsSync(path.join(r.kept, 'rig.js')) && /edited inside the video/.test(fs.readFileSync(path.join(r.kept, 'rig.js'), 'utf8')), 'the old copy is kept: ' + r.kept);
  assert.ok(r.kept.startsWith(path.join(v.dir, '_suggested-trash')), 'kept under the video\'s _suggested-trash/');
  const text = core.formatUpgrade(r);
  assert.ok(/0\.0\.1 to /.test(text) && /not deleted/.test(text), text);
  // the same edit at the same version is named
  fs.appendFileSync(path.join(eng, 'rig.css'), '\n/* edited */\n');
  const r2 = core.upgradeEngine(v.dir);
  assert.deepStrictEqual(r2.edited, ['rig.css'], 'an edited copy at the current version is named: ' + JSON.stringify(r2));
  assert.ok(/never edited inside a video/.test(core.formatUpgrade(r2)));
  // the command line
  const p = spawnSync('node', [VKIT, 'upgrade', v.dir], { encoding: 'utf8' });
  assert.strictEqual(p.status, 0, p.stderr);
  assert.ok(/is on engine .* already/.test(p.stdout), p.stdout);
  console.log('upgrade: ' + text.split('\n')[0]);
});

test('vkit plugin pack writes the upload zip, the same bytes twice', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-pack-'));
  const out = path.join(tmp, 'vkit-plugin.zip');
  const r = core.packPlugin({ out });
  assert.strictEqual(r.file, out);
  const skills = fs.readdirSync(path.join(KIT, 'packages', 'plugin', 'skills'));
  for (const s of skills) assert.ok(r.entries.includes('plugin/skills/' + s + '/SKILL.md'), 'the zip holds ' + s);
  assert.ok(r.entries.includes('plugin/.claude-plugin/plugin.json') && r.entries.includes('plugin/hooks/hooks.json'), 'the zip holds plugin.json and the hook');
  assert.ok(!r.entries.some((e) => /node_modules|\.DS_Store|__pycache__/.test(e)), 'no node_modules, .DS_Store or __pycache__');
  const z = readZip(fs.readFileSync(out));
  assert.strictEqual(z.names.length, r.entries.length);
  assert.strictEqual(JSON.parse(z.read('plugin/.claude-plugin/plugin.json').toString('utf8')).version, r.version);
  const a = fs.readFileSync(out);
  core.packPlugin({ out });
  assert.ok(a.equals(fs.readFileSync(out)), 'two packs of the same files are the same bytes');
  const p = spawnSync('node', [VKIT, 'plugin', 'pack', '--out', path.join(tmp, 'cli.zip')], { encoding: 'utf8' });
  assert.strictEqual(p.status, 0, p.stderr);
  assert.ok(/plugin \d+\.\d+\.\d+, \d+ files/.test(p.stdout) && /Upload it/.test(p.stdout), p.stdout);
  console.log('pack: ' + r.entries.length + ' files, ' + r.bytes + ' bytes, plugin ' + r.version);
});

test('vkit with no command is the front door', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-front-'));
  process.env.VKIT_APPS = path.join(tmp, 'apps'); fs.mkdirSync(process.env.VKIT_APPS);
  const run = (cwd) => spawnSync('node', [VKIT], { cwd, encoding: 'utf8', env: process.env });
  let r = run(tmp);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(/^vkit\n  Training and explainer videos from screenshots and a script\./.test(r.stdout) && /Where you are:\n  .*not a video folder/.test(r.stdout) && /What is waiting elsewhere:\n  (nothing|1\. app )/.test(r.stdout) && /Three ways in:\n  1\. I have an idea/.test(r.stdout) && /Who does what:\n  producer/.test(r.stdout) && /More:\n  vkit help/.test(r.stdout), r.stdout);
  const v = core.newVideo('door', { cwd: tmp });
  r = run(v.dir);
  assert.ok(/Where you are:\n  .*, the video "door"\n  engine \d+\.\d+\.\d+, no recreated app\n\nWhat is waiting:\n  1\. door\n     whose turn: the subject expert, with the video-brief skill\n     what: no brief\.md yet/.test(r.stdout), r.stdout);
  r = run(tmp);
  assert.ok(/Where you are:\n  .*, a folder of videos\n\nWhat is waiting:\n  1\. door\n     whose turn: the subject expert/.test(r.stdout), r.stdout);
  // vkit help is a manual page: every command in a group, one subcommand per line, one command in full on request
  const h = spawnSync('node', [VKIT, 'help'], { encoding: 'utf8' });
  assert.ok(/^VKIT\(1\)\n\nNAME\n/.test(h.stdout) && /\nSYNOPSIS\n/.test(h.stdout) && /\nCOMMANDS\n/.test(h.stdout) && /\nENVIRONMENT\n/.test(h.stdout) && /\nFILES\n/.test(h.stdout) && /\nSEE ALSO\n/.test(h.stdout), 'the sections');
  const cli = fs.readFileSync(VKIT, 'utf8');
  const table = {}; for (const m of cli.matchAll(/^\s+'([a-z-]+)':\s+\['([^']*)'/gm)) table[m[1]] = m[2];
  for (const c of Object.keys(table)) {
    const heads = h.stdout.split('\n').filter((l) => l === '    ' + c || l.startsWith('    ' + c + ' '));
    assert.strictEqual(heads.length, 1, 'vkit help names ' + c + ' once as a heading: ' + JSON.stringify(heads));
    if (table[c].includes(' | ')) for (const sub of table[c].split('|').map((x) => x.trim().split(/\s/)[0])) assert.ok(h.stdout.includes('      ' + c + ' ' + sub), 'vkit help lists ' + c + ' ' + sub + ' on its own line');
  }
  assert.ok(!h.stdout.split('\n').some((l) => l.length > 100), 'no line over 100 columns: ' + h.stdout.split('\n').find((l) => l.length > 100));
  const one = spawnSync('node', [VKIT, 'help', 'app'], { encoding: 'utf8' });
  assert.ok(/^VKIT HELP: app\n/.test(one.stdout) && /      app crop /.test(one.stdout) && /its own folder beside the videos/.test(one.stdout), one.stdout);
  const bad = spawnSync('node', [VKIT, 'help', 'nope'], { encoding: 'utf8' });
  assert.strictEqual(bad.status, 2);
  console.log('front door: ' + r.stdout.split('\n').slice(5, 10).join(' | '));
});
