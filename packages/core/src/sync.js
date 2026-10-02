// syncReference(opts): the kit carries small data files made from the
// research repo (video-reference), never read from it at run time:
//   rules.json           the measurable craft rules, for vkit check   (this step)
//   looks/, patterns/    the look packs and the patterns index, for the menu  (step 7)
// The reference is found at $VKIT_REFERENCE, then ../video-reference beside the
// kit. Each copied file records where it came from and when.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { KIT } = require('./new');

function referenceDir(given) {
  const dirs = [given, process.env.VKIT_REFERENCE, path.join(KIT, '..', 'video-reference')].filter(Boolean).map((d) => path.resolve(d));
  const found = dirs.find((d) => fs.existsSync(path.join(d, 'craft', 'rules.json')) || fs.existsSync(path.join(d, 'catalog.md')));
  if (!found) throw new Error('no video-reference at ' + dirs.join(', ') + '. Clone it beside the kit or set VKIT_REFERENCE.');
  return found;
}
function commitOf(dir) {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

function syncRules(ref) {
  const src = path.join(ref, 'craft', 'rules.json');
  if (!fs.existsSync(src)) throw new Error('the reference has no craft/rules.json at ' + src);
  const rules = JSON.parse(fs.readFileSync(src, 'utf8'));
  rules._source = { repo: 'video-reference', file: 'craft/rules.json', commit: commitOf(ref), copied_on: new Date().toISOString().slice(0, 10),
    note: 'Copied by vkit sync-reference; edit the reference, not this file. The frame geometry rows (rail, caption band) describe the older inset layout; the kit has one full-frame layout and captions as a sidecar, so vkit check applies safe areas, contrast, text, colour, motion and pacing and marks the band and rail rows as not applicable.' };
  const dst = path.join(KIT, 'rules.json');
  fs.writeFileSync(dst, JSON.stringify(rules, null, 2) + '\n');
  return { file: dst, source: src, commit: rules._source.commit };
}

function syncReference(opts) {
  opts = opts || {};
  const ref = referenceDir(opts.path);
  const done = {};
  if (opts.rules !== false) done.rules = syncRules(ref);
  if (opts.looks || opts.patterns) throw new Error('looks and patterns sync is roadmap step 7');
  return { reference: ref, done };
}

function loadRules() {
  const f = path.join(KIT, 'rules.json');
  if (!fs.existsSync(f)) throw new Error('the kit has no rules.json; run vkit sync-reference with video-reference beside the kit');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

module.exports = { syncReference, syncRules, referenceDir, loadRules };
