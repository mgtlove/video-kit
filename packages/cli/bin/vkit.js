#!/usr/bin/env node
// vkit: the command table. Every command calls one core function and prints
// the result. The plugin and the MCP server reuse this table.
const path = require('path');
const fs = require('fs');
const core = require('@video-kit/core');

const COMMANDS = {
  'new':            ['<name> [--app family/tool]', 'create a video folder from starter/, engine copied in; --app copies a recreated app in'],
  'status':         ['[folder]', 'every app (the hub) and every video and twin made from it (the spokes) with the engine and app version each carries, current or behind, and the app\'s changes since each copy; run in the workspace folder'],
  'app':            ['new family/tool | use family/tool [video] | use --all [family/tool] [--no-check] | build family/tool | add-state family/tool <id> [--capture f] [--screen s] [--state c] [--note t] | extract <video> family/tool <id> [--capture f] | crop family/tool <CAP-NNN> <name> --at x,y,w,h [--replace]', 'recreated apps: make one, add a state that cites a capture, lift a video\'s inline screen into one, copy a region of a capture (a logo, an icon) into crops/ for the recreation, bring one video or every video up to the app, or run the app\'s generator and verify its states'],
  'menu':           ['[dir] [--show] [--set item[.field]=value [--note t]] [--explain item] [--walk]', 'walk through the ten choices one at a time (Enter keeps, a number picks, ? explains, 0 types your own, S saves and runs frames, Q stops); --show prints them; --set answers one from a script'],
  'shoot':          ['start [--show] | status | go <url> | "<step>" "<what was done>" [--into dir] [--allow-hits] | stop', 'the capture browser: Chrome on the kit\'s own profile at 1920x1080, ratio 2, headless (--show for signing in); shoot takes the page-only picture into dir/captures/ after hiding the masks in dir/shoot.json and sweeping the text; status says where the page is and how old the session is'],
  'face':           ['<name> --family "<css family>" [--weights 400,700] [--into dir] [--sample text]', 'a typeface of our own from the page open in the capture browser: each glyph drawn at 1000 px and traced, widths and kerning measured, into dir/faces/; the sample line set in both faces and the differing pixels counted'],
  'capture':        ['<walkthrough.docx> [--into dir]', 'read a walkthrough document (docs/CAPTURE.md) into dir/captures/: CAP-NNN.png in reading order, walkthrough.md, captures.csv; checks PNG, size, unique, under a step; exit 1 on a failing row'],
  'brief':          ['[dir]', 'write brief-request.md: the ask to the subject expert, with the app\'s states and the storyboard template already in it (the video-brief skill answers it)'],
  'handoffs':       ['[dir]', 'what is waiting and for whom, per video: dir is a video folder or the folder that holds them; both chats run this instead of asking'],
  'narration':      ['[dir] [--wpm N]', 'check the script parts against the limits, write narration/FULL.md, estimate lengths'],
  'time':           ['[dir] [--redo] [--prompt "labels"] [--model name]', 'word times from each clip (faster-whisper, local) and every sentence\'s start written into storyboard.md; the beats are placed where the words are said'],
  'measure':        ['[dir]', 'read voice/part-N.* with ffprobe and write the exact PARTS line; the clips are the clock'],
  'frames':         ['[dir] [times...|--every N]', 'a still per beat so you can look before recording anything'],
  'render':         ['[dir] [--fps N]', 'every frame from the seek, the voice muxed, captions beside it: out/<name>.mp4'],
  'check':          ['[dir] [--quick]', 'is it footage, is it well made: offline, deterministic, seek-correct, craft rules, contrast, fidelity; --quick skips the slow proofs'],
  'brand':          ['<name>|none [dir] [--check]', 'apply a brand from brands/ (copied to rig/brand/, tokens in rig/brand.css); no name rebuilds from rig/brand/brand.json; --check reports what it does to the rules'],
  'look':           ['<name>|none [dir]', 'apply a look pack from looks/ as tokens in rig/look.css; none empties it'],
  'twin':           ['family/tool [--path name] [--port N] [--build]', 'the practice copy: the app\'s states and model served as a page a learner clicks through, with the sidekick beside it walking one of the app\'s paths, on the same engine as a video; built into the app\'s twin/ and served on localhost until Ctrl-C; --build writes it and stops'],
  'upgrade':        ['[dir]', 'bring a video\'s engine copy (rig/engine/) up to the kit\'s; the old copy is kept in the video\'s _suggested-trash/'],
  'plugin':         ['pack [--out file]', 'zip packages/plugin/ for the claude.ai upload (no node_modules, no .DS_Store) to ~/Desktop/vkit-plugin.zip or --out'],
  'sync-reference': ['[path] [--only rules|looks|patterns]', 'copy rules.json, looks/ and patterns/index.json from ../video-reference'],
  'publish':        ['[dir]', 'hand the MP4 to a host adapter and record the URL']
};

/* progress: every slow core function reports through opts.progress; here is what that looks like.
   On a terminal, one line that rewrites in place (a bar, the count, the time left); in a pipe or a
   log, a plain line every few seconds and one when a step finishes. VKIT_QUIET=1 turns it off. */
function progressSink() {
  if (process.env.VKIT_QUIET) return undefined;
  const tty = !!process.stdout.isTTY;
  const P = core.progress;
  let lineLen = 0;
  return P.throttled((r) => {
    if (tty) {
      const text = P.bar(r.step, r.done, r.total, r.note, r.started, 24).slice(0, (process.stdout.columns || 100) - 1);
      process.stdout.write('\r' + text + ' '.repeat(Math.max(0, lineLen - text.length)));
      lineLen = r.final ? 0 : text.length;
      if (r.final) process.stdout.write('\n');
    } else process.stdout.write(P.line(r.step, r.done, r.total, r.note) + '\n');
  }, tty ? 200 : 5000);
}

/* vkit help: a manual page. The command table above is the one source of a command's arguments and
   one-line meaning; MAN adds the groups (in the order a video is made), each command's longer
   explanation, and its subcommands one per line. vkit help <command> prints one command in full. */
const MAN = {
  groups: [
    ['Making a video', ['new', 'menu', 'brief', 'handoffs', 'narration', 'measure', 'time', 'frames', 'render', 'check']],
    ['Screens: capturing and recreating a tool', ['shoot', 'capture', 'face', 'app']],
    ['Looks and brands', ['look', 'brand']],
    ['The practice copy', ['twin']],
    ['Keeping the copies current', ['status']],
    ['The kit itself', ['upgrade', 'plugin', 'sync-reference', 'publish']]
  ],
  detail: {
    'status': ['An app is the hub; the videos and twins made from it are spokes, each carrying a copy of the app and of the engine. vkit status lists every one with what it carries against the kit\'s engine and the app\'s version, says which are behind, and prints the app\'s CHANGES.md lines a copy has not seen. The route of a change is docs/MAINTENANCE.md: capture, the expert\'s what-changed.md, the states, app.json and CHANGES.md, vkit app build, vkit app use --all, the frames looked at.', 'Videos are found in the folder given (or the current one), one level down, and in a videos/ folder; apps in VKIT_APPS or apps/ beside the kit.'],
    'new': ['A video is a folder: storyboard.md, narration/, voice/, rig/ (the page that is the footage) and video.json (the record of its choices). The engine is copied in at the kit\'s version.', 'With --app, the recreated app\'s states are copied into rig/app/ and the page points at them.'],
    'menu': ['The ten choices a video makes: job, sources, layout, brand, look, tone, patterns, voice, characters, fixed lines. Each is recorded in video.json with where it came from and when.', 'After vkit measure, the items that would re-time the video are locked.'],
    'brief': ['The director\'s ask to the subject expert, written into the video folder. The expert\'s chat answers it with the video-brief skill: brief.md, the storyboard rows and capture-request.md.'],
    'handoffs': ['Reads the files in each video folder (and each app folder) and says whose turn it is and with which skill. Both chats run this instead of asking each other.'],
    'narration': ['Reads narration/part-N.md (one sentence per line, one line per storyboard row), holds each part to its limits, writes narration/FULL.md, writes the final sentences into storyboard.md\'s Sentence column and logs every row whose words moved from the expert\'s in narration/changes.md.'],
    'measure': ['The clips are the clock: each voice/part-N file is read to the millisecond and the lengths go into the page\'s PARTS line and video.json. Nothing is stretched or padded.'],
    'time': ['Runs faster-whisper on this machine (word timestamps on; the model downloads once) over each clip, aligns the written words to the heard words, and writes each sentence\'s start into storyboard.md and voice/times.json.'],
    'frames': ['One PNG per beat into rig/_frames/, 0.3 s after each beat lands, so the rig is judged by looking. Times as arguments pick moments; --every N takes a still every N seconds.'],
    'render': ['Every frame drawn from the seek at 30 fps into ffmpeg, the voice clips muxed at their part offsets, captions written from the storyboard. The MP4 is exactly the sum of the parts long.'],
    'check': ['Footage: offline, deterministic, seekable, seek equals playback. Craft: the rules from rules.json by id (text floors, line length, holds, actions move, notes clear). Contrast on the pixels. Fidelity: each app state against its capture.', 'Each row names its measurement, threshold and place; --quick skips the slow proofs while you work.'],
    'shoot': ['The capture browser: the Chrome already on this machine, on the kit\'s own profile, with the page\'s viewport at exactly 1920x1080 at a device pixel ratio of 2. Sign in once in a visible window (start --show), then run headless.', 'Each shot hides the selectors in shoot.json\'s mask, sweeps the text for an account id, an ARN, an email or an IP and refuses while any remain, then writes CAP-NNN.png with a values file, walkthrough.md and captures.csv.'],
    'capture': ['The other way in: a Word document from whoever has the tool, a heading per step, a line of what was done, the screenshot under it. Written into captures/ in reading order with the text beside each picture; the shape is checked (PNG, size, unique, under a step).'],
    'face': ['The product\'s typeface, traced from the page open in the capture browser: each glyph drawn at 1000 px and traced, widths and kerning measured, written as an OTF of our own with a provenance note. Nothing is read from the product\'s font file.'],
    'app': ['A recreated app is its own folder beside the videos (apps/<family>/<tool>/), built from your own captures and used by many videos.'],
    'look': ['A look pack from looks/ written as --look-* tokens in rig/look.css; the theme reads brand, then look, then its defaults. Seven packs from the research.'],
    'brand': ['A brand is one folder: five colours, two faces, a mark and a banner placed by when and where. Written as --brand-* tokens; --check measures each colour against the surface it sits on.'],
    'twin': ['The app model (docs/MODEL.md) run by a hand, as a page in a practice browser with the sidekick beside it: the real address of each screen (from its capture), back and forward, the page scaled to the width it has and scrolling whole with the product\'s top bar and footer pinned. A click on a control the model answers performs its transition with the press, the load and the morph a video shows; a click on anything else shows the notice (captured but not built, or outside the practice); a field named in a type transition takes the learner\'s own text in a real input, and the text then appears wherever the lesson\'s value did, the address included.', 'The sidekick (outside the simulated screen, in a colour the product never uses) walks one of the app\'s paths (paths/<name>.json, the lesson\'s steps in its own words): the step, why, a Fill it in for me on a typed field, Show me, the rules a name breaks in the console\'s words, and Start over. --path picks a path; the first by name otherwise.', 'The built folder is a build product in the app folder; nothing in it is edited by hand.'],
    'upgrade': ['The kit\'s engine copied into a video\'s rig/engine/, VERSION and video.json.engine written. The old copy goes to the video\'s _suggested-trash/, never deleted; a copy that was edited inside the video is named.'],
    'plugin': ['The Claude plugin (packages/plugin/) zipped the way claude.ai\'s upload takes it. Then: claude.ai, Customize, Plugins, Upload a plugin.'],
    'sync-reference': ['Copies the craft rules, the look packs and the patterns index from the research repo beside this one, with the source commit recorded.'],
    'publish': ['Not built yet: hands the MP4 to a host adapter and records the URL in video.json.']
  },
  subs: {
    'app': [['new family/tool', 'make an app folder: app.json, tokens.css, screen.css, states/, manifest.csv'],
      ['use family/tool [video]', 'copy the app into a video that exists, or bring the video\'s copy up to date; writes video.json and prints the CHANGES.md lines the copy had not seen'],
      ['use --all [family/tool] [--no-check]', 'the sweep: every video under this folder (one level down, or in videos/) brought up to its app, then each one\'s quick check; --no-check skips the checks'],
      ['build family/tool', 'run the app\'s own generator (make-states.js in the app folder, if it has one), then verify the states against the manifest and the crops'],
      ['add-state family/tool <id> [--capture f] [--screen s] [--state c] [--note t]', 'add a state that cites a capture'],
      ['extract <video> family/tool <id> [--capture f]', 'lift a video\'s inline screen into an app folder'],
      ['crop family/tool <CAP-NNN> <name> --at x,y,w,h [--replace]', 'copy a region of a capture (a logo, an icon) into crops/, in whole screen pixels']],
    'shoot': [['start [--show]', 'run the capture browser headless; --show opens a window to sign in'],
      ['status', 'where the page is, the viewport, whether it is a sign-in page, the session\'s age'],
      ['go <url>', 'open a page'],
      ['"<step>" "<what was done>" [--into dir] [--allow-hits]', 'take the shot into dir/captures/; refused while private text shows'],
      ['stop', 'close the browser its own way, so cookies are kept']],
    'plugin': [['pack [--out file]', 'write the upload zip (default ~/Desktop/vkit-plugin.zip)']]
  },
  env: [['PW_CHANNEL=chrome', 'use the Chrome already on this machine for frames, render and check. shoot and face use it without being told. Nothing ever downloads a browser.'],
    ['VKIT_QUIET=1', 'no progress line. Long commands otherwise show one: a bar on a terminal, plain lines in a pipe.'],
    ['VKIT_APPS=<folder>', 'where recreated apps are looked for first; then ../apps beside the kit, then the kit\'s examples.']],
  files: [['video.json', 'the record of a video\'s choices, parts, engine and app'], ['storyboard.md', 'one row per sentence: part, sentence, start, action, on screen, camera, card, capture'],
    ['narration/part-N.md', 'the words, one sentence per line; FULL.md and changes.md are written by vkit narration'], ['voice/part-N.m4a', 'the recordings, one per part; .wav, .mp3, .aac, .flac, .ogg are read too'],
    ['rig/index.html', 'the page that is the footage; rig/engine/ is the kit\'s engine, never edited here'], ['out/', 'the MP4, captions, check.json and render.json'],
    ['apps/<family>/<tool>/', 'a recreated app: states, crops, faces, manifest.csv, fidelity.md, capture-request.md']],
  see: [['README.md', 'the two-minute version'], ['docs/ENGINE.md', 'what a rig page can call'], ['docs/ROADMAP.md', 'the plan'], ['the vkit plugin', 'the skills that drive these commands from a chat; vkit-start opens a session']]
};

function wrap(text, indent, width) {
  const out = []; let line = '';
  for (const w of text.split(' ')) {
    if ((line + ' ' + w).trim().length > width - indent && line) { out.push(' '.repeat(indent) + line); line = w; } else line = (line ? line + ' ' : '') + w;
  }
  if (line) out.push(' '.repeat(indent) + line);
  return out;
}
function manCommand(name, full) {
  const [args, what] = COMMANDS[name];
  const out = [];
  const subs = MAN.subs[name];
  out.push('    ' + name + (subs ? ' <subcommand>' : (args ? ' ' + args : '')));
  out.push(...wrap(what.charAt(0).toUpperCase() + what.slice(1) + (/[.!?]$/.test(what) ? '' : '.'), 8, 78));
  if (full) for (const d of MAN.detail[name] || []) out.push(...wrap(d, 8, 78));
  if (subs) for (const [a, w] of subs) { out.push('      ' + name + ' ' + a); out.push(...wrap(w, 10, 78)); }
  return out;
}
function help(one) {
  if (one && !COMMANDS[one]) { console.error('unknown command: ' + one + '. vkit help lists them.'); return 2; }
  if (one) { console.log(['VKIT HELP: ' + one, ''].concat(manCommand(one, true)).join('\n')); return 0; }
  const out = ['VKIT(1)', '', 'NAME', '    vkit: training and explainer videos from screenshots and a script', '',
    'SYNOPSIS', '    vkit                       the front door: what this is, what is waiting, the ways in', '    vkit <command> [options]', '    vkit help [command]        this page, or one command in full', '',
    'COMMANDS', '    In the order a video is made. A video is a folder; every command takes its path', '    or runs inside it.'];
  for (const [title, names] of MAN.groups) { out.push('', '  ' + title); for (const n of names) { out.push(''); out.push(...manCommand(n, false)); } }
  out.push('', 'ENVIRONMENT'); for (const [k, v] of MAN.env) { out.push('    ' + k); out.push(...wrap(v, 8, 78)); }
  out.push('', 'FILES'); for (const [k, v] of MAN.files) { out.push('    ' + k); out.push(...wrap(v, 8, 78)); }
  out.push('', 'SEE ALSO'); for (const [k, v] of MAN.see) { out.push('    ' + k); out.push(...wrap(v, 8, 78)); }
  out.push('', 'RULES', ...wrap('Never download a browser. Never call a paid service without a go-ahead. Never delete: move it aside and say so. The recreated screen is never restyled. Nothing on screen is invented: no capture, no control.', 4, 78));
  console.log(out.join('\n'));
  return 0;
}

/* the front door: vkit with no command says what this is, where this folder stands and the ways in,
   for someone who has never seen the project. vkit --help is the command table. */
function frontDoor() {
  const lines = ['vkit', '  Training and explainer videos from screenshots and a script.',
    '  The screen is recreated in HTML, every frame is drawn from a clock,', '  and it is checked before anyone records anything. A video is a folder.', ''];
  const cwd = process.cwd();
  const home = require('os').homedir();
  const where = cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;
  const item = (n, h) => ['  ' + n + ' ' + h.name, '     whose turn: the ' + h.who + ', with ' + (/^vkit /.test(h.skill) ? h.skill : 'the ' + h.skill + ' skill'), '     what: ' + h.what];
  if (fs.existsSync(path.join(cwd, 'video.json'))) {
    const meta = JSON.parse(fs.readFileSync(path.join(cwd, 'video.json'), 'utf8'));
    lines.push('Where you are:', '  ' + where + ', the video "' + meta.name + '"', '  engine ' + meta.engine + (meta.app && meta.app.ref ? ', app ' + meta.app.ref + ' ' + meta.app.version : ', no recreated app'), '');
    lines.push('What is waiting:');
    try { for (const h of core.handoffs(cwd, { apps: false })) lines.push(...item('1.', h)); } catch (e) { lines.push('  ' + e.message); }
  } else {
    let list = [], videos = true; try { list = core.handoffs(cwd); } catch (e) { list = core.appHandoffs(); videos = false; }
    lines.push('Where you are:', '  ' + where + (videos ? ', a folder of videos' : ', not a video folder (no video.json here, one level down, or in videos/)'), '');
    lines.push(videos ? 'What is waiting:' : 'What is waiting elsewhere:');
    const vids = list.filter((h) => !/^app /.test(h.name)), apps = list.filter((h) => /^app /.test(h.name));
    if (!list.length) lines.push('  nothing');
    vids.forEach((h, i) => lines.push(...item((i + 1) + '.', h)));
    if (apps.length && vids.length) lines.push('', 'Apps waiting on their own:');
    apps.forEach((h, i) => lines.push(...item((i + 1) + '.', h)));
  }
  lines.push('', 'Three ways in:',
    '  1. I have an idea for a video', '     In the subject expert\'s chat, the video-brief skill writes brief.md and the screens it needs.', '     vkit new <name> makes the folder.',
    '  2. I have screenshots of a tool', '     vkit capture <walkthrough.docx> reads a Word document of them, or vkit shoot takes them.', '     Then the video-recreate skill builds the screen.',
    '  3. I have a recording', '     vkit measure sets the clock from the clips.', '     vkit time places every sentence where it is said.',
    '', 'Who does what:',
    '  producer         the goal, the words, the first watch',
    '  subject expert   the teaching and the fact check, in its own chat',
    '  director         the words under the craft rules, the camera, the timeline; the chat with this repo',
    '  vkit handoffs says whose turn it is.',
    '', 'More:',
    '  vkit help        the manual page; vkit help <command> for one command in full',
    '  vkit status      every app and every video and twin made from it, current or behind',
    '  vkit-start       the skill for the start of a session',
    '  README.md        the two-minute version');
  console.log(lines.join('\n'));
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) { frontDoor(); return 0; }
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') return help(args[0]);
  if (!COMMANDS[cmd]) { console.error('unknown command: ' + cmd + '. Try vkit --help'); return 2; }
  const channel = process.env.PW_CHANNEL || undefined;
  const captureChannel = process.env.PW_CHANNEL || 'chrome';   /* the capture browser only ever means the Chrome already here */

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
    for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { if (['--replace', '--all', '--no-check'].includes(rest[i])) flags[rest[i].slice(2)] = true; else flags[rest[i].slice(2)] = rest[++i]; } else pos.push(rest[i]); }
    if (sub === 'new') {
      if (!pos[0]) { console.error('vkit app new family/tool [--title "Shown name"] [--extends family/other]'); return 2; }
      const r = core.apps.appNew(pos[0], { title: flags.title, extends: flags.extends });
      console.log('made ' + r.dir + '. Put captures in captures/, then vkit app add-state ' + pos[0] + ' <id> --capture <file>');
      return 0;
    }
    if (sub === 'use' && rest.includes('--all')) {
      const ref = pos[0];
      const s = await core.sweep('.', { ref, check: !rest.includes('--no-check'), progress: progressSink(), channel: process.env.PW_CHANNEL || undefined });
      console.log(core.formatSweep(s));
      return s.videos.some((v) => v.check && v.check.failures) ? 1 : 0;
    }
    if (sub === 'use') {
      if (!pos[0]) { console.error('vkit app use family/tool [video]   or   vkit app use --all [family/tool] [--no-check]'); return 2; }
      const r = core.apps.appUse(pos[1] || '.', pos[0]);
      console.log((r.action === 'installed' ? 'put ' + r.ref + ' ' + r.version + ' into the video' : (r.from === r.version ? 'refreshed ' + r.ref + ' ' + r.version + ' (already current)' : 'brought ' + r.ref + ' up to ' + r.version + (r.from ? ' from ' + r.from : ''))) + ': ' + r.states.length + ' state' + (r.states.length === 1 ? '' : 's') + (r.added.length && r.action === 'updated' ? ', added ' + r.added.join(', ') : '') + (r.gone.length ? ', no longer in the app (left on disk): ' + r.gone.join(', ') : '') + '.' + (r.action === 'installed' ? ' Next: vkit brief' : ''));
      if (r.action === 'updated' && r.from !== r.version) { const since = core.changesSince(core.apps.resolveApp(r.ref).dir, r.from, r.version); console.log(since.length ? 'Since ' + r.from + ':\n' + since.map((c) => '  ' + c.version + ' (' + c.date + '): ' + c.text).join('\n') : 'CHANGES.md has no line between ' + r.from + ' and ' + r.version + '; the app\'s folder should say what moved (docs/MAINTENANCE.md).'); }
      return 0;
    }
    if (sub === 'build') {
      if (!pos[0]) { console.error('vkit app build family/tool'); return 2; }
      const b = core.buildApp(pos[0]);
      console.log(core.formatBuild(b));
      return b.ok ? 0 : 1;
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
    if (sub === 'crop') {
      if (!pos[0] || !pos[1] || !pos[2] || !flags.at) { console.error('vkit app crop family/tool <CAP-NNN> <name> --at x,y,w,h [--replace]   (in the picture\'s own pixels)'); return 2; }
      const [x, y, w, h] = flags.at.split(',').map(Number);
      const r = core.apps.appCrop(pos[0], pos[1], { name: pos[2], x, y, w, h, replace: 'replace' in flags });
      console.log('cropped ' + r.width + 'x' + r.height + ' from ' + r.row.capture + ' at ' + [x, y].join(',') + ' into ' + path.relative(process.cwd(), r.file) + ' (' + r.scale + 'x)' + (r.rounded ? '; ' + r.rounded : '') + '; crops.csv has the row. The capture is unchanged.');
      return 0;
    }
    console.error('vkit app new|use|build|add-state|extract|crop'); return 2;
  }
  if (cmd === 'twin') {
    const ref = args.find((a) => /^[a-z0-9-]+\/[a-z0-9-]+$/.test(a));
    if (!ref) { console.error('vkit twin family/tool [--path name] [--port N] [--build]'); return 2; }
    const port = args.indexOf('--port') >= 0 ? Number(args[args.indexOf('--port') + 1]) : 0;
    const walk = args.indexOf('--path') >= 0 ? args[args.indexOf('--path') + 1] : undefined;
    const r = core.buildTwin(ref, { path: walk });
    console.log('built ' + path.relative(process.cwd(), r.dir) + ': ' + r.title + ', ' + r.built + ' of ' + r.states + ' states built, ' + r.transitions + ' transitions, starts at ' + r.start + ', ' + r.urls + ' addresses (from the captures, else the model)' + (r.swept.length ? ' (' + r.swept.join(', ') + ' left without one: a 12-digit number in the address)' : '') + ', ' + (r.path ? 'the sidekick walks ' + r.path + ' (' + r.steps + ' steps' + (r.paths.length > 1 ? '; also ' + r.paths.filter((n) => n !== r.path).join(', ') : '') + ')' : 'no path for the sidekick (paths/ is empty)') + ', ' + r.rules + ' field rules, engine ' + r.engine + '.');
    if (args.includes('--build')) return 0;
    const s = await core.serveTwin(r.dir, { port });
    console.log('Serving at ' + s.url + '  (Ctrl-C stops it; R in the page starts over; a click the model has nothing for shows the notice)');
    await new Promise(() => {});   /* until Ctrl-C */
    return 0;
  }
  if (cmd === 'status') {
    console.log(core.formatStatus(core.status(args[0] || '.')));
    return 0;
  }
  if (cmd === 'upgrade') {
    console.log(core.formatUpgrade(core.upgradeEngine(args[0] || '.')));
    return 0;
  }
  if (cmd === 'plugin') {
    if (args[0] !== 'pack') { console.error('vkit plugin pack [--out file]'); return 2; }
    const out = args.indexOf('--out') >= 0 ? args[args.indexOf('--out') + 1] : null;
    const r = core.packPlugin({ out });
    console.log('wrote ' + r.file + ': plugin ' + r.version + ', ' + r.entries.length + ' files, ' + r.bytes + ' bytes.');
    console.log('Upload it: claude.ai, Customize, Plugins, Upload a plugin. Every chat on the account then has these skills at ' + r.version + '; a chat opened before the upload keeps the old ones until it is restarted.');
    return 0;
  }
  if (cmd === 'frames') {
    let dir = '.', times = [], every = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--every') every = Number(args[++i]);
      else if (!isNaN(Number(args[i]))) times.push(Number(args[i]));
      else dir = args[i];
    }
    const r = await core.frames(dir, { times, every, channel, progress: progressSink() });
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
    const r = await core.renderVideo(dir, { fps, channel, progress: progressSink() });
    const rel = (f) => path.relative(process.cwd(), f);
    console.log('wrote ' + rel(r.files.mp4) + ': ' + r.frames + ' frames at ' + r.fps + ' fps, ' + r.total_seconds + ' s, parts ' + JSON.stringify(r.parts) + ', in ' + r.seconds_to_render + ' s');
    if (r.files.vtt) console.log('wrote ' + rel(r.files.vtt) + ' and ' + rel(r.files.srt) + ': ' + r.captions + ' cues from storyboard.md');
    else console.log('no captions: storyboard.md has no rows with a part, a sentence and a start');
    if (r.clips.length) console.log('voice: ' + r.clips.map((c) => c.file + ' at ' + c.offset + ' s').join(', '));
    if (r.parts_without_a_clip.length) console.log('no clip for part ' + r.parts_without_a_clip.join(', ') + (r.clips.length ? '' : '; the track is silent') + '. Clips go in voice/part-N.m4a, .wav, .mp3, .aac, .flac or .ogg');
    console.log('report: ' + rel(r.files.report) + '. Play the MP4 and look.');
    return 0;
  }
  if (cmd === 'check') {
    let dir = '.', quick = false;
    for (const a of args) { if (a === '--quick') quick = true; else dir = a; }
    const r = await core.check(dir, { quick, channel, progress: progressSink() });
    console.log(require('@video-kit/core/src/check').format(r));
    return r.failures ? 1 : 0;
  }
  if (cmd === 'shoot') {
    const S = core.shoot;
    const sub = args[0];
    const flags = {}, pos = [];
    for (let i = 1; i < args.length; i++) { if (args[i] === '--into') flags.into = args[++i]; else if (args[i] === '--show') flags.show = true; else if (args[i] === '--allow-hits') flags.allowHits = true; else if (args[i] === '--port') flags.port = args[++i]; else pos.push(args[i]); }
    if (sub === 'start') { const r = await S.start({ show: flags.show, channel: captureChannel, port: flags.port }); console.log('capture browser ' + (r.show ? 'visible' : 'headless') + ', pid ' + r.pid + ', port ' + r.port + ', ' + r.browser + ', viewport ' + r.viewport.w + 'x' + r.viewport.h + ' at ' + r.viewport.dpr + 'x, profile ' + r.profile + (r.show ? '\nSign in in that window, then vkit shoot stop and vkit shoot start to carry the session on headless.' : '\nThe Playwright MCP server registered for this folder connects to port ' + r.port + ' (the agent\'s eyes and hands); vkit shoot "<step>" "<what was done>" --into <app or video folder> at each screen.')); return 0; }
    if (sub === 'stop') { const r = await S.stop(); console.log(r.stopped ? 'stopped pid ' + r.pid : r.reason); return 0; }
    if (sub === 'status') { const r = await S.status({ into: flags.into }); console.log(S.formatStatus(r)); return r.running ? 0 : 1; }
    if (sub === 'go') { if (!pos[0]) { console.error('vkit shoot go <url>'); return 2; } const r = await S.go(pos[0]); console.log('at ' + r.url + (r.title ? '  (' + r.title + ')' : '')); return 0; }
    if (!sub || sub.startsWith('--')) { console.error('vkit shoot start [--show] | status | go <url> | "<step>" "<what was done>" [--into dir] [--allow-hits] | stop'); return 2; }
    try { const r = await S.shoot(sub, pos[0], { into: flags.into, allowHits: flags.allowHits, port: flags.port }); console.log(S.formatShot(r)); return 0; }
    catch (e) { console.error(e.message); return e.hits ? 3 : 1; }
  }
  if (cmd === 'face') {
    let name = null, family = null, weights = null, into = '.', sample = null;
    for (let i = 0; i < args.length; i++) { if (args[i] === '--family') family = args[++i]; else if (args[i] === '--weights') weights = args[++i].split(',').map(Number); else if (args[i] === '--into') into = args[++i]; else if (args[i] === '--sample') sample = args[++i]; else name = args[i]; }
    const r = await core.face(name, { family, weights, into, sample, channel: captureChannel });
    console.log(core.faceFormat(r));
    return 0;
  }
  if (cmd === 'capture') {
    let file = null, into = '.';
    for (let i = 0; i < args.length; i++) { if (args[i] === '--into') into = args[++i]; else file = args[i]; }
    if (!file) { console.error('vkit capture <walkthrough.docx> [--into dir]   (docs/CAPTURE.md says what the document holds)'); return 2; }
    const r = core.capture(file, { into });
    console.log(core.captureFormat(r));
    return r.failures ? 1 : 0;
  }
  if (cmd === 'sync-reference') {
    let p = null, only = null;
    for (let i = 0; i < args.length; i++) { if (args[i] === '--only') only = args[++i]; else p = args[i]; }
    const r = core.syncReference({ path: p, only });
    if (r.done.rules) console.log('rules.json from ' + r.done.rules.source);
    if (r.done.looks) console.log(r.done.looks.count + ' looks into looks/ from ' + r.done.looks.source);
    if (r.done.patterns) console.log(r.done.patterns.count + ' moves into patterns/index.json from ' + r.done.patterns.source);
    console.log('reference ' + r.reference + (r.done.rules && r.done.rules.commit ? ' at ' + r.done.rules.commit : ' (no commit recorded)'));
    return 0;
  }
  if (cmd === 'time') {
    const flags = {}, pos = [];
    for (let i = 0; i < args.length; i++) { if (args[i] === '--redo') flags.redo = true; else if (args[i] === '--prompt') flags.prompt = args[++i]; else if (args[i] === '--model') flags.model = args[++i]; else pos.push(args[i]); }
    const r = core.timeVideo(pos[0] || '.', flags);
    console.log(r.report.join('\n'));
    console.log('wrote Start for ' + r.rows + ' rows of storyboard.md and voice/times.json');
    return 0;
  }
  if (cmd === 'handoffs') {
    console.log(core.formatHandoffs(core.handoffs(args[0] || '.')));
    return 0;
  }
  if (cmd === 'brief') {
    const r = core.briefRequest(args[0] || '.');
    console.log('wrote ' + path.relative(process.cwd(), r.file) + ' for ' + r.name + ' with ' + r.states + ' state' + (r.states === 1 ? '' : 's') + ' of the app listed. Paste it to the subject expert\'s chat; its video-brief skill answers with the outline, the storyboard rows and the pickup list.');
    return 0;
  }
  if (cmd === 'narration') {
    let dir = '.', wpm = null;
    for (let i = 0; i < args.length; i++) { if (args[i] === '--wpm') wpm = Number(args[++i]); else dir = args[i]; }
    const r = core.narration(dir, { wpm });
    for (const p of r.parts) console.log('part ' + p.part + ': ' + p.sentences + ' sentences, ' + p.words + ' words, ' + p.characters + ' characters, about ' + p.estimateSeconds + ' s' + (p.problems.length ? '\n  ' + p.problems.join('\n  ') : ''));
    console.log('about ' + r.total + ' s at ' + r.wpm + ' wpm. ' + r.partsLine + '\nwrote ' + path.relative(process.cwd(), r.full) + (r.problems ? '\n' + r.problems + ' problem(s) above the limits' : ''));
    const sb = r.storyboard;
    if (sb.rows) console.log('storyboard.md: ' + sb.written + ' sentence' + (sb.written === 1 ? '' : 's') + ' written into the Sentence column; ' + (sb.changed.length ? sb.changed.length + ' row' + (sb.changed.length === 1 ? '' : 's') + ' differ from the expert\'s words (' + sb.changed.join(', ') + '), logged in narration/changes.md' : 'every row says what the expert wrote') + (sb.mismatched.length ? '\nnot synced, rows and sentences differ: ' + sb.mismatched.join('; ') : ''));
    return r.problems ? 1 : 0;
  }
  if (cmd === 'measure') {
    const r = core.measure(args[0] || '.');
    for (const c of r.clips) console.log('part ' + c.part + ': ' + c.file + ' ' + c.seconds.toFixed(2) + ' s');
    console.log(r.line + '\ntotal ' + r.total + ' s, written to rig/index.html and video.json' + (r.locked.length ? '; locked: ' + r.locked.join(', ') : '') + (r.extra.length ? '\nclips beyond the PARTS count ignored: part ' + r.extra.join(', ') : ''));
    return 0;
  }
  if (cmd === 'menu') {
    const menu = core.menu;
    let dir = '.', show = false, sets = [], explain = null, note = null, walk = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--show') show = true;
      else if (args[i] === '--walk') walk = true;
      else if (args[i] === '--set') sets.push(args[++i]);
      else if (args[i] === '--note') note = args[++i];
      else if (args[i] === '--explain') explain = args[++i];
      else dir = args[i];
    }
    if (explain) {
      const e = menu.explain(explain);
      console.log(e.title + ': ' + e.ask + '\n' + e.reason + '\n');
      for (const f of e.fields) { console.log((e.fields.length > 1 ? f.name + ':' : 'options:') + (f.free ? ' (or type your own: ' + f.free + ')' : '') + (f.many ? ' (several, comma separated)' : '')); for (const o of f.options) console.log('  ' + o.value.padEnd(28) + o.means); }
      return 0;
    }
    if (sets.length) {
      for (const sline of sets) {
        const m = /^([a-z_]+)(?:\.([a-z_]+))?=(.*)$/.exec(sline);
        if (!m) { console.error('--set item=value or --set item.field=value: ' + sline); return 2; }
        const r = menu.set(dir, m[1], m[2] || null, m[3], note);
        console.log(r.key + (r.field !== 'value' ? '.' + r.field : '') + ' = ' + (Array.isArray(r.value) ? r.value.join(', ') : r.value || '(cleared)') + (r.ran ? '  (ran ' + r.ran + ')' : ''));
      }
      return 0;
    }
    if (show || (!process.stdin.isTTY && !walk)) { console.log(menu.format(menu.show(dir))); if (!show) console.log('\n(no terminal to walk the items; vkit menu --set item=value answers one, --walk reads answers from a pipe)'); return 0; }
    /* the walk: one item at a time; every answer goes through menu.set, so a look or a brand is applied as it is chosen */
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
    /* answers are queued as they arrive, so a pipe of answers (one per line) walks the same way a person does; the end of input stops the walk like Q */
    const queue = []; let waiting = null, closed = false;
    const echo = (l) => { if (!process.stdin.isTTY) process.stdout.write(l + '\n'); return l; };
    rl.on('line', (l) => { if (waiting) { const w = waiting; waiting = null; w(echo(l)); } else queue.push(l); });
    rl.on('close', () => { closed = true; if (waiting) { const w = waiting; waiting = null; w('Q'); } });
    const ask = (q) => { process.stdout.write(q); if (queue.length) return Promise.resolve(echo(queue.shift())); if (closed) return Promise.resolve('Q'); return new Promise((res) => { waiting = res; }); };
    let runFrames = false, stop = false;
    try {
      console.log(menu.format(menu.show(dir)) + '\n\nEnter keeps the answer. A number picks. ? explains. 0 types your own. S saves and runs frames. Q stops.\n');
      for (const it of menu.items(dir)) {
        if (stop) break;
        console.log(it.n + '. ' + it.title + ': ' + it.ask + (it.locked ? '\n   LOCKED: ' + it.locked : ''));
        for (const f of it.fields) {
          if (stop) break;
          const cur = Array.isArray(f.current) ? f.current.join(', ') : f.current;
          const label = it.fields.length > 1 ? '   ' + f.name : '  ';
          if (f.options.length) f.options.forEach((o, k) => console.log(label + ' ' + String(k + 1).padStart(3) + ') ' + o.value.padEnd(26) + (o.means || '').slice(0, 90)));
          for (;;) {
            const a = (await ask(label + ' [' + (cur === '' ? 'not chosen' : cur) + ']' + (f.free && !f.options.length ? ' (type a value)' : '') + ' > ')).trim();
            if (a === '') break;
            if (a === 'Q' || a === 'q') { stop = true; break; }
            if (a === 'S' || a === 's') { stop = true; runFrames = true; break; }
            if (a === '?') { console.log('   ' + it.reason + (f.free ? '\n   ' + f.free : '')); continue; }
            let value;
            if (a === '0') value = (await ask(label + ' type it > ')).trim();
            else if (/^[\d ,]+$/.test(a) && f.options.length) { const picks = a.split(/[ ,]+/).filter(Boolean).map((x) => f.options[Number(x) - 1]); if (picks.some((x) => !x)) { console.log('   no such number'); continue; } value = f.many ? picks.map((x) => x.value) : picks[0].value; }
            else value = a;
            try { const r = menu.set(dir, it.key, f.name, value); console.log('   ' + (Array.isArray(r.value) ? r.value.join(', ') : r.value) + ' chosen' + (r.ran ? '; ran ' + r.ran : '')); break; }
            catch (e) { console.log('   ' + e.message); }
          }
        }
      }
    } finally { rl.close(); }
    console.log('\n' + menu.format(menu.show(dir)));
    if (runFrames) { const r = await core.frames(dir, { channel, progress: progressSink() }); console.log('\n' + r.files.length + ' frames in ' + path.relative(process.cwd(), path.dirname(r.files[0])) + '. Open them and look.'); }
    return 0;
  }
  if (cmd === 'brand') {
    let name = null, dir = '.', check = false;
    for (const a of args) { if (a === '--check') check = true; else if (name === null && (a === 'none' || core.brands.listBrands().includes(a) || fs.existsSync(path.join(a, 'brand.json')))) name = a; else dir = a; }
    if (!check) {
      const r = core.brand(dir, name);
      console.log('brand ' + r.name + ' written to ' + path.relative(process.cwd(), r.file) + (r.hasMark ? ', mark ' + r.tokens['--brand-mark-when'] + ' at ' + r.tokens['--brand-mark-where'] : '') + (r.hasBanner ? ', banner ' + r.tokens['--brand-banner-when'] + ' at the ' + r.tokens['--brand-banner-where'] : '') + (r.notes.length ? '\n  ' + r.notes.join('\n  ') : ''));
    }
    const c = core.brandCheck(dir);
    console.log(core.brands.formatCheck(c));
    if (!check) console.log('vkit frames to look, vkit check --quick to measure.');
    return c.failures ? 1 : 0;
  }
  if (cmd === 'look') {
    if (!args[0]) { console.error('vkit look <name>|none [dir]. Looks: ' + (fs.existsSync(path.join(core.apps.KIT || '', 'looks')) ? '' : '') + 'see looks/index.json'); return 2; }
    const r = core.look(args[1] || '.', args[0]);
    console.log('look ' + r.name + ' written to ' + path.relative(process.cwd(), r.file) + (r.notes.length ? '\n  ' + r.notes.join('\n  ') : '') + '\nvkit frames to look, vkit check --quick to measure.');
    return 0;
  }
  console.error(cmd + ': not built yet. See docs/ROADMAP.md.');
  return 1;
}

main().then((code) => process.exit(code)).catch((e) => { console.error(e.message); process.exit(1); });
