// applyLook(videoDir, name): a look pack becomes tokens the theme reads.
//
// The teaching layer reads every colour, face, size and duration through
// theme.css, and theme.css reads brand first, then look, then its own default:
//   --stage: var(--brand-ground, var(--look-ground, #1c1e1d))
// So vkit look writes rig/look.css with --look-* values and nothing else
// changes: no look renders identically (the test proves it byte for byte), and
// a brand still wins. The recreated product screen reads none of this.
//
// Two places the pack's data meets the kit's rules, decided by the rules in
// rules.json rather than by taste, and written into look.css as comments:
//   stage text: the pack's ink is text on its ground, but two packs (clippings,
//     archive-camera) put words on paper and have a dark ink on a dark ground;
//     when ink cannot hold 4.5:1 on the ground, stage text takes the paper
//     colour and cards keep ink on paper.
//   strokes: a stroke has to hold 3:1 on whatever it sits on, and most sit on
//     a white product screen; the stroke colour is the first of ink, then the
//     accents in order, that holds 3:1 on both the ground and white; if none
//     does, the theme's own highlight stays.
// The pack's camera, holds, pacing and voice are guidance for the author and
// are recorded in video.json.menu.look.guide; rules.json stays the checker's.
const fs = require('fs');
const path = require('path');
const { loadLook, loadRules } = require('./sync');
const { KIT } = require('./new');
const { ratio } = require('./check');

function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function toHex(rgb) { return '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, k) { return [a[0] * k + b[0] * (1 - k), a[1] * k + b[1] * (1 - k), a[2] * k + b[2] * (1 - k)]; }
const WHITE = [255, 255, 255];

function faces() { return JSON.parse(fs.readFileSync(path.join(KIT, 'looks', 'faces.json'), 'utf8')); }

// tokensFor(look): the --look-* values and the reasons behind the two decided ones
function tokensFor(look) {
  const rules = loadRules();
  const needText = rules.contrast.text, needStroke = rules.contrast.nonText;
  const ground = hex(look.ground), ink = hex(look.ink), paper = look.paper ? hex(look.paper) : null;
  const accents = (look.accents || []).map(hex);
  const notes = [];

  let stageInk = ink;
  if (ratio(ink, ground) < needText) {
    if (paper && ratio(paper, ground) >= needText) { stageInk = paper; notes.push('stage text takes the paper colour ' + look.paper + ': the pack\'s ink ' + look.ink + ' is ' + ratio(ink, ground).toFixed(2) + ':1 on the ground, under ' + needText + ':1 (its words sit on paper)'); }
    else notes.push('WARNING: ink ' + look.ink + ' is ' + ratio(ink, ground).toFixed(2) + ':1 on the ground and there is no paper to borrow; vkit check will fail text-contrast');
  }
  // muted and dim: the first mix toward the ground that still holds 4.5:1 (the text floor applies to them too)
  const grade = (k0) => { for (const k of [k0, k0 + 0.1, k0 + 0.2, 1]) { const m = mix(stageInk, ground, Math.min(1, k)); if (ratio(m, ground) >= needText) return m; } return stageInk; };
  const muted = grade(0.7), dim = grade(0.8);
  /* on paper (cards, the explanation card): the pack's ink if it holds 4.5:1 there, else the stage text colour; a dim grade toward the paper */
  let paperInk = null, paperDim = null;
  if (paper) {
    paperInk = ratio(ink, paper) >= needText ? ink : (ratio(stageInk, paper) >= needText ? stageInk : ink);
    if (ratio(paperInk, paper) < needText) notes.push('WARNING: no colour in the pack holds ' + needText + ':1 on the paper ' + look.paper + '; vkit check will fail text-contrast on cards');
    for (const k of [0.75, 0.85, 0.95, 1]) { const m = mix(paperInk, paper, k); if (ratio(m, paper) >= needText) { paperDim = m; break; } }
    paperDim = paperDim || paperInk;
  }

  /* the explanation card sits over the product screen, most often white: its panel is the first of
     paper, ink, ground that holds 3:1 against white; its text the first of ink, ground, paper, stage
     text that holds 4.5:1 on that panel */
  const panelPick = [['paper', paper], ['ink', ink], ['ground', ground]].find(([, c]) => c && ratio(c, WHITE) >= needStroke);
  const panel = panelPick ? panelPick[1] : ground;
  const panelInkPick = [['ink', ink], ['ground', ground], ['paper', paper], ['stage text', stageInk]].find(([, c]) => c && ratio(c, panel) >= needText);
  const panelInk = panelInkPick ? panelInkPick[1] : stageInk;
  const kick = ratio(accents[0] || panelInk, panel) >= needStroke ? (accents[0] || panelInk) : panelInk;
  if (accents[0] && kick !== accents[0]) notes.push('the card\'s label takes the panel ink: accent 1 is ' + ratio(accents[0], panel).toFixed(2) + ':1 on the panel');
  notes.push('the explanation card is ' + (panelPick ? panelPick[0] : 'the ground') + ' ' + toHex(panel) + ' with ' + (panelInkPick ? panelInkPick[0] : 'stage text') + ' ' + toHex(panelInk) + ' on it (' + ratio(panelInk, panel).toFixed(2) + ':1), chosen to hold 3:1 over a white screen');
  /* the three kind colours are text on the card surface: an accent that holds 3:1 there (large text), else the card's ink */
  const surface = paper || ground, surfaceInk = paper ? paperInk : stageInk;
  const kinds = [0, 1, 2].map((i) => { const a = accents[i] || accents[0]; return a && ratio(a, surface) >= needStroke ? a : surfaceInk; });
  const kindNotes = [0, 1, 2].filter((i) => { const a = accents[i] || accents[0]; return a && ratio(a, surface) < needStroke; });
  if (kindNotes.length) notes.push('kind colour' + (kindNotes.length > 1 ? 's ' : ' ') + kindNotes.map((i) => (i + 1) + ' (' + toHex(accents[i] || accents[0]) + ', ' + ratio(accents[i] || accents[0], surface).toFixed(2) + ':1 on the card)').join(', ') + ' fall back to the card\'s ink: an accent under 3:1 cannot carry a name');

  let stroke = null;
  for (const [label, c] of [['ink', ink]].concat(accents.map((a, i) => ['accent ' + (i + 1), a]))) {
    if (ratio(c, ground) >= needStroke && ratio(c, WHITE) >= needStroke) { stroke = c; notes.push('strokes use ' + label + ' ' + toHex(c) + ': ' + ratio(c, ground).toFixed(2) + ':1 on the ground, ' + ratio(c, WHITE).toFixed(2) + ':1 on a white screen'); break; }
  }
  if (!stroke) notes.push('no colour in the pack holds ' + needStroke + ':1 on both the ground and a white screen; strokes keep the theme\'s highlight');

  const fam = faces(), fm = fam.families[look.type.family] || fam.fallback;
  if (!fam.families[look.type.family]) notes.push('type family "' + look.type.family + '" has no entry in looks/faces.json; the fallback stack is used');

  const e = look.entrance || {}, kind = e.kind || 'fade-rise';
  const distance = kind === 'fade-rise' || kind === 'fade-drift' ? (e.distance || 14) : 0;
  const scaleFrom = kind === 'pop' || kind === 'scale-in' ? (e.scaleFrom || 0.92) : 1;
  const t = {
    '--look-ground': look.ground, '--look-ink': toHex(stageInk), '--look-muted': toHex(muted), '--look-dim': toHex(dim),
    '--look-paper': look.paper || null, '--look-paper-ink': paperInk ? toHex(paperInk) : null, '--look-paper-dim': paperDim ? toHex(paperDim) : null,
    '--look-accent-1': look.accents[0] || null, '--look-accent-2': look.accents[1] || look.accents[0] || null, '--look-accent-3': look.accents[2] || look.accents[0] || null,
    '--look-kind-a': toHex(kinds[0]), '--look-kind-b': toHex(kinds[1]), '--look-kind-c': toHex(kinds[2]),
    '--look-panel': toHex(panel) + 'ee', '--look-panel-ink': toHex(panelInk), '--look-panel-kick': toHex(kick),
    '--look-head': fm.head, '--look-weight': String(fm.weight || look.type.weight || 700),
    '--look-size-title': look.type.title + 'px', '--look-size-label': look.type.label + 'px', '--look-size-body': look.type.body + 'px',
    '--look-stroke': stroke ? toHex(stroke) : null, '--look-stroke-width': look.strokes.width + 'px', '--look-stroke-rough': String(Math.round(look.strokes.roughness * 1.6 * 100) / 100), '--look-stroke-glow': (look.strokes.glow || 0) + 'px', '--look-stroke-cap': look.strokes.cap === 'butt' ? 'butt' : look.strokes.cap === 'square' ? 'square' : 'round',
    '--look-stroke-draw': (kind === 'draw-on' ? e.ms : 600) + 'ms',
    '--look-entrance-ms': (e.ms || 450) + 'ms', '--look-entrance-distance': distance + 'px', '--look-entrance-scale': String(scaleFrom),
    '--look-crossfade': (kind === 'cross-fade' ? e.ms : 500) + 'ms'
  };
  return { tokens: t, notes };
}

function lookCss(look, t, notes) {
  const lines = ['/* look: ' + look.name + ' (after ' + (look.after || 'its study') + '). Written by vkit look from looks/' + look.name + '.json; change the pack, not this file. theme.css reads these after the brand and before its defaults. */'];
  for (const n of notes) lines.push('/* ' + n + ' */');
  lines.push(':root{');
  for (const [k, v] of Object.entries(t)) if (v != null) lines.push('  ' + k + ':' + v + ';');
  lines.push('}');
  return lines.join('\n') + '\n';
}

function applyLook(videoDir, name) {
  const dir = path.resolve(videoDir), rig = path.join(dir, 'rig');
  const vj = path.join(dir, 'video.json');
  if (!fs.existsSync(vj)) throw new Error(dir + ' is not a video folder (no video.json)');
  const meta = JSON.parse(fs.readFileSync(vj, 'utf8'));
  if (meta.parts && meta.parts.measured_on && meta.menu && meta.menu.look && meta.menu.look.value && meta.menu.look.value !== name && meta.menu.look.locked) throw new Error('the look is locked: the clips were measured on ' + meta.parts.measured_on + ' and a look changes entrance and crossfade times. Unlock it in video.json.menu.look if you mean it.');
  const file = path.join(rig, 'look.css');
  let notes = [], tokens = {};
  if (!name || name === 'none' || name === 'house') {
    fs.writeFileSync(file, '/* no look: the theme\'s own defaults render. vkit look <name> fills this file. */\n');
  } else {
    const look = loadLook(name);
    ({ tokens, notes } = tokensFor(look));
    fs.writeFileSync(file, lookCss(look, tokens, notes));
    meta.menu = meta.menu || {};
    meta.menu.look = Object.assign(meta.menu.look || {}, { value: name, from: 'vkit look', chosen_on: new Date().toISOString().slice(0, 10),
      guide: { camera: look.camera, cutSeconds: look.cutSeconds, holdSeconds: look.holdSeconds, pacing: look.pacing, voice: look.voice, textOnFrame: look.textOnFrame, evidence: look.evidence, sceneKinds: look.sceneKinds } });
  }
  if (name === 'none' || name === 'house') { meta.menu = meta.menu || {}; meta.menu.look = Object.assign(meta.menu.look || {}, { value: 'house', from: 'vkit look', chosen_on: new Date().toISOString().slice(0, 10) }); delete meta.menu.look.guide; }
  // the page links look.css after theme.css; idempotent
  const html = path.join(rig, 'index.html');
  let page = fs.readFileSync(html, 'utf8');
  if (!page.includes('href="look.css"')) {
    const anchor = '<link rel="stylesheet" href="theme.css">';
    if (!page.includes(anchor)) throw new Error('rig/index.html has no theme.css link to anchor look.css on');
    page = page.replace(anchor, anchor + '\n<link rel="stylesheet" href="look.css">');
    fs.writeFileSync(html, page);
  }
  fs.writeFileSync(vj, JSON.stringify(meta, null, 2) + '\n');
  return { name: name || 'house', file, tokens, notes };
}

module.exports = { applyLook, tokensFor, lookCss };
