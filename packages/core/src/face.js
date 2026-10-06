// Face: a typeface of our own, measured from a page where the product's face is loaded.
//
// A recreated screen has to set its text in a face that looks like the product's, and the
// product's font file is not ours to ship. The shapes of letters are facts about how the
// product looks; the font program is someone's property. So the kit makes its own program
// from its own renders: in the capture browser, where the real face is already loaded, every
// glyph we need is drawn on a canvas at 1000 px (one pixel per font unit), the drawing is
// traced to an outline, the advance widths, kerning, ascent, descent, x-height and cap height
// are measured from the page's own text measurement, and a font is assembled from those
// outlines and numbers with opentype.js. Nothing is read from the product's font file; the
// product's font name never appears in ours. The result is a face that sets the same text to
// the same widths, judged by rendering a sample line in both and counting the pixels that
// differ, which is written beside the font as its provenance.
//
//   face(name, { family, weights, into, sample }) -> { files, weights: [{weight, glyphs, kern, compare}], ... }
//
// The capture browser must be running (vkit shoot start) with a page open that loads the
// face; the family is refused by name when the page does not have it (a canvas falls back
// silently, so the fallback is measured and compared first).
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const shoot = require('./shoot');

const GLYPHS = (() => { const s = []; for (let c = 0x20; c <= 0x7e; c++) s.push(String.fromCharCode(c)); return s.concat(['–', '—', '‘', '’', '“', '”', '•', '…', '©', '®', '°', '×', '→', '←', '↑', '↓']); })();
const KERN_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;-()"\'/'.split('');

/* runs in the page: measure the face and draw each glyph at 1000 px */
function inPage(arg) {
  const family = arg.family, weight = arg.weight, glyphs = arg.glyphs, kernSet = arg.kernSet;
  const font = weight + ' 1000px ' + (/^[a-z-]+$/i.test(family) && ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(family) ? family : JSON.stringify(family));
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 1500;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font; ctx.fontKerning = 'normal'; ctx.textBaseline = 'alphabetic';
  const probe = (f) => { ctx.font = f; return ['H', 'x', 'm', 'W', 'i', '0'].map((c) => Math.round(ctx.measureText(c).width * 100) / 100).join(','); };
  const own = probe(font), fallbackSerif = probe(weight + ' 1000px serif'), fallbackSans = probe(weight + ' 1000px sans-serif');
  const loaded = document.fonts ? document.fonts.check(font) : null;
  ctx.font = font;
  const m = (s) => ctx.measureText(s);
  const H = m('H'), x = m('x'), M = m('M');
  const metrics = { ascent: Math.round(H.fontBoundingBoxAscent), descent: Math.round(H.fontBoundingBoxDescent), capHeight: Math.round(H.actualBoundingBoxAscent), xHeight: Math.round(x.actualBoundingBoxAscent), emWidth: Math.round(M.width) };
  const out = [];
  const originX = 300, baseline = 1100;
  for (const c of glyphs) {
    const mm = m(c);
    const adv = mm.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillText(c, originX, baseline);
    const left = Math.floor(originX - mm.actualBoundingBoxLeft) - 2, right = Math.ceil(originX + mm.actualBoundingBoxRight) + 2;
    const top = Math.floor(baseline - mm.actualBoundingBoxAscent) - 2, bottom = Math.ceil(baseline + mm.actualBoundingBoxDescent) + 2;
    const blank = !(right > left + 4 && bottom > top + 4) || (mm.actualBoundingBoxLeft === 0 && mm.actualBoundingBoxRight === 0);
    let png = null, box = null;
    if (!blank) {
      const w = right - left, h = bottom - top;
      const cut = document.createElement('canvas'); cut.width = w; cut.height = h;
      cut.getContext('2d').putImageData(ctx.getImageData(Math.max(0, left), Math.max(0, top), w, h), 0, 0);
      png = cut.toDataURL('image/png').split(',')[1];
      box = { left: Math.max(0, left) - originX, top: baseline - Math.max(0, top), w, h };   /* left in font units from the origin; top as height above the baseline */
    }
    out.push({ c, code: c.codePointAt(0), advance: Math.round(adv * 10) / 10, png, box });
  }
  /* kerning: the width of a pair against the sum of its parts */
  const kern = [];
  const single = {}; for (const c of kernSet) single[c] = m(c).width;
  for (const a of kernSet) for (const b of kernSet) { const d = m(a + b).width - single[a] - single[b]; if (Math.abs(d) >= 1) kern.push([a.codePointAt(0), b.codePointAt(0), Math.round(d)]); }
  const faces = document.fonts ? [...document.fonts].filter((f) => f.family.replace(/"/g, '') === family).map((f) => ({ weight: f.weight, style: f.style, status: f.status })) : [];
  return { font, loaded, own, fallbackSerif, fallbackSans, metrics, glyphs: out, kern, faces };
}

/* in the page: set a sample in the product's face and in ours, count the pixels that differ */
function compareInPage(arg) {
  return new Promise((resolve) => {
    const bytes = Uint8Array.from(atob(arg.otf), (ch) => ch.charCodeAt(0));
    const ff = new FontFace(arg.ourName, bytes.buffer, { weight: String(arg.weight) });
    ff.load().then((f) => {
      document.fonts.add(f);
      const fam = (family) => (['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(family) ? family : JSON.stringify(family));
      const draw = (family) => {
        const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 60;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.font = arg.weight + ' ' + arg.size + 'px ' + fam(family); ctx.fontKerning = 'normal'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000';
        ctx.fillText(arg.sample, 10, 40);
        return { data: ctx.getImageData(0, 0, cv.width, cv.height).data, width: ctx.measureText(arg.sample).width };
      };
      const a = draw(arg.family), b = draw(arg.ourName);
      /* at reading size: the mean tone difference over the pixels either face inks (edge pixels shift by fractions of a pixel, so a count of differing pixels says little) */
      let ink = 0, sum = 0;
      for (let i = 3; i < a.data.length; i += 4) { const pa = a.data[i], pb = b.data[i]; if (pa > 40 || pb > 40) { ink++; sum += Math.abs(pa - pb); } }
      /* the shapes: each glyph alone at 200 px, the pixels that differ by more than a quarter tone over the pixels inked */
      let shapeInk = 0, shapeDiff = 0;
      const gc = document.createElement('canvas'); gc.width = 260; gc.height = 300; const g = gc.getContext('2d', { willReadFrequently: true });
      const glyphOf = (family, ch) => { g.clearRect(0, 0, 260, 300); g.font = arg.weight + ' 200px ' + fam(family); g.textBaseline = 'alphabetic'; g.fillStyle = '#000'; g.fillText(ch, 20, 220); return g.getImageData(0, 0, 260, 300).data; };
      for (const ch of arg.shapes) { const pa = glyphOf(arg.family, ch), pb = glyphOf(arg.ourName, ch); for (let i = 3; i < pa.length; i += 4) { if (pa[i] > 40 || pb[i] > 40) shapeInk++; if (Math.abs(pa[i] - pb[i]) > 64) shapeDiff++; } }
      resolve({ size: arg.size, inkPixels: ink, meanTone: ink ? Math.round(sum / ink / 255 * 1000) / 1000 : 0, widthTheirs: Math.round(a.width * 100) / 100, widthOurs: Math.round(b.width * 100) / 100, widthError: a.width ? Math.round(Math.abs(b.width - a.width) / a.width * 10000) / 10000 : 0, shapeDiffer: shapeInk ? Math.round(shapeDiff / shapeInk * 1000) / 1000 : 0 });
    }).catch((e) => resolve({ error: e.message }));
  });
}

/* trace a 1-bit image to closed outlines: every pixel edge between ink and not-ink is a
   segment, the segments are linked into loops, and each loop is simplified */
function trace(bits, w, h, tol) {
  const ink = (x, y) => x >= 0 && y >= 0 && x < w && y < h && bits[y * w + x] === 1;
  const segs = new Map();   /* "x,y" -> [[x2,y2], ...] directed so ink is on the right in y-down coordinates */
  const add = (x1, y1, x2, y2) => { const k = x1 + ',' + y1; if (!segs.has(k)) segs.set(k, []); segs.get(k).push([x2, y2]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!ink(x, y)) continue;
    if (!ink(x, y - 1)) add(x, y, x + 1, y);
    if (!ink(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!ink(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!ink(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const [k, list] of segs) {
    while (list.length) {
      const start = k.split(',').map(Number);
      const loop = [start];
      let cur = list.pop(), guard = 0;
      while (guard++ < 200000) {
        loop.push(cur);
        const nk = cur[0] + ',' + cur[1];
        if (nk === k) break;
        const next = segs.get(nk);
        if (!next || !next.length) break;
        /* at a diagonal touch two ways out exist; prefer the one that keeps turning right, which keeps regions separate */
        let pick = 0;
        if (next.length > 1) { const prev = loop[loop.length - 2]; const dx = cur[0] - prev[0], dy = cur[1] - prev[1]; for (let i = 0; i < next.length; i++) { const ex = next[i][0] - cur[0], ey = next[i][1] - cur[1]; if (dx * ey - dy * ex > 0) pick = i; } }
        cur = next.splice(pick, 1)[0];
      }
      loop.pop();
      if (loop.length >= 4) loops.push(simplifyClosed(loop, tol));
    }
  }
  return loops;
}

function simplifyClosed(pts, tol) {
  if (pts.length < 6) return pts;
  let far = 0, best = -1;
  for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > best) { best = d; far = i; } }
  const a = rdp(pts.slice(0, far + 1), tol), b = rdp(pts.slice(far).concat([pts[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}
function rdp(pts, tol) {
  if (pts.length <= 2) return pts;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  let maxD = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len; if (d > maxD) { maxD = d; idx = i; } }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, idx + 1), tol).slice(0, -1).concat(rdp(pts.slice(idx), tol));
}

/* opentype.js reads kerning but does not write it, so the font is rebuilt with a GPOS table of
   our measured pairs (one 'kern' feature, one pair-adjustment lookup, format 1, X advance only):
   the sfnt directory is read, the table added, offsets and checksums recomputed, and the head
   table's adjustment set so the whole font sums as the spec asks. A GPOS table is what the
   browsers' shaper reads; a legacy kern table is not honoured for a CFF font. */
function gposKern(pairs) {
  const byLeft = new Map();
  for (const [l, r, v] of pairs) { if (!byLeft.has(l)) byLeft.set(l, []); byLeft.get(l).push([r, v]); }
  const lefts = [...byLeft.keys()].sort((a, b) => a - b);
  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n & 0xffff, 0); return b; };
  const i16 = (n) => { const b = Buffer.alloc(2); b.writeInt16BE(Math.max(-32768, Math.min(32767, n)), 0); return b; };
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0, 0); return b; };
  /* the pair sets, then the coverage, then the PairPos header that points at them */
  const pairSets = lefts.map((l) => { const recs = byLeft.get(l).sort((a, b) => a[0] - b[0]); return Buffer.concat([u16(recs.length), ...recs.map(([r, v]) => Buffer.concat([u16(r), i16(v)]))]); });
  const coverage = Buffer.concat([u16(1), u16(lefts.length), ...lefts.map(u16)]);
  const headerLen = 10 + 2 * lefts.length;
  const coverageOff = headerLen;
  let off = coverageOff + coverage.length;
  const setOffs = pairSets.map((ps) => { const o = off; off += ps.length; return o; });
  const pairPos = Buffer.concat([u16(1), u16(coverageOff), u16(0x0004), u16(0), u16(lefts.length), ...setOffs.map(u16), coverage, ...pairSets]);
  const lookup = Buffer.concat([u16(2), u16(0), u16(1), u16(8), pairPos]);          /* type 2, flags 0, one subtable at offset 8 */
  const lookupList = Buffer.concat([u16(1), u16(4), lookup]);
  const feature = Buffer.concat([u16(0), u16(1), u16(0)]);                           /* no params, one lookup, index 0 */
  const featureList = Buffer.concat([u16(1), Buffer.from('kern', 'ascii'), u16(8), feature]);
  const langSys = Buffer.concat([u16(0), u16(0xffff), u16(1), u16(0)]);             /* no reorder, no required feature, feature 0 */
  const script = Buffer.concat([u16(4), u16(0), langSys]);                           /* default lang sys at 4, no others */
  const scriptList = Buffer.concat([u16(1), Buffer.from('DFLT', 'ascii'), u16(8), script]);
  const head = 10;
  return Buffer.concat([u32(0x00010000), u16(head), u16(head + scriptList.length), u16(head + scriptList.length + featureList.length), scriptList, featureList, lookupList]);
}

function withTable(otf, tag, data) {
  const numTables = otf.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < numTables; i++) { const o = 12 + i * 16; const t = otf.toString('ascii', o, o + 4), off = otf.readUInt32BE(o + 8), len = otf.readUInt32BE(o + 12); if (t !== tag) tables.push({ tag: t, data: Buffer.from(otf.subarray(off, off + len)) }); }
  tables.push({ tag, data });
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const headT = tables.find((t) => t.tag === 'head'); if (headT) headT.data.writeUInt32BE(0, 8);
  const pad = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);
  const sum = (b) => { const p = pad(b); let x = 0; for (let i = 0; i < p.length; i += 4) x = (x + p.readUInt32BE(i)) >>> 0; return x; };
  const count = tables.length;
  let es = 0; while ((1 << (es + 1)) <= count) es++;
  const header = Buffer.alloc(12); otf.copy(header, 0, 0, 4); header.writeUInt16BE(count, 4); header.writeUInt16BE((1 << es) * 16, 6); header.writeUInt16BE(es, 8); header.writeUInt16BE(count * 16 - (1 << es) * 16, 10);
  const dir = Buffer.alloc(count * 16);
  let offset = 12 + count * 16;
  const parts = [];
  tables.forEach((t, i) => { dir.write(t.tag, i * 16, 4, 'ascii'); dir.writeUInt32BE(sum(t.data), i * 16 + 4); dir.writeUInt32BE(offset, i * 16 + 8); dir.writeUInt32BE(t.data.length, i * 16 + 12); const p = pad(t.data); parts.push(p); offset += p.length; });
  const out = Buffer.concat([header, dir, ...parts]);
  if (headT) { const headOff = dir.readUInt32BE(tables.indexOf(headT) * 16 + 8); out.writeUInt32BE((0xB1B0AFBA - sum(out)) >>> 0, headOff + 8); }
  return out;
}
function withKernTable(otf, pairs) { return pairs.length ? withTable(otf, 'GPOS', gposKern(pairs)) : otf; }

function bitsFromPng(b64) {
  const png = PNG.sync.read(Buffer.from(b64, 'base64'));
  const bits = new Uint8Array(png.width * png.height);
  for (let i = 0; i < png.width * png.height; i++) bits[i] = png.data[i * 4 + 3] >= 128 ? 1 : 0;   /* the alpha of black text on a clear canvas */
  return { bits, w: png.width, h: png.height };
}

async function face(name, opts) {
  opts = opts || {};
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('vkit face <name> names our face: lowercase letters, digits and hyphens (never the product\'s own font name).');
  if (!opts.family) throw new Error('--family "<the css family the page uses>" is required');
  const weights = (opts.weights || [400, 700]).map(Number);
  const into = path.resolve(opts.into || '.');
  const dir = path.join(into, 'faces');
  const s = shoot.readSession(opts);
  if (!s || !(() => { try { process.kill(s.pid, 0); return true; } catch (e) { return false; } })()) throw new Error('no capture browser is running. vkit shoot start, open a page that loads the face, then vkit face.');
  const opentype = require('opentype.js');
  const c = await shoot.connect(s.port);
  const result = { name, family: opts.family, page: c.page.url(), weights: [], files: [] };
  try {
    fs.mkdirSync(dir, { recursive: true });
    for (const weight of weights) {
      const read = await c.page.evaluate(inPage, { family: opts.family, weight, glyphs: GLYPHS, kernSet: KERN_SET });
      const generic = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(opts.family);
      if (!generic && read.own === read.fallbackSerif) throw new Error('the page does not have "' + opts.family + '" at weight ' + weight + ' (a canvas set in it measures the same as the fallback). Open a page where the face is loaded, or check the family name; document.fonts lists: ' + (read.faces.length ? read.faces.map((f) => f.weight + ' ' + f.style + ' ' + f.status).join(', ') : 'none by that name'));
      const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: Math.round(read.metrics.emWidth / 2), path: new opentype.Path() })];
      let traced = 0, points = 0;
      for (const g of read.glyphs) {
        const p = new opentype.Path();
        if (g.png) {
          const { bits, w, h } = bitsFromPng(g.png);
          const loops = trace(bits, w, h, opts.tolerance == null ? 1.2 : opts.tolerance);
          for (const loop of loops) {
            if (loop.length < 3) continue;
            const fx = (pt) => Math.round(g.box.left + pt[0]), fy = (pt) => Math.round(g.box.top - pt[1]);
            p.moveTo(fx(loop[0]), fy(loop[0]));
            for (let i = 1; i < loop.length; i++) p.lineTo(fx(loop[i]), fy(loop[i]));
            p.close();
            points += loop.length;
          }
          traced++;
        }
        glyphs.push(new opentype.Glyph({ name: g.code === 32 ? 'space' : 'uni' + g.code.toString(16).toUpperCase().padStart(4, '0'), unicode: g.code, advanceWidth: Math.round(g.advance), path: p }));
      }
      const styleName = weight >= 700 ? 'Bold' : weight >= 600 ? 'SemiBold' : weight >= 500 ? 'Medium' : weight <= 300 ? 'Light' : 'Regular';
      const font = new opentype.Font({ familyName: name, styleName, unitsPerEm: 1000, ascender: read.metrics.ascent || 900, descender: -(read.metrics.descent || 200), glyphs });
      const byCode = {}; glyphs.forEach((gl, i) => { if (gl.unicode != null) byCode[gl.unicode] = i; });   /* the index is the order the glyphs were given */
      const pairs = [];
      for (const [a, b, v] of read.kern) if (byCode[a] != null && byCode[b] != null) pairs.push([byCode[a], byCode[b], v]);
      const buf = withKernTable(Buffer.from(font.toArrayBuffer()), pairs);
      const file = path.join(dir, name + '-' + weight + '.otf');
      fs.writeFileSync(file, buf);
      result.files.push(file);
      const compare = [];
      for (const size of [14, 16, 20]) compare.push(await c.page.evaluate(compareInPage, { otf: buf.toString('base64'), ourName: name + '-check-' + weight + '-' + size, family: opts.family, weight, size, sample: opts.sample || 'Create bucket: General purpose buckets (0) in US East (N. Virginia) us-east-1, 2026', shapes: 'HOagxkRS38&@'.split('') }));
      result.weights.push({ weight, styleName, glyphs: traced, points, kern: pairs.length, metrics: read.metrics, faces: read.faces, compare, bytes: buf.length });
    }
    /* the css and the provenance */
    const css = ['/* ' + name + ': a face of our own, measured from renders of the page\'s "' + opts.family + '" (see ' + name + '.md). Not the product\'s font program. */']
      .concat(result.weights.map((w) => '@font-face{font-family:"' + name + '";font-weight:' + w.weight + ';font-style:normal;src:url("' + name + '-' + w.weight + '.otf") format("opentype");}')).join('\n') + '\n';
    fs.writeFileSync(path.join(dir, name + '.css'), css);
    const md = ['# ' + name, '', 'A typeface of our own, made ' + new Date().toISOString().slice(0, 10) + ' by `vkit face` from renders of the face a page calls "' + opts.family + '" (' + (() => { try { return new URL(result.page).host; } catch (e) { return result.page; } })() + '). Each glyph was drawn on a canvas at 1000 px by the browser, traced to an outline, and its advance width, the kerning of common pairs, the ascent, descent, x-height and cap height were measured from the page\'s own text measurement. Nothing was read from the product\'s font file, and the product\'s font name is not used here. The letterforms are a record of how the product looks; the font program is ours. It exists to set recreated screens of that product and for nothing else.', '']
      .concat(result.weights.map((w) => '## weight ' + w.weight + ' (' + w.styleName + ')\n\n' + w.glyphs + ' glyphs traced, ' + w.points + ' outline points, ' + w.kern + ' kerning pairs; ascent ' + w.metrics.ascent + ', descent ' + w.metrics.descent + ', cap height ' + w.metrics.capHeight + ', x-height ' + w.metrics.xHeight + ' (units per em 1000). Sample line set in both faces: ' + w.compare.map((cmp) => cmp.error ? 'error ' + cmp.error : cmp.size + ' px: line width ' + cmp.widthTheirs + ' against ' + cmp.widthOurs + ' (' + (cmp.widthError * 100).toFixed(2) + ' percent), mean tone difference ' + Math.round(cmp.meanTone * 100) + ' percent').join('; ') + '. Shapes at 200 px (H O a g x k R S 3 8 & @): ' + Math.round((w.compare[0] && w.compare[0].shapeDiffer || 0) * 1000) / 10 + ' percent of inked pixels differ.'))
      .join('\n') + '\n';
    fs.writeFileSync(path.join(dir, name + '.md'), md);
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify({ name, family: opts.family, page: result.page, made: new Date().toISOString(), weights: result.weights.map((w) => ({ weight: w.weight, glyphs: w.glyphs, kern: w.kern, metrics: w.metrics, compare: w.compare })) }, null, 2) + '\n');
    result.files.push(path.join(dir, name + '.css'), path.join(dir, name + '.md'), path.join(dir, name + '.json'));
    result.dir = dir;
    return result;
  } finally { await c.close(); }
}

function format(r) {
  const out = [r.name + ' from "' + r.family + '" on ' + r.page.slice(0, 60) + ' into ' + path.relative(process.cwd(), r.dir) + '/'];
  for (const w of r.weights) out.push('  ' + w.weight + ' ' + w.styleName + ': ' + w.glyphs + ' glyphs, ' + w.kern + ' kerning pairs, ' + (w.bytes / 1024).toFixed(0) + ' KB; cap ' + w.metrics.capHeight + ', x ' + w.metrics.xHeight + '; shapes ' + Math.round((w.compare[0] && w.compare[0].shapeDiffer || 0) * 1000) / 10 + '% differ at 200px; ' + w.compare.map((c) => c.error ? 'error' : c.size + 'px width ' + c.widthTheirs + ' vs ' + c.widthOurs + ' (' + (c.widthError * 100).toFixed(2) + '%), tone ' + Math.round(c.meanTone * 100) + '%').join(', '));
  out.push('  ' + r.name + '.css, ' + r.name + '.md (provenance), ' + r.name + '.json');
  return out.join('\n');
}

module.exports = { face, format, trace, GLYPHS };
