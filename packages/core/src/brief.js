// The brief request: the ask to the subject expert, written by the kit so nobody retypes
// what the app has. briefRequest(videoDir) reads video.json and the app the video carries
// (rig/app/manifest.csv) and writes <video>/brief-request.md: what is wanted back (the
// teaching outline, the storyboard rows in the kit's own format, the pickup list of screens
// no state has), the states the app has, and the storyboard template. The subject expert's
// chat answers with the plugin's video-brief skill; the director reads the answer with
// video-script; vkit check proves the rows (sentences-match, storyboard-covered).
const fs = require('fs');
const path = require('path');
const apps = require('./apps');

const RETURN = `## What to hand back

Three things, in this order, as plain text the person can paste into the video folder:

1. **The outline.** Who the video is for, what they can do when it ends, the two to four points it must teach, the pitfalls a learner hits here, the words to use and the words to avoid. Half a page.
2. **The storyboard rows**, in the table below, one row per beat, in the order the video runs. A beat is one sentence of narration; put the substance of the sentence in plain words (what it says, not the final wording) and name what is on screen by the state's id from the list above, then what the eye should be on. Leave Start blank; the clips set it. Camera in plain words (rest, push in on the button, travel to the field). Card is what a small explanation card beside the screen would say, if one is needed. Capture is the state's capture id from the list.
3. **The pickup list.** Every row that needs something no state has (a menu open, a hover, a dropdown, a confirmation, a screen the list does not have) goes here as a capture request: the step, what to do, what the picture must show. Those screens are captured and recreated before any footage is made; nothing on screen is ever invented.

Do not write the final narration; the director writes the words to the craft rules and the narrator's voice. Do not restyle or describe the screen beyond what the states show. Facts first: if a default, a limit or a behaviour is stated, it must be true for this console today.
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

module.exports = { briefRequest };
