// Capture: a walkthrough document in, a capture set out.
//
// The evidence for a recreated screen arrives as one Word document (.docx): a
// heading per step, a line saying what was clicked or typed, the screenshot under
// it, and any note a still cannot carry. docs/CAPTURE.md is the brief that asks
// for it. This module reads the document in reading order, the way a person
// reads it, and writes:
//
//   captures/CAP-001.png ...   every picture, in document order, bytes untouched
//   captures/walkthrough.md    the document's text with each picture in its place
//   captures/captures.csv      id, file, step, text (the whole step's lines), width, height, scale, captured_on, source
//
// and checks the shape of what arrived: every picture is a PNG; its size is
// 1920x1080 or 3840x2160 (a Retina capture, scale 2), any other 16:9 size at or
// above 1920 wide is a warning, anything else fails; no two pictures are the
// same; every picture sits under a step heading that has a line of text before
// the picture. Nothing here looks at a picture: whether it shows the right
// screen, or shows an account id it should not, is a person's or the skill's
// job with the pictures open (the video-capture skill).
//
//   capture(docx, { into }) -> { dir, pictures: [...], rows: [...], failures, warnings, steps, written }
//   format(report)          -> text for a terminal
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readZip } = require('./zip');

const SIZES = { '1920x1080': 1, '3840x2160': 2 };

function unescape(s) {
  return s.replace(/&(amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);/g, (m, e) => {
    if (e === 'amp') return '&'; if (e === 'lt') return '<'; if (e === 'gt') return '>'; if (e === 'quot') return '"'; if (e === 'apos') return "'";
    return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
}

/* the document's paragraphs in reading order (a table's cells are paragraphs too), each with
   its text, its heading level, whether it is a list item, and the pictures it carries */
function readDocx(file) {
  const zip = readZip(fs.readFileSync(file));
  if (!zip.has('word/document.xml')) throw new Error(path.basename(file) + ' is not a Word document (no word/document.xml); a .doc or a .pages file must be saved as .docx first');
  const xml = zip.read('word/document.xml').toString('utf8');
  const rels = {};
  const relXml = zip.has('word/_rels/document.xml.rels') ? zip.read('word/_rels/document.xml.rels').toString('utf8') : '';
  for (const m of relXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0]), target = /\bTarget="([^"]+)"/.exec(m[0]);
    if (id && target) rels[id[1]] = unescape(target[1]);
  }
  const paragraphs = [];
  for (const m of xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    const p = m[0];
    let text = '';
    for (const r of p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)) text += r[1] != null ? unescape(r[1]) : r[0] === '<w:tab/>' ? '\t' : '\n';
    const style = /<w:pStyle\s+w:val="([^"]+)"/.exec(p);
    const h = style ? /^(?:Heading|heading)\s*(\d)$|^Title$/.exec(style[1]) : null;
    const heading = h ? (h[1] ? Number(h[1]) : 1) : 0;
    const images = [];
    for (const b of p.matchAll(/<a:blip\b[^>]*\br:(?:embed|link)="([^"]+)"/g)) {
      const target = rels[b[1]];
      if (!target) continue;
      const name = target.startsWith('/') ? target.slice(1) : 'word/' + target.replace(/^\.\.\//, '');
      images.push(name);
    }
    paragraphs.push({ text: text.trim(), heading, list: /<w:numPr>/.test(p), images });
  }
  let modified = '';
  if (zip.has('docProps/core.xml')) { const c = /<dcterms:modified[^>]*>(\d{4}-\d{2}-\d{2})/.exec(zip.read('docProps/core.xml').toString('utf8')); if (c) modified = c[1]; }
  return { paragraphs, media: (name) => (zip.has(name) ? zip.read(name) : null), modified };
}

function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function kindOf(buf) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47) return 'PNG';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'JPEG';
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'GIF8') return 'GIF';
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'RIFF') return 'WebP';
  if (buf.length >= 4 && buf.readUInt32LE(0) === 1) return 'EMF';
  return 'unknown';
}

const csvCell = (s) => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

function capture(docx, opts) {
  opts = opts || {};
  const file = path.resolve(docx);
  if (!fs.existsSync(file)) throw new Error('no such document: ' + docx);
  if (!/\.docx$/i.test(file)) throw new Error(path.basename(file) + ': a .docx is wanted (docs/CAPTURE.md says what goes in it)');
  const into = path.resolve(opts.into || '.');
  const dir = path.join(into, 'captures');
  if (fs.existsSync(dir)) {
    const old = fs.readdirSync(dir).filter((f) => /^CAP-\d{3}\.png$/i.test(f) || f === 'walkthrough.md' || f === 'captures.csv');
    if (old.length) throw new Error(path.relative(process.cwd(), dir) + ' already holds a capture set (' + old.slice(0, 3).join(', ') + (old.length > 3 ? ', ...' : '') + '). Nothing is overwritten: move that folder aside (into _suggested-trash/ or a dated name) or point --into somewhere else.');
  }
  const doc = readDocx(file);
  const source = path.basename(file);

  /* walk the paragraphs; a heading opens a step, a picture is a capture of the step it sits under */
  const pictures = [], lines = ['<!-- ' + source + ', read in order by vkit capture. Each picture is a capture; look at every one. -->', ''];
  const steps = [];
  let step = null;
  const seen = new Map();   /* media name -> capture id, so a picture used twice in the document is one file */
  for (const p of doc.paragraphs) {
    if (p.heading && p.text) {
      step = { heading: p.text, level: p.heading, text: [], pictures: 0 };
      steps.push(step);
      lines.push('#'.repeat(Math.min(p.heading, 6)) + ' ' + p.text, '');
    } else if (p.text) {
      if (step) step.text.push(p.text);
      lines.push((p.list ? '- ' : '') + p.text.replace(/\n/g, '  \n'), '');
    }
    for (const name of p.images) {
      if (seen.has(name)) { lines.push('![' + seen.get(name) + ', again](' + seen.get(name) + '.png)', ''); continue; }
      const data = doc.media(name);
      if (!data) continue;
      const id = 'CAP-' + String(pictures.length + 1).padStart(3, '0');
      seen.set(name, id);
      const kind = kindOf(data), size = pngSize(data);
      pictures.push({ id, file: id + '.png', data, kind, width: size ? size.width : 0, height: size ? size.height : 0, step: step ? step.heading : '', stepRef: step, textBefore: step ? step.text.length : 0, source: name, hash: crypto.createHash('sha256').update(data).digest('hex') });
      if (step) step.pictures++;
      lines.push('![' + id + '](' + id + '.png)', '');
    }
  }

  for (const c of pictures) c.text = c.stepRef ? c.stepRef.text : [];   /* the whole step's text, the lines after the picture included: a note about what a still cannot show comes after it */

  /* the shape checks */
  const rows = [];
  const byHash = new Map();
  for (const c of pictures) {
    const row = (what, result, measured) => rows.push({ id: c.id, what, result, measured });
    if (c.kind !== 'PNG') row('format', 'fail', c.kind + '; a PNG is wanted (insert the screenshot file, do not paste it)');
    else {
      const key = c.width + 'x' + c.height;
      c.scale = SIZES[key] || 0;
      if (SIZES[key]) row('size', 'pass', key + (c.scale === 2 ? ' (a 2x capture)' : ''));
      else if (c.width >= 1920 && Math.abs(c.width / c.height - 16 / 9) < 0.01) row('size', 'warn', key + '; 16:9 but not 1920x1080 or 3840x2160, so fidelity compares at a scale');
      else row('size', 'fail', key + '; 1920x1080 wanted (the page only, no browser bar; 3840x2160 from a Retina screen is fine)');
    }
    if (byHash.has(c.hash)) row('unique', 'fail', 'the same picture as ' + byHash.get(c.hash)); else byHash.set(c.hash, c.id);
    if (!c.step) row('step', 'fail', 'no step heading above it');
    else if (!c.textBefore) row('step', 'fail', 'under "' + c.step.slice(0, 60) + '" with no line saying what was done before it');
    else row('step', 'pass', '"' + c.step.slice(0, 60) + '", ' + c.textBefore + ' line' + (c.textBefore === 1 ? '' : 's'));
  }
  if (!pictures.length) rows.push({ id: source, what: 'pictures', result: 'fail', measured: 'no pictures in the document' });
  const failures = rows.filter((r) => r.result === 'fail').length, warnings = rows.filter((r) => r.result === 'warn').length;

  /* write everything, failing or not, so a person can look */
  fs.mkdirSync(dir, { recursive: true });
  for (const c of pictures) fs.writeFileSync(path.join(dir, c.file), c.data);
  fs.writeFileSync(path.join(dir, 'walkthrough.md'), lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
  const csv = ['id,file,step,text,width,height,scale,captured_on,source'];
  for (const c of pictures) csv.push([c.id, c.file, c.step, c.text.join(' / '), c.width, c.height, c.scale || '', doc.modified, source].map(csvCell).join(','));
  fs.writeFileSync(path.join(dir, 'captures.csv'), csv.join('\n') + '\n');
  return { dir, source, pictures: pictures.map((c) => ({ id: c.id, file: c.file, step: c.step, width: c.width, height: c.height, scale: c.scale || 0, kind: c.kind })), steps: steps.map((s) => ({ heading: s.heading, lines: s.text.length, pictures: s.pictures })), rows, failures, warnings, captured_on: doc.modified, written: [path.join(dir, 'walkthrough.md'), path.join(dir, 'captures.csv')] };
}

function format(r) {
  const out = [];
  out.push(r.pictures.length + ' picture' + (r.pictures.length === 1 ? '' : 's') + ' from ' + r.source + ' into ' + path.relative(process.cwd(), r.dir) + '/ (' + r.steps.length + ' step' + (r.steps.length === 1 ? '' : 's') + (r.captured_on ? ', document dated ' + r.captured_on : '') + ')');
  for (const c of r.pictures) out.push('  ' + c.id + '  ' + (c.width ? c.width + 'x' + c.height : c.kind) + '  ' + (c.step || '(no step)'));
  const bad = r.rows.filter((x) => x.result !== 'pass');
  if (bad.length) { out.push(''); for (const x of bad) out.push('  ' + x.result.toUpperCase().padEnd(5) + x.id + ' ' + x.what + ': ' + x.measured); }
  out.push('');
  out.push((r.failures ? r.failures + ' failing row' + (r.failures === 1 ? '' : 's') : 'the shape is right') + (r.warnings ? ', ' + r.warnings + ' warning' + (r.warnings === 1 ? '' : 's') : '') + '. walkthrough.md and captures.csv written. Now look at every picture; the check reads sizes, not screens.');
  return out.join('\n');
}

module.exports = { capture, format, readDocx, pngSize, kindOf };
