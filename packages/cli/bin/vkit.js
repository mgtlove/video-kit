#!/usr/bin/env node
// vkit: the command table. Every command calls one core function and prints
// the result. The plugin and the MCP server reuse this table.
const path = require('path');
const core = require('@video-kit/core');

const COMMANDS = {
  'new':            ['<name>', 'create a video folder from starter/, engine copied in, menu defaults filled'],
  'menu':           ['[dir]', 'walk through the ten choices a video makes; or show them'],
  'capture':        ['[dir]', 'capture a task in the browser as tagged screenshots (later)'],
  'narration':      ['[dir]', 'check the script parts, rebuild FULL.md, estimate lengths'],
  'measure':        ['[dir]', 'measure the voice clips and write the exact part lengths'],
  'frames':         ['[dir] [times...|--every N]', 'a still per beat so you can look before recording anything'],
  'render':         ['[dir]', 'render every frame and mux the voice into an MP4'],
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
    if (!args[0]) { console.error('vkit new <name>'); return 2; }
    const r = core.newVideo(args[0]);
    console.log('created ' + path.relative(process.cwd(), r.dir) + ' on engine ' + r.engine + '. Next: cd ' + args[0] + ' && vkit menu');
    return 0;
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
  console.error(cmd + ': not built yet. See docs/ROADMAP.md.');
  return 1;
}

main().then((code) => process.exit(code)).catch((e) => { console.error(e.message); process.exit(1); });
