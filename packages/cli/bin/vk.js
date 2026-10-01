#!/usr/bin/env node
// vk: the command table. Every command calls one core function and prints
// the result. The plugin and the MCP server reuse this table, which is why
// they stay thin.

const COMMANDS = {
  'new':            'create a video folder from starter/, with the menu defaults filled in',
  'menu':           'walk through the ten choices a video makes; or show them',
  'capture':        'capture a task in the browser as tagged screenshots (later)',
  'narration':      'check the script parts, rebuild FULL.md, estimate lengths',
  'measure':        'measure the voice clips and write the exact part lengths',
  'frames':         'render a still per beat so you can look before recording anything',
  'render':         'render every frame and mux the voice into an MP4',
  'check':          'offline, deterministic, seek-correct, craft rules, brand contrast',
  'brand':          'write brand.css from brand.json; --check reports what is applied',
  'sync-reference': 'regenerate rules.json, looks/ and patterns/index.json from ../video-reference',
  'publish':        'hand the MP4 to a host adapter and record the URL'
};

const [cmd] = process.argv.slice(2);
if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log('vk <command>\n');
  for (const [name, what] of Object.entries(COMMANDS)) console.log('  ' + name.padEnd(16) + what);
  console.log('\nStatus: skeleton. Commands land in the order docs/ROADMAP.md gives.');
  process.exit(0);
}
if (!COMMANDS[cmd]) { console.error('unknown command: ' + cmd + '. Try vk --help'); process.exit(2); }
console.error(cmd + ': not built yet. See docs/ROADMAP.md.');
process.exit(1);
