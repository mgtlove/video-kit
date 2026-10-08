// The brief request: the ask to the subject expert, written by the kit so nobody retypes
// what the app has. briefRequest(videoDir) reads video.json and the app the video carries
// (rig/app/manifest.csv) and writes <video>/brief-request.md: what is wanted back (the
// teaching outline, the storyboard rows in the kit's own format, the pickup list of screens
// no state has), the states the app has, and the storyboard template. The subject expert's
// chat answers with the plugin's video-brief skill by writing files into the same folder;
// the director reads them with video-script; vkit check proves the rows (sentences-match,
// storyboard-covered). handoffs(dir) says, per video, what is waiting and for whom: the
// video folder is the handoff, and no text travels through the producer (decisions, 8 Oct 2026).
const fs = require('fs');
const path = require('path');
const apps = require('./apps');

const RETURN = `## What to hand back

Three files, written into this video's folder (the one this request sits in), in this order:

1. **The outline**, as \`brief.md\`. Who the video is for, what they can do when it ends, the two to four points it must teach, the pitfalls a learner hits here, the words to use and the words to avoid. Half a page.
2. **The storyboard rows**, into \`storyboard.md\` under the header it already has (keep the header and its note; replace the starter's rows), one row per beat, in the order the video runs. A beat is one sentence of narration; put the substance of the sentence in plain words (what it says, not the final wording) and name what is on screen by the state's id from the list above, then what the eye should be on. Leave Start blank; the clips set it. Camera in plain words (rest, push in on the button, travel to the field). Card is what a small explanation card beside the screen would say, if one is needed. Capture is the state's capture id from the list.
3. **The pickup list**, as \`capture-request.md\`, written even when it is empty (then it says so). Every row that needs something no state has (a menu open, a hover, a dropdown, a confirmation, a screen the list does not have) goes here as a capture request: the step, what to do, what the picture must show. Those screens are captured and recreated before any footage is made; nothing on screen is ever invented.

When the three files are written, say so in one line; \`vkit handoffs\` then shows the video waiting for the director. Do not write the final narration; the director writes the words to the craft rules and the narrator's voice. Do not restyle or describe the screen beyond what the states show. Facts first: if a default, a limit or a behaviour is stated, it must be true for this console today.
`;

function briefRequest(videoDir) {
  const dir = path.resolve(videoDir || '.');
  const metaFile = path.join(dir, 'video.json');
  if (!fs.existsSync(metaFile)) throw new Error('no video.json in ' + dir + ' (run inside a video folder made by vkit new)');
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const name = meta.name || path.basename(dir);
  const appDir = path.join(dir, 'rig', 'app');
  const states = meta.app && meta.app.ref && fs.existsSync(path.join(appDir, 'manifest.csv')) ? apps.readManifest(appDir) : [];
  const out = [];
  out.push('# Brief request: ' + name, '');
  out.push('Written by `vkit brief` on ' + new Date().toISOString().slice(0, 10) + '. For the subject expert who knows the tool: the kit needs the teaching, not the pictures. Answer with the `video-brief` skill.', '');
  out.push('## The video', '', '- Name: `' + name + '`', '- Task: ' + (meta.job && meta.job.kind ? meta.job.kind : 'to be stated by the producer') + (meta.job && meta.job.title ? ': ' + meta.job.title : ''), '- Recreated app: ' + (meta.app && meta.app.ref ? '`' + meta.app.ref + '` (version ' + (meta.app.version || '?') + ')' : 'none; every screen is a concept scene'), '');
  if (states.length) {
    out.push('## The states the app has', '', 'Every screen moment the video can show. A row of the storyboard names one of these by id. Anything the teaching needs that is not here is a pickup, not an invention.', '', '| State id | Screen | What it shows | Capture |', '|---|---|---|---|');
    for (const s of states) out.push('| `' + s.id + '` | ' + (s.screen || '') + ' | ' + (s.state || '') + ' | ' + (s.capture || '') + ' |');
    out.push('');
  } else out.push('## The states the app has', '', 'None. This video has no recreated app, so every screen is a concept scene drawn by the kit; name scenes in plain words (`scene opener`, `scene cards`).', '');
  out.push(RETURN);
  out.push('## The storyboard table', '', 'Copy this header and add one row per beat. The Sentence column holds the substance in plain words; the director turns it into narration.', '', '| Part | Sentence | Start (s) | On screen | Camera | Card | Capture |', '|---|---|---|---|---|---|---|', '| 1 | (what this beat says, in plain words) | | state ' + (states[0] ? states[0].id : '<id>') + ', (what the eye is on) | rest | | ' + (states[0] && states[0].capture ? states[0].capture.replace(/\.png$/i, '') : 'CAP-?') + ' |', '');
  out.push('A part is a stretch the narrator records in one go (a scene change or a pause is a part boundary); two to five parts for a video under three minutes. Keep a part under about 1000 characters of narration so it is cheap to record again.', '');
  const file = path.join(dir, 'brief-request.md');
  fs.writeFileSync(file, out.join('\n'));
  return { file, states: states.length, name };
}


// What is waiting, and for whom. A video folder's files are its state; the newer side of each
// pair is the open side. One line per video, in the order the work runs.
function mtime(f) { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } }
function handoff(dir) {
  const name = path.basename(dir);
  const req = mtime(path.join(dir, 'brief-request.md'));
  const brief = mtime(path.join(dir, 'brief.md'));
  const pickups = mtime(path.join(dir, 'capture-request.md'));
  const full = mtime(path.join(dir, 'narration', 'FULL.md'));
  const fact = mtime(path.join(dir, 'fact-check.md'));
  const sb = mtime(path.join(dir, 'storyboard.md'));
  const verdicts = fact ? factVerdicts(path.join(dir, 'fact-check.md')) : null;
  // the check is current when its sentences are the narration's, in order; dates cannot tell that
  let fullLines = [];
  try {
    const all = fs.readFileSync(path.join(dir, 'narration', 'FULL.md'), 'utf8').split('\n').map((l) => l.trim());
    const first = all.findIndex((l) => /^#{1,3}\s*Part\b/i.test(l));      /* vkit narration writes a title and a note before the parts */
    fullLines = (first < 0 ? all : all.slice(first)).filter((l) => l && !/^#/.test(l));
  } catch (e) { fullLines = []; }
  let sbLines = [];
  try { sbLines = fs.readFileSync(path.join(dir, 'storyboard.md'), 'utf8').split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l)).map((l) => l.split('|')[2].trim()); } catch (e) { sbLines = []; }
  const rowsDiffer = sb > full && !(sbLines.length === fullLines.length && sbLines.every((t, i) => t === fullLines[i]));
  const checkCurrent = !!(verdicts && verdicts.sentences.length && verdicts.sentences.length === fullLines.length && verdicts.sentences.every((t, i) => t === fullLines[i]));
  let voice = [];
  try { voice = fs.readdirSync(path.join(dir, 'voice')).filter((f) => /^part-\d+\.(m4a|wav|mp3|aac)$/i.test(f)); } catch (e) { voice = []; }
  let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'video.json'), 'utf8')); } catch (e) { meta = {}; }
  const app = meta.app && meta.app.ref ? meta.app.ref : '';
  let who, what, skill;
  if (!req && !brief && !app) { who = 'subject expert'; what = 'no brief.md yet: the idea (who it is for, what they can do after, the points) and capture-request.md, the screens it needs'; skill = 'video-brief'; }
  else if (!req && brief && !app) { who = 'director'; what = 'the idea is here (brief.md' + (pickups ? ', capture-request.md' : '') + ') and no app is in the video; once the app is captured and recreated, vkit app use family/tool, then vkit brief'; skill = 'vkit app use'; }
  else if (!req) { who = 'director'; what = 'app ' + app + ' is in; no brief-request.md yet'; skill = 'vkit brief'; }
  else if (brief < req) { who = 'subject expert'; what = 'brief-request.md waits for brief.md, the storyboard rows and capture-request.md'; skill = 'video-brief'; }
  else if (!full) { who = 'director'; what = 'the expert answered' + (pickups >= brief ? ' (capture-request.md listed; pickups first)' : '') + '; no narration/FULL.md yet'; skill = 'video-script'; }
  else if (rowsDiffer) { who = 'director'; what = 'storyboard.md is newer than the narration and its sentences differ; the sentences follow the rows'; skill = 'video-script, step 3'; }
  else if (!checkCurrent && brief > full) { who = 'director'; what = 'brief.md changed after the words; the words get another look, then vkit narration'; skill = 'video-script, step 3'; }
  else if (!checkCurrent) { who = 'subject expert'; what = 'narration/FULL.md waits for fact-check.md' + (fact ? ' (the check on file is of other sentences)' : ''); skill = 'video-fact-check'; }
  else if (verdicts.open) { who = 'director'; what = 'fact-check.md has ' + verdicts.summary + ' to apply, then vkit narration again'; skill = 'video-script, step 5'; }
  else if (!voice.length) { who = 'producer'; what = 'the narration is checked; the words want a yes and a recording (voice/part-N.m4a)'; skill = 'video-script, step 6'; }
  else { who = 'director'; what = voice.length + ' clip' + (voice.length === 1 ? '' : 's') + ' in voice/; the clips are the clock'; skill = 'video-measure'; }
  return { name, dir, who, what, skill };
}
// factVerdicts(file): the verdict column of fact-check.md. Anything but true is open work for the
// director; the file's own counts line is not trusted, the rows are read.
function factVerdicts(file) {
  const counts = { true: 0, wrong: 0, caveat: 0, drift: 0 };
  const sentences = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    const v = (cells[3] || '').toLowerCase();
    if (v in counts) { counts[v]++; sentences.push(cells[2] || ''); }
  }
  const open = counts.wrong + counts.caveat + counts.drift;
  const parts = ['wrong', 'caveat', 'drift'].filter((k) => counts[k]).map((k) => counts[k] + ' ' + k);
  return { counts, open, sentences, summary: parts.join(', ') || 'nothing' };
}
// An app has its own handoff, before any video: the expert's coverage (capture-request.md in
// the app folder) waits for captures; new captures wait for states. A quiet app is not listed.
function newest(dir, re) { let t = 0; try { for (const f of fs.readdirSync(dir)) if (re.test(f)) t = Math.max(t, mtime(path.join(dir, f))); } catch (e) { t = 0; } return t; }
function appHandoff(ref, dir) {
  const req = mtime(path.join(dir, 'capture-request.md'));
  const caps = newest(path.join(dir, 'captures'), /^CAP-\d+\.png$/i);
  const manifest = mtime(path.join(dir, 'manifest.csv'));
  if (req && req > caps && req > manifest) return { name: 'app ' + ref, dir, who: 'director', what: 'capture-request.md waits for captures (a Claude Code session on the machine with the browser, the person signed in)', skill: 'capture-walkthrough' };
  if (caps && caps > manifest) return { name: 'app ' + ref, dir, who: 'director', what: 'captures newer than manifest.csv wait for states', skill: 'video-recreate' };
  return null;
}
function appHandoffs() {
  const out = [];
  for (const base of apps.appDirs()) {
    if (/[\\/]examples[\\/]apps$/.test(base)) continue;
    let families = []; try { families = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch (e) { families = []; }
    for (const fam of families) {
      let tools = []; try { tools = fs.readdirSync(path.join(base, fam.name), { withFileTypes: true }).filter((d) => d.isDirectory()); } catch (e) { tools = []; }
      for (const t of tools) {
        const dir = path.join(base, fam.name, t.name);
        if (!fs.existsSync(path.join(dir, 'app.json'))) continue;
        const h = appHandoff(fam.name + '/' + t.name, dir);
        if (h) out.push(h);
      }
    }
  }
  return out;
}
function handoffs(where, opts) {
  opts = opts || {};
  const root = path.resolve(where || '.');
  let list;
  if (fs.existsSync(path.join(root, 'video.json'))) list = [handoff(root)];
  else {
    list = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'video.json'))).map((d) => handoff(path.join(root, d.name)));
    if (!list.length) throw new Error('no video folder in ' + root + ' (a folder with video.json, or a folder of them)');
  }
  return opts.apps === false ? list : list.concat(appHandoffs());
}
function formatHandoffs(list) {
  return list.map((h) => h.name + ': ' + h.who + ' (' + h.skill + '): ' + h.what).join('\n');
}

module.exports = { briefRequest, handoffs, formatHandoffs };
