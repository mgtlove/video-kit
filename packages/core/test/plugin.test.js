// Proof for roadmap step 8, the plugin and the progress line.
//   1. every skill has frontmatter with a name that matches its folder, a description and a
//      version; every `vkit <command>` a skill names is in the CLI's command table, every
//      `--flag` it names belongs to that command, and every menu item it names exists; the
//      drafted list of menu items is out of the skills (vkit menu --explain is the list)
//   2. the guard hook's own cases pass (python3 test_guard.py), so the hook cannot rot quietly
//   3. progress: a slow function reports done/total through opts.progress; in a pipe the CLI
//      prints plain lines with the step, the count and the percentage, and nothing at all with
//      VKIT_QUIET=1; the bar formatter draws the count, the percentage and the time left
// The frames run needs a browser. About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
// The plugin's version, carried by every skill; bump all together when the skills change, because
// claude.ai keeps the uploaded copy and a re-upload is how the chats get the change (8 October 2026).
const PLUGIN_VERSION = '0.1.2';
const { spawnSync } = require('child_process');
const core = require('../src');
const { KIT } = require('../src/new');

const PLUGIN = path.join(KIT, 'packages', 'plugin');
const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');

function frontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(md);
  if (!m) return null;
  const out = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const k = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (k) { key = k[1]; out[key] = k[2].replace(/^>\s*$/, ''); }
    else if (key && /^\s+/.test(line)) out[key] = (out[key] + ' ' + line.trim()).trim();
  }
  const v = /version:\s*"([^"]+)"/.exec(m[1]); if (v) out.version = v[1];
  return out;
}

test('every skill names its folder, and every command, flag and item it names exists', () => {
  const cli = fs.readFileSync(VKIT, 'utf8');
  const table = {};
  for (const m of cli.matchAll(/^\s+'([a-z-]+)':\s+\['([^']*)'/gm)) table[m[1]] = m[2];
  const items = core.menu.items().map((i) => i.key);
  const dirs = fs.readdirSync(path.join(PLUGIN, 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepStrictEqual(dirs, ['brand-apply', 'capture-walkthrough', 'video-brief', 'video-build', 'video-capture', 'video-check', 'video-fact-check', 'video-frames', 'video-measure', 'video-menu', 'video-recreate', 'video-script', 'vkit-start']);
  const named = new Set();
  for (const d of dirs) {
    const file = path.join(PLUGIN, 'skills', d, 'SKILL.md');
    const md = fs.readFileSync(file, 'utf8');
    const fm = frontmatter(md);
    assert.ok(fm, d + ' has no frontmatter');
    assert.strictEqual(fm.name, d, d + ' names itself ' + fm.name);
    assert.ok(fm.description && fm.description.length > 40, d + ' needs a description');
    assert.ok(!/<[^>]*>/.test(fm.description), d + ": the description must not hold anything shaped like a tag (claude.ai's plugin upload refuses 'apps/<family>/<tool>' as XML, 8 October 2026)");
    assert.strictEqual(fm.version, PLUGIN_VERSION, d + ' version: every skill carries the plugin version');
    assert.ok(!/—/.test(md), d + ' has an em dash');
    for (const m of md.matchAll(/`(?:PW_CHANNEL=chrome )?vkit ([a-z-]+)((?:[^`]*))`/g)) {
      const cmd = m[1];
      if (cmd === '--help') continue;
      assert.ok(table[cmd], d + ' names vkit ' + cmd + ', which the CLI does not have');
      named.add(cmd);
      for (const f of m[2].matchAll(/--([a-z-]+)/g)) assert.ok(table[cmd].includes('--' + f[1]), d + ': vkit ' + cmd + ' has no --' + f[1] + ' (table: ' + table[cmd] + ')');
      if (cmd === 'menu') for (const e of m[2].matchAll(/--explain <?([a-z_]+)>?/g)) if (e[1] !== 'item') assert.ok(items.includes(e[1]), d + ' explains ' + e[1] + ', not a menu item');
    }
    for (const m of md.matchAll(/`([a-z_]+)(?:\.[a-z_]+)?=[^`]*`/g)) if (!/^(--|PW_|VKIT_)/.test(m[0])) assert.ok(items.includes(m[1]) || m[1] === 'item', d + ' sets ' + m[1] + ', not a menu item');
  }
  assert.ok(!fs.existsSync(path.join(PLUGIN, 'skills', 'video-menu', 'references', 'menu-items.md')), 'the typed list of items is out of the skill');
  const notBuilt = Object.keys(table).filter((c) => /\(later\)|not built|step 1[01]/.test(table[c]) || ['publish'].includes(c));
  assert.ok(named.has('capture') && named.has('shoot') && !notBuilt.includes('capture'), 'vkit capture and vkit shoot are built and a skill names each');
  console.log(dirs.length + ' skills; commands named: ' + [...named].sort().join(', ') + '; not built and named so: ' + notBuilt.join(', '));
});

test('the guard hook passes its own cases', () => {
  const r = spawnSync('python3', [path.join(PLUGIN, 'hooks', 'scripts', 'test_guard.py')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const m = /(\d+) passed, (\d+) failed/.exec(r.stdout);
  assert.ok(m && Number(m[2]) === 0 && Number(m[1]) >= 21, r.stdout);
  const hooks = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'hooks', 'hooks.json'), 'utf8'));
  assert.ok(hooks.hooks.PreToolUse[0].hooks[0].command.includes('guard.py'));
  const plugin = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.strictEqual(plugin.version, PLUGIN_VERSION);
  console.log(m[1] + ' hook cases pass; plugin ' + plugin.name + ' ' + plugin.version);
});

test('progress reaches the caller, the pipe and the bar', async () => {
  const P = core.progress;
  const b = P.bar('render', 1200, 2040, 'frame at 40.00 s', Date.now() - 60000, 20);
  assert.ok(/render\s+\[#{12}\.{8}\] 1200\/2040\s+59%\s+42s left\s+frame at 40.00 s/.test(b), b);
  assert.ok(/done in 1m 00s/.test(P.bar('render', 2040, 2040, '', Date.now() - 60000, 20)));
  assert.strictEqual(P.line('stills', 3, 22, 'at 3.30 s'), 'stills             3/22   14%  at 3.30 s');
  const seen = []; const t = P.throttled((r) => seen.push(r), 60000);
  for (let i = 0; i <= 10; i++) t('x', i, 10, '');
  assert.deepStrictEqual(seen.map((r) => r.done), [0, 10], 'a throttled reporter passes the first call and the last');
  const phased = P.phase({ progress: (s, d, tot, n) => seen.push(s + ':' + d) }, 'check');
  phased.progress('stills', 1, 2, ''); assert.strictEqual(seen[seen.length - 1], 'check: stills:1');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-plugin-'));
  const v = core.newVideo('p', { cwd: tmp });
  const calls = [];
  await core.frames(v.dir, Object.assign(require('./opts')(), { times: [1, 2, 3], progress: (s, d, tot, n) => calls.push([s, d, tot]) }));
  assert.deepStrictEqual(calls, [['frames: stills', 0, 3], ['frames: stills', 1, 3], ['frames: stills', 2, 3], ['frames: stills', 3, 3]]);
  const env = Object.assign({}, process.env, { PW_CHANNEL: process.env.PW_CHANNEL || '' });
  const piped = spawnSync(process.execPath, [VKIT, 'frames', v.dir, '1', '2'], { encoding: 'utf8', env });
  assert.strictEqual(piped.status, 0, piped.stderr);
  assert.ok(/^frames: stills\s+0\/2\s+0%\s+page open$/m.test(piped.stdout) && /^frames: stills\s+2\/2\s+100%/m.test(piped.stdout), piped.stdout);
  const quiet = spawnSync(process.execPath, [VKIT, 'frames', v.dir, '1'], { encoding: 'utf8', env: Object.assign({ VKIT_QUIET: '1' }, env) });
  assert.ok(!/stills/.test(quiet.stdout), quiet.stdout);
  console.log('frames reported ' + calls.length + ' times for 3 stills; the pipe shows the first and last line; VKIT_QUIET prints none');
});
