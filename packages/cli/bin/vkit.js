#!/usr/bin/env node
// vkit: the command table. Every command calls one core function and prints
// the result. The plugin and the MCP server reuse this table.
const path = require('path');
const core = require('@video-kit/core');

const COMMANDS = {
  'new':            ['<name> [--app family/tool]', 'create a video folder from starter/, engine copied in; --app copies a recreated app in'],
  'app':            ['new|add-state|extract ...', 'recreated apps: app new family/tool; app add-state family/tool id [--capture f]; app extract <video> family/tool id'],
  'menu':           ['[dir]', 'walk through the ten choices a video makes; or show them'],
  'capture':        ['[dir]', 'capture a task in the browser as tagged screenshots (later)'],
  'narration':      ['[dir]', 'check the script parts, rebuild FULL.md, estimate lengths'],
  'measure':        ['[dir]', 'measure the voice clips and write the exact part lengths'],
  'frames':         ['[dir] [times...|--every N]', 'a still per beat so you can look before recording anything'],
  'render':         ['[dir] [--fps N]', 'every frame from the seek, the voice muxed, captions beside it: out/<name>.mp4'],
  'check':          ['[dir]', 'offline, deterministic, seek-correct, craft rules, brand contrast'],
  'brand':          ['[dir] [--check]', 'write brand.css from brand.json; --check reports what is applied'],
  'sync-reference': ['[path]', 'regenerate rules.json, looks/ and patterns/index.json from ../video-reference'],
  'publish':        ['[dir]', 'hand the MP4 to a host adapter and record the URL']
};

function help() {
  console.log('vkit <command>\n');
  for (const [name, [args, what]] of Object.entries(COMMANDS)) console.log('  ' + (name + ' ' + args).padEnd(34) + what);
  console.log('\nPW_CHANNEL=chrome uses the Chrome already on this machine for frames; nothing downloads a browser.');
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') { help(); return 0; }
  if (!COMMANDS[cmd]) { console.error('unknown command: ' + cmd + '. Try vkit --help'); return 2; }
  const channel = process.env.PW_CHANNEL || undefined;

  if (cmd === 'new') {
    let name = null, app = null;
    for (let i = 0; i < args.length; i++) { if (args[i] === '--app') app = args[++i]; else name = args[i]; }
    if (!name) { console.error('vkit new <name> [--app family/tool]'); return 2; }
    const r = core.newVideo(name, { app });
    console.log('created ' + path.relative(process.cwd(), r.dir) + ' on engine ' + r.engine + (r.app ? ', app ' + r.app.ref + ' ' + r.app.version + ' (states: ' + r.app.states.join(', ') + ')' : '') + '. Next: cd ' + name + ' && vkit menu');
    return 0;
  }
  if (cmd === 'app') {
    const sub = args[0], rest = args.slice(1), flags = {}, pos = [];
    for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i]; else pos.push(rest[i]); }
    if (sub === 'new') {
      if (!pos[0]) { console.error('vkit app new family/tool [--title "Shown name"] [--extends family/other]'); return 2; }
      const r = core.apps.appNew(pos[0], { title: flags.title, extends: flags.extends });
      console.log('made ' + r.dir + '. Put captures in captures/, then vkit app add-state ' + pos[0] + ' <id> --capture <file>');
      return 0;
    }
    if (sub === 'add-state') {
      if (!pos[0] || !pos[1]) { console.error('vkit app add-state family/tool <id> [--capture file] [--screen name] [--state condition] [--note text]'); return 2; }
      const r = core.apps.appAddState(pos[0], pos[1], { capture: flags.capture, screen: flags.screen, state: flags.state, note: flags.note, captured_on: flags['captured-on'] });
      console.log('added state ' + r.id + ': ' + path.relative(process.cwd(), r.file) + '. Recreate the markup inside #mock there from the capture; keep the ids the timeline points at.');
      return 0;
    }
    if (sub === 'extract') {
      if (!pos[0] || !pos[1] || !pos[2]) { console.error('vkit app extract <video> family/tool <state-id> [--capture file]'); return 2; }
      const r = core.apps.appExtract(pos[0], pos[1], pos[2], { capture: flags.capture, note: flags.note });
      console.log('lifted ' + pos[0] + '\'s inline screen into ' + r.dir + ' as state ' + r.id + (r.tokens ? ', with its palette' : ', no palette block found') + (r.screen ? ' and its rules' : ', no rules block found') + '. A starting point: check it against the capture.');
      return 0;
    }
    console.error('vkit app new|add-state|extract'); return 2;
  }
  if (cmd === 'frames') {
    let dir = '.', times = [], every = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--every') every = Number(args[++i]);
      else if (!isNaN(Number(args[i]))) times.push(Number(args[i]));
      else dir = args[i];
    }
    const r = await core.frames(dir, { times, every, channel });
    for (const f of r.files) console.log('wrote ' + path.relative(process.cwd(), f));
    console.log('\n' + r.files.length + ' frames. Total run ' + r.total + ' s, parts ' + JSON.stringify(r.parts) + ', engine ' + r.engine + '. Open the PNGs and look.');
    return 0;
  }
  if (cmd === 'render') {
    let dir = '.', fps = 30;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--fps') fps = Number(args[++i]);
      else dir = args[i];
    }
    let last = -1;
    const onFrame = (n) => { if (n % 300 === 0 && n !== last) { last = n; process.stdout.write('frame ' + n + '\n'); } };
    const r = await core.renderVideo(dir, { fps, channel, onFrame });
    const rel = (f) => path.relative(process.cwd(), f);
    console.log('wrote ' + rel(r.files.mp4) + ': ' + r.frames + ' frames at ' + r.fps + ' fps, ' + r.total_seconds + ' s, parts ' + JSON.stringify(r.parts) + ', in ' + r.seconds_to_render + ' s');
    if (r.files.vtt) console.log('wrote ' + rel(r.files.vtt) + ' and ' + rel(r.files.srt) + ': ' + r.captions + ' cues from storyboard.md');
    else console.log('no captions: storyboard.md has no rows with a part, a sentence and a start');
    if (r.clips.length) console.log('voice: ' + r.clips.map((c) => c.file + ' at ' + c.offset + ' s').join(', '));
    if (r.parts_without_a_clip.length) console.log('no clip for part ' + r.parts_without_a_clip.join(', ') + (r.clips.length ? '' : '; the track is silent') + '. Clips go in voice/part-N.wav or .mp3');
    console.log('report: ' + rel(r.files.report) + '. Play the MP4 and look.');
    return 0;
  }
  console.error(cmd + ': not built yet. See docs/ROADMAP.md.');
  return 1;
}

main().then((code) => process.exit(code)).catch((e) => { console.error(e.message); process.exit(1); });
