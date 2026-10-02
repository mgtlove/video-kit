// check(videoDir, opts): is this video footage, and is it well made?
//
// Five groups, each a list of rows {id, rules, result, measured, threshold, where}:
//   footage      offline (no http(s) in the rig), deterministic (the stills twice,
//                two sessions, byte for byte), seekable (VK, parts, beats, clips)
//   seekCorrect  playback against seek at one moment per part (opts.quick skips)
//   craft        text floors, line length, title safe, accent share, flashing, still run,
//                sentence length, parts versus storyboard versus narration, captions
//   contrast     text against its effective background; strokes against what they sit on
//   fidelity     each app state that cites a capture, against the capture: a structural
//                similarity on a grey 480x270 reduction and a side-by-side image
// result is pass | fail | info | not measured. A measured rule that fails is a fail and
// the exit code is 1. The numbers come from rules.json, copied from video-reference by
// vkit sync-reference; this file never retypes a threshold. What is not measured says
// so and where the number lives, never silently passes.
//
// The teaching layer is measured; the recreated product screen (#mock) is not: its type
// and colours are the product's. Marks a page can carry: data-narration (text the voice
// depends on: 54 px floor, 72 px target), data-decor (text the voice never depends on: no
// floor), data-craft="ignore" (not footage).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PNG } = require('pngjs');
const render = require('./adapters/render');
const { loadRules } = require('./sync');
const { storyboardRows } = require('./render');
const apps = require('./apps');

/* ---------- small helpers ---------- */
function P(parts, i) { return parts.slice(0, i).reduce((a, b) => a + b, 0); }
function lum(r, g, b) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function ratio(a, b) { const la = lum(a[0], a[1], a[2]), lb = lum(b[0], b[1], b[2]); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
function rgbOf(s) {
  s = (s || '').trim();
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s); if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
  const h = /^#([0-9a-f]{3,8})$/i.exec(s); if (!h) return null;
  let x = h[1]; if (x.length === 3 || x.length === 4) x = x.split('').map((c) => c + c).join('');
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1];
}
function row(id, rules, result, measured, threshold, where) { return { id, rules, result, measured, threshold, where }; }
function words(s) { return (s.match(/[A-Za-z0-9'’]+/g) || []).length; }

/* ---------- the in-page measurement, serialised into the page ---------- */
function measureInPage(t) {
  var stage = document.getElementById('stage'), sr = stage.getBoundingClientRect();
  var cs = getComputedStyle(stage);
  var skipSel = '#mock, #ink, #cast, #pointer, #ring, #hud, #ui, [data-craft="ignore"]';
  function rgb(s) { var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; }
  function over(top, under) { var a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; }
  var stageBg = rgb(cs.backgroundColor) || [0, 0, 0, 1]; if (stageBg[3] < 1) stageBg = over(stageBg, [0, 0, 0, 1]);
  function background(el) {   /* what sits behind el: ancestors' backgrounds composited from the stage inward */
    var chain = [], n = el; while (n && n !== stage) { chain.unshift(n); n = n.parentElement; }
    var bg = stageBg;
    for (var i = 0; i < chain.length; i++) { var c = rgb(getComputedStyle(chain[i]).backgroundColor); if (c && c[3] > 0) bg = over(c, bg); }
    return bg;
  }
  function opacityOf(el) { var o = 1, n = el; while (n && n !== stage) { o *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; } return o; }
  var tokens = {}; ['--accent', '--hi', '--stroke', '--kind-a', '--kind-b', '--kind-c', '--ink', '--stage', '--muted', '--dim'].forEach(function (k) { tokens[k] = cs.getPropertyValue(k).trim(); });
  var texts = [];
  var all = stage.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.closest(skipSel)) continue;
    var own = ''; for (var k = 0; k < el.childNodes.length; k++) if (el.childNodes[k].nodeType === 3) own += el.childNodes[k].textContent;
    own = own.replace(/\s+/g, ' ').trim(); if (!own) continue;
    var r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    var op = opacityOf(el); if (op < 0.02) continue;
    var st = getComputedStyle(el);
    var scale = el.offsetWidth ? r.width / el.offsetWidth : 1;
    var fontPx = parseFloat(st.fontSize) * scale, lh = parseFloat(st.lineHeight); if (isNaN(lh)) lh = parseFloat(st.fontSize) * 1.2;
    var range = document.createRange(), lineTops = [];
    for (var c = 0; c < el.childNodes.length; c++) if (el.childNodes[c].nodeType === 3) { range.selectNodeContents(el.childNodes[c]); var rects = range.getClientRects(); for (var q = 0; q < rects.length; q++) { var top = Math.round(rects[q].top); var found = false; for (var z = 0; z < lineTops.length; z++) if (Math.abs(lineTops[z].top - top) < 3) { lineTops[z].w += rects[q].width; found = true; } if (!found) lineTops.push({ top: top, w: rects[q].width }); } }
    var totalW = 0; lineTops.forEach(function (l) { totalW += l.w; });
    var longest = 0; lineTops.forEach(function (l) { longest = Math.max(longest, Math.round(own.length * (totalW ? l.w / totalW : 1))); });
    texts.push({ text: own.slice(0, 60), id: el.id || '', tag: el.tagName.toLowerCase(), cls: el.className && el.className.baseVal === undefined ? String(el.className) : '',
      fontPx: Math.round(fontPx * 10) / 10, weight: parseInt(st.fontWeight, 10) || 400, lineHeightRatio: Math.round(lh / parseFloat(st.fontSize) * 100) / 100,
      lines: lineTops.length || 1, longestLine: longest, transform: st.textTransform, letterSpacing: st.letterSpacing,
      box: { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top },
      color: rgb(st.color), bg: background(el), opacity: Math.round(op * 100) / 100,
      narration: !!el.closest('[data-narration]'), decor: !!el.closest('[data-decor]') });
  }
  var strokes = []; var paths = document.querySelectorAll('#ink path.on');
  for (var p = 0; p < paths.length; p++) { var pr = paths[p].getBoundingClientRect(); strokes.push({ kind: paths[p].getAttribute('data-stroke') || '', color: rgb(getComputedStyle(paths[p]).stroke), box: { l: pr.left - sr.left, t: pr.top - sr.top, r: pr.right - sr.left, b: pr.bottom - sr.top } }); }
  var cam = document.getElementById('cam'), m = /matrix\(([^)]+)\)/.exec(getComputedStyle(cam).transform), camScale = m ? parseFloat(m[1].split(',')[0]) : 1;
  return { t: t, stageBg: stageBg, tokens: tokens, texts: texts, strokes: strokes, camScale: camScale };
}

/* ---------- pixel work on a PNG buffer ---------- */
function decode(buf) { return PNG.sync.read(buf); }
function accentShare(png, accents, dist) {
  if (!accents.length) return 0;
  const d2 = dist * dist; let hit = 0; const n = png.width * png.height;
  for (let i = 0; i < png.data.length; i += 4) {
    for (const a of accents) { const dr = png.data[i] - a[0], dg = png.data[i + 1] - a[1], db = png.data[i + 2] - a[2]; if (dr * dr + dg * dg + db * db <= d2) { hit++; break; } }
  }
  return hit / n;
}
function meanLuminance(png) { let s = 0; const n = png.width * png.height; for (let i = 0; i < png.data.length; i += 4) s += 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]; return s / n / 255; }
// strokeContrast: the stroke colour against the pixels in its box that are not the stroke (what it sits on)
function strokeContrast(png, s) {
  const box = s.box, col = s.color; if (!col) return null;
  let r = 0, g = 0, b = 0, n = 0;
  const x0 = Math.max(0, Math.floor(box.l)), x1 = Math.min(png.width - 1, Math.ceil(box.r)), y0 = Math.max(0, Math.floor(box.t)), y1 = Math.min(png.height - 1, Math.ceil(box.b));
  for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
    const i = (y * png.width + x) * 4, dr = png.data[i] - col[0], dg = png.data[i + 1] - col[1], db = png.data[i + 2] - col[2];
    if (dr * dr + dg * dg + db * db > 60 * 60) { r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++; }
  }
  if (!n) return null;
  return ratio(col, [r / n, g / n, b / n]);
}

/* ---------- ffmpeg helpers for fidelity ---------- */
function ff(args, input) {
  const r = spawnSync(process.env.FFMPEG || 'ffmpeg', args, { input, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr || '').toString().trim().split('\n').slice(-3).join(' '));
  return r.stdout;
}
const GREY = { w: 960, h: 540, minVar: 4 };
function grey(pngBuf) { return ff(['-v', 'error', '-i', '-', '-vf', 'scale=' + GREY.w + ':' + GREY.h + ':flags=area,format=gray', '-f', 'rawvideo', '-'], pngBuf); }
function greyFile(file) { return ff(['-v', 'error', '-i', file, '-vf', 'scale=' + GREY.w + ':' + GREY.h + ':flags=area,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-']); }
// ssim(a, b): mean structural similarity over 8x8 windows of two grey buffers,
// counting only windows where either image has structure (variance at least
// minVar); flat ground scores 1.0 whatever is done to it and would drown the
// text and edges that fidelity is about. Returns the score and the coverage.
function ssim(a, b, w, h, minVar) {
  w = w || GREY.w; h = h || GREY.h; minVar = minVar == null ? GREY.minVar : minVar;
  const C1 = Math.pow(0.01 * 255, 2), C2 = Math.pow(0.03 * 255, 2);
  let total = 0, used = 0, all = 0;
  for (let y = 0; y + 8 <= h; y += 4) for (let x = 0; x + 8 <= w; x += 4) {
    let ma = 0, mb = 0; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + x + i; ma += a[k]; mb += b[k]; } ma /= 64; mb /= 64;
    let va = 0, vb = 0, cov = 0; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + x + i; va += (a[k] - ma) * (a[k] - ma); vb += (b[k] - mb) * (b[k] - mb); cov += (a[k] - ma) * (b[k] - mb); } va /= 63; vb /= 63; cov /= 63;
    all++; if (Math.max(va, vb) < minVar) continue;
    used++; total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
  }
  return { score: used ? total / used : 1, used, all };
}

/* ---------- the check ---------- */
async function check(videoDir, opts) {
  opts = opts || {};
  const dir = path.resolve(videoDir), rig = path.join(dir, 'rig'), outDir = path.join(dir, 'out');
  if (!fs.existsSync(path.join(dir, 'video.json'))) throw new Error(dir + ' is not a video folder (no video.json)');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'video.json'), 'utf8'));
  const rules = loadRules();
  const tone = (meta.menu && meta.menu.tone && meta.menu.tone.value) || 'formal';
  const report = { name: meta.name || path.basename(dir), checked_on: new Date().toISOString(), engine: '', tone, quick: !!opts.quick, groups: {}, failures: 0 };
  const G = (name) => (report.groups[name] = report.groups[name] || []);
  const add = (group, r) => { G(group).push(r); if (r.result === 'fail') report.failures++; return r; };

  // ---- footage: offline ----
  const files = ['index.html', 'theme.css', 'engine/rig.css', 'engine/rig.js', 'app/tokens.css', 'app/screen.css', 'app/states.js'].map((f) => path.join(rig, f)).filter((f) => fs.existsSync(f));
  const online = [];
  for (const f of files) { const txt = fs.readFileSync(f, 'utf8'); const m = txt.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+|url\(\s*["']?https?:\/\/[^)"']+|@import\s+["']?https?:\/\/[^"')]+/g); if (m) online.push(path.relative(dir, f) + ': ' + m[0].slice(0, 80)); }
  add('footage', row('offline', [], online.length ? 'fail' : 'pass', online.length ? online.join('; ') : 'no http(s) reference in the rig', 'none', 'rig/'));

  // ---- footage: seekable ----
  const info = await render.info(rig, opts);
  report.engine = info.version;
  const parts = info.parts, total = info.total, beats = info.beats;
  add('footage', row('seekable', [], parts.length && total > 0 && beats.length ? 'pass' : 'fail', 'VK ' + info.version + ', ' + parts.length + ' parts, ' + total.toFixed(2) + ' s, ' + beats.length + ' beats', 'VK present, parts and beats', 'rig/index.html'));
  const voice = path.join(dir, 'voice');
  if (fs.existsSync(voice)) {
    const clips = parts.map((_, i) => ['.wav', '.mp3', '.m4a', '.flac', '.ogg'].map((e) => path.join(voice, 'part-' + (i + 1) + e)).find((f) => fs.existsSync(f)));
    const missing = clips.map((c, i) => c ? null : i + 1).filter(Boolean);
    const probe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' }).status === 0;
    if (missing.length) add('footage', row('clips', [], 'fail', 'no clip for part ' + missing.join(', '), 'one clip per part', 'voice/'));
    else if (!probe) add('footage', row('clips', [], 'not measured', 'ffprobe not found; clip lengths not compared with PARTS', 'within 0.05 s', 'voice/'));
    else {
      const off = [];
      clips.forEach((c, i) => { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', c], { encoding: 'utf8' }); const d = parseFloat(r.stdout); if (Math.abs(d - parts[i]) > 0.05) off.push('part ' + (i + 1) + ': clip ' + d.toFixed(2) + ' s, PARTS ' + parts[i]); });
      add('footage', row('clips', [], off.length ? 'fail' : 'pass', off.length ? off.join('; ') : 'every clip matches its PARTS entry within 0.05 s', 'within 0.05 s', 'voice/, rig/index.html PARTS'));
    }
  } else add('footage', row('clips', [], 'info', 'no voice/ folder; PARTS are estimates until vkit measure', 'one clip per part', 'voice/'));

  // ---- the stills, with measurements; then the same stills again for determinism ----
  const starts = parts.map((_, k) => P(parts, k));
  const times = [...new Set([...starts, ...beats.map((t) => +(t + 0.3).toFixed(2))])].filter((t) => t <= total).sort((a, b) => a - b);
  const pass1 = await render.survey(rig, times, measureInPage, opts);
  const pass2 = await render.survey(rig, times, function () { return null; }, opts);
  let same = 0; for (let i = 0; i < pass1.length; i++) if (pass1[i].png.equals(pass2[i].png)) same++;
  add('footage', row('deterministic', [], same === pass1.length ? 'pass' : 'fail', same + ' of ' + pass1.length + ' stills identical across two browser sessions', 'all identical', 'rig/'));

  // ---- seek-correct ----
  if (opts.quick) add('seekCorrect', row('seek-equals-playback', [], 'not measured', 'skipped with --quick', '0.05 percent of pixels over 8 levels', 'npm test, or vkit check without --quick'));
  else {
    const moments = [];
    parts.forEach((_, i) => { const s = P(parts, i), e = s + parts[i]; const b = beats.find((t) => t >= s + 0.15 && t + 0.3 < e); if (b != null) moments.push(+(b + 0.3).toFixed(2)); });
    if (!moments.length) add('seekCorrect', row('seek-equals-playback', [], 'not measured', 'no beat to sample', '', ''));
    else {
      const played = await render.playbackFrames(rig, moments, path.join(outDir, 'check', 'playback'), opts);
      const sought = await render.frames(rig, played.map((p) => p.reached), path.join(outDir, 'check', 'seek'), opts);
      const bad = [];
      for (let i = 0; i < moments.length; i++) {
        const A = decode(fs.readFileSync(played[i].file)), B = decode(fs.readFileSync(sought[i]));
        let over = 0; for (let k = 0; k < A.data.length; k += 4) { const d = Math.max(Math.abs(A.data[k] - B.data[k]), Math.abs(A.data[k + 1] - B.data[k + 1]), Math.abs(A.data[k + 2] - B.data[k + 2])); if (d > 8) over++; }
        const share = over / (A.width * A.height); if (share > 0.0005) bad.push('t=' + moments[i] + ': ' + (share * 100).toFixed(3) + ' percent');
      }
      add('seekCorrect', row('seek-equals-playback', [], bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : moments.length + ' moments (' + moments.join(', ') + ' s) within tolerance', '0.05 percent of pixels over 8 levels', 'out/check/'));
    }
  }

  // ---- craft and contrast from the measured stills ----
  const T = rules.text, S = rules.safeArea.titleSafe, Cn = rules.contrast, Col = rules.colour, Mo = rules.motion, Pa = rules.pacing;
  const small = [], longLines = [], outside = [], lowContrast = [], weights = [], caps = [];
  let textCount = 0;
  for (const s of pass1) {
    for (const x of s.data.texts) {
      if (x.opacity < 0.9) continue;      /* mid-fade or hidden: judged when fully on */
      textCount++;
      const where = (x.id ? '#' + x.id : x.tag + (x.cls ? '.' + x.cls.split(' ')[0] : '')) + ' "' + x.text.slice(0, 28) + '" at ' + s.t + ' s';
      if (!x.decor) { const floor = T.readMinPx; if (x.fontPx < floor) small.push(where + ': ' + x.fontPx + ' px' + (x.narration ? ' (narration)' : '')); }
      if (x.longestLine > T.maxCharsPerLine) longLines.push(where + ': about ' + x.longestLine + ' characters');
      if (x.box.l < S.x - 0.5 || x.box.t < S.y - 0.5 || x.box.r > 1920 - S.x + 0.5 || x.box.b > 1080 - S.y + 0.5) outside.push(where + ': box ' + [x.box.l, x.box.t, x.box.r, x.box.b].map(Math.round).join(','));
      if (x.color && x.bg) { const large = x.fontPx >= Cn.largeTextPx || (x.fontPx >= Cn.largeTextBoldPx && x.weight >= 700); const need = large ? Cn.largeText : Cn.text; const rt = ratio(x.color, x.bg); if (rt < need) lowContrast.push(where + ': ' + rt.toFixed(2) + ':1, needs ' + need + ':1'); }
      if (!x.decor && x.weight < T.bodyWeight[0]) weights.push(where + ': weight ' + x.weight);
      if (x.transform === 'uppercase' && x.lines > 1) caps.push(where + ': all caps over ' + x.lines + ' lines');
    }
  }
  const uniq = (a) => [...new Set(a)];
  add('craft', row('text-floor', ['C-TYPE-3'], small.length ? 'fail' : 'pass', small.length ? uniq(small).slice(0, 8).join('; ') + (small.length > 8 ? '; and ' + (small.length - 8) + ' more' : '') : textCount + ' text boxes measured; all read text at ' + T.readMinPx + ' px or more (text marked data-decor is not held to the floor)', T.readMinPx + ' px on text the narration depends on', 'rig/index.html, theme.css'));
  add('craft', row('line-length', ['C-TYPE-4'], longLines.length ? 'fail' : 'pass', longLines.length ? uniq(longLines).slice(0, 6).join('; ') : 'no line over ' + T.maxCharsPerLine + ' characters (counted by line-box width, approximate)', T.maxCharsPerLine + ' characters', 'rig/index.html'));
  add('craft', row('title-safe', ['C-COMP-1', 'C-TYPE-12'], outside.length ? 'fail' : 'pass', outside.length ? uniq(outside).slice(0, 6).join('; ') : 'every text box inside ' + S.x + '/' + S.y + ' px', S.x + ' px sides, ' + S.y + ' px top and bottom', 'rig/'));
  add('craft', row('text-weight', ['C-TYPE-6'], weights.length ? 'fail' : 'pass', weights.length ? uniq(weights).slice(0, 6).join('; ') : 'no read text lighter than ' + T.bodyWeight[0], T.bodyWeight[0] + ' to ' + T.bodyWeight[1] + ' for body', 'theme.css'));
  add('craft', row('all-caps', ['C-TYPE-13'], caps.length ? 'fail' : 'pass', caps.length ? uniq(caps).join('; ') : 'all caps only on single-line labels', 'one rendered line', 'rig/'));
  add('contrast', row('text-contrast', ['C-COL-1', 'C-COMP-9', 'C-ACC-7'], lowContrast.length ? 'fail' : 'pass', lowContrast.length ? uniq(lowContrast).slice(0, 8).join('; ') : 'every text colour against its effective background at ' + Cn.text + ':1, or ' + Cn.largeText + ':1 at ' + Cn.largeTextPx + ' px and above', Cn.text + ':1 / ' + Cn.largeText + ':1', 'theme.css'));

  // accent share and stroke contrast, from the pixels
  const tok = pass1[0].data.tokens;
  /* an accent is a colour that is neither the ground nor the text colour; a kind colour that fell back to ink is not one */
  const far = (a, b) => { const d = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2); return d > Col.matchDistance; };
  const groundRgb = pass1[0].data.stageBg, inkRgb = rgbOf(tok['--ink']);
  const accents = ['--accent', '--hi', '--stroke', '--kind-a', '--kind-b', '--kind-c'].map((k) => rgbOf(tok[k]) || null).filter(Boolean).filter((c) => far(c, groundRgb) && (!inkRgb || far(c, inkRgb)));
  let worstShare = 0, worstAt = null; const strokeLow = []; let strokeCount = 0;
  for (const s of pass1) {
    const png = decode(s.png);
    const share = accentShare(png, accents, Col.matchDistance); if (share > worstShare) { worstShare = share; worstAt = s.t; }
    for (const st of s.data.strokes) { strokeCount++; const r = strokeContrast(png, st); if (r != null && r < Cn.nonText) strokeLow.push(st.kind + ' at ' + s.t + ' s: ' + r.toFixed(2) + ':1'); }
  }
  add('craft', row('accent-share', ['C-COMP-13', 'C-COL-4'], worstShare > Col.accentMaxShare ? 'fail' : 'pass', 'at most ' + (worstShare * 100).toFixed(1) + ' percent of the frame (at ' + worstAt + ' s), ' + accents.length + ' accent tokens matched within ' + Col.matchDistance, (Col.accentMaxShare * 100) + ' percent', 'theme.css'));
  add('contrast', row('stroke-contrast', ['C-COL-3', 'C-COMP-10', 'C-ACC-8'], strokeLow.length ? 'fail' : (strokeCount ? 'pass' : 'info'), strokeLow.length ? strokeLow.join('; ') : (strokeCount ? strokeCount + ' stroke(s) at ' + Cn.nonText + ':1 or better against what they sit on' : 'no strokes on the sampled stills'), Cn.nonText + ':1', 'theme.css --stroke, the screen behind it'));

  // ---- motion: flashing and the longest still run ----
  const maxStill = Mo.maxStillSeconds[tone] != null ? Mo.maxStillSeconds[tone] : Mo.maxStillSeconds.full;
  if (opts.quick) {
    let gap = 0, gapAt = 0; const marks = [...new Set([0, ...beats, total])].sort((a, b) => a - b);
    for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > gap) { gap = marks[i] - marks[i - 1]; gapAt = marks[i - 1]; }
    add('craft', row('still-run', ['C-PACE-7'], gap > maxStill ? 'fail' : 'pass', 'longest gap between beats ' + gap.toFixed(1) + ' s from ' + gapAt.toFixed(1) + ' s (by beats, --quick; the full check compares frames)', maxStill + ' s (' + tone + ')', 'rig/index.html timeline'));
    add('craft', row('flashing', ['C-ACC-11'], 'not measured', 'skipped with --quick; the full check samples at ' + Mo.sampleFps + ' fps', Mo.maxFlashesPerSecond + ' per second at ' + (Mo.flashLuminanceDelta * 100) + ' percent', 'vkit check without --quick'));
  } else {
    const lums = [], runs = []; let prev = null, run = 0, bestRun = 0, bestAt = 0;
    const fps = Mo.sampleFps;
    await render.every(rig, fps, (buf, n, t) => { const png = decode(buf); lums.push(meanLuminance(png)); if (prev && buf.equals(prev)) { run++; } else { if (run > bestRun) { bestRun = run; bestAt = t - run / fps; } run = 0; } prev = buf; }, opts);
    if (run > bestRun) { bestRun = run; bestAt = total - run / fps; }
    const stillSec = bestRun / fps;
    add('craft', row('still-run', ['C-PACE-7'], stillSec > maxStill ? 'fail' : 'pass', 'longest run of identical frames ' + stillSec.toFixed(1) + ' s from ' + bestAt.toFixed(1) + ' s, at ' + fps + ' fps', maxStill + ' s (' + tone + ')', 'rig/index.html timeline'));
    /* a flash is a pair of opposing luminance changes of 10 percent or more (WCAG 2.3.1); a fade
       in one direction over several frames is one transition, not a flash */
    const trans = []; let dir = 0, acc = 0, startAt = 0;
    for (let i = 1; i < lums.length; i++) {
      const d = lums[i] - lums[i - 1], sgn = d > 0 ? 1 : d < 0 ? -1 : 0;
      if (sgn !== 0 && sgn === dir) acc += d;
      else { if (Math.abs(acc) >= Mo.flashLuminanceDelta) trans.push({ at: startAt, dir }); dir = sgn; acc = d; startAt = i; }
    }
    if (Math.abs(acc) >= Mo.flashLuminanceDelta) trans.push({ at: startAt, dir });
    const flashes = []; for (let i = 1; i < trans.length; i++) if (trans[i].dir === -trans[i - 1].dir) flashes.push(trans[i].at);
    let worst = 0; for (let i = 0; i < flashes.length; i++) { let c = 1; for (let j = i + 1; j < flashes.length && flashes[j] - flashes[i] < fps; j++) c++; worst = Math.max(worst, c); }
    add('craft', row('flashing', ['C-ACC-11'], worst > Mo.maxFlashesPerSecond ? 'fail' : 'pass', worst + ' flash(es) in any one second: a flash is a pair of opposing luminance changes of ' + (Mo.flashLuminanceDelta * 100) + ' percent or more (' + trans.length + ' such changes in the run, ' + flashes.length + ' reversals)', Mo.maxFlashesPerSecond + ' per second', 'rig/index.html timeline'));
  }

  // ---- pacing and words: storyboard, narration, parts, captions ----
  const rows = storyboardRows(dir, parts);
  const narration = parts.map((_, i) => { const f = path.join(dir, 'narration', 'part-' + (i + 1) + '.md'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : null; });
  const longSentences = []; narration.forEach((lines, i) => (lines || []).forEach((l) => { if (words(l) > Pa.maxWordsPerSentence) longSentences.push('part ' + (i + 1) + ': ' + words(l) + ' words'); }));
  add('craft', row('sentence-length', ['C-PACE-3', 'C-ACC-16'], narration.every((n) => n === null) ? 'not measured' : (longSentences.length ? 'fail' : 'pass'), narration.every((n) => n === null) ? 'no narration/part-N.md' : (longSentences.length ? longSentences.join('; ') : 'no sentence over ' + Pa.maxWordsPerSentence + ' words'), Pa.maxWordsPerSentence + ' words', 'narration/'));
  const mismatch = []; parts.forEach((_, i) => { const sb = rows.filter((r) => r.part === i + 1).length, na = narration[i] ? narration[i].length : null; if (na !== null && sb !== na) mismatch.push('part ' + (i + 1) + ': ' + sb + ' storyboard rows, ' + na + ' narration sentences'); });
  add('craft', row('sentences-match', ['C-PACE-5', 'C-ACC-2'], narration.every((n) => n === null) ? 'not measured' : (mismatch.length ? 'fail' : 'pass'), mismatch.length ? mismatch.join('; ') : rows.length + ' storyboard rows match the narration sentences part by part', 'one row per sentence', 'storyboard.md, narration/'));
  const measured = meta.parts && meta.parts.measured_on;
  if (!measured) add('craft', row('narration-rate', ['C-PACE-1', 'C-PACE-2'], 'not measured', 'PARTS are estimates until vkit measure writes the clip lengths', Pa.wordsPerMinute.join(' to ') + ' wpm, floor ' + Pa.wordsPerMinuteFloor, 'vkit measure (step 7)'));
  else { const slow = []; parts.forEach((sec, i) => { if (!narration[i]) return; const w = narration[i].reduce((a, l) => a + words(l), 0), wpm = w / (sec / 60); if (wpm < Pa.wordsPerMinuteFloor || wpm > Pa.wordsPerMinute[1]) slow.push('part ' + (i + 1) + ': ' + Math.round(wpm) + ' wpm'); }); add('craft', row('narration-rate', ['C-PACE-1', 'C-PACE-2'], slow.length ? 'fail' : 'pass', slow.length ? slow.join('; ') : 'every part within range', Pa.wordsPerMinute.join(' to ') + ' wpm', 'narration/, voice/')); }
  add('craft', row('video-length', ['C-PACE-10'], total > Pa.hardMaxVideoSeconds ? 'fail' : (total > Pa.maxVideoSeconds ? 'info' : 'pass'), total.toFixed(1) + ' s', 'under ' + Pa.maxVideoSeconds + ' s, hard ' + Pa.hardMaxVideoSeconds, 'rig/index.html PARTS'));
  const longParts = parts.map((s, i) => s > Pa.maxSceneSeconds ? 'part ' + (i + 1) + ': ' + s + ' s' : null).filter(Boolean);
  add('craft', row('part-length', ['C-PACE-9', 'C-PACE-11'], longParts.length ? 'info' : 'pass', longParts.length ? longParts.join('; ') + ' (a long part is a recorded decision)' : 'every part at most ' + Pa.maxSceneSeconds + ' s', Pa.maxSceneSeconds + ' s', 'rig/index.html PARTS'));
  const vtt = path.join(outDir, (meta.name || path.basename(dir)) + '.vtt');
  if (fs.existsSync(vtt)) {
    const cues = fs.readFileSync(vtt, 'utf8').split(/\n\n+/).filter((b) => /-->/.test(b)).map((b) => { const l = b.trim().split('\n'); const m = /(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)/.exec(l.find((x) => /-->/.test(x))); return { start: +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000, end: +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000, text: l.slice(l.findIndex((x) => /-->/.test(x)) + 1).join(' ').trim() }; });
    const bad = [];
    if (cues.length !== rows.length) bad.push(cues.length + ' cues, ' + rows.length + ' storyboard rows');
    rows.forEach((r, i) => { const c = cues[i]; if (!c) return; if (c.text !== r.text) bad.push('cue ' + (i + 1) + ' text differs'); const start = P(parts, r.part - 1) + r.start; if (Math.abs(c.start - start) > 0.2) bad.push('cue ' + (i + 1) + ' starts ' + c.start + ', beat ' + start); });
    const slowCues = cues.filter((c) => c.end - c.start < Pa.captionMinSeconds || (words(c.text) / ((c.end - c.start) / 60)) > Pa.captionMaxWpm).length;
    add('craft', row('captions', ['C-ACC-1', 'C-ACC-2', 'C-ACC-3'], bad.length ? 'fail' : 'pass', bad.length ? bad.join('; ') : cues.length + ' cues match the storyboard in count, text and start', 'one cue per sentence, text identical, start within 0.2 s', path.relative(dir, vtt)));
    add('craft', row('caption-rate', ['C-ACC-5', 'C-TYPE-8'], slowCues ? 'info' : 'pass', slowCues ? slowCues + ' cue(s) under ' + Pa.captionMinSeconds + ' s or over ' + Pa.captionMaxWpm + ' wpm (placeholder timing until the clips are measured)' : 'every cue at least ' + Pa.captionMinSeconds + ' s and at most ' + Pa.captionMaxWpm + ' wpm', Pa.captionMinSeconds + ' s, ' + Pa.captionMaxWpm + ' wpm', path.relative(dir, vtt)));
  } else add('craft', row('captions', ['C-ACC-1', 'C-ACC-2', 'C-ACC-3'], 'not measured', 'no ' + path.relative(dir, vtt) + ' yet; vkit render writes it', 'one cue per sentence', 'vkit render'));

  // ---- what the kit does not measure yet, said plainly ----
  add('craft', row('camera-holds', ['C-CAM-6', 'C-CAM-7', 'C-CAM-13'], 'not measured', 'hold after a move, settle before a cut, one move per sentence: the camera is in the timeline, not yet read by the checker', Mo.holdAfterMoveSeconds + ' s hold, ' + Mo.settleBeforeCutSeconds + ' s settle', 'docs/ROADMAP.md step 6 follow-up'));
  add('craft', row('band-and-rail', ['C-COMP-3', 'C-TYPE-1', 'C-TYPE-2', 'C-COMP-15'], 'info', 'not applicable: the kit has one full-frame layout and captions as a sidecar file, no rail and no burned-in band', '', 'rules.json _source'));

  // ---- fidelity: each state that cites a capture ----
  if (meta.app && meta.app.ref) {
    const manifest = apps.readManifest(path.join(rig, 'app'));
    const fidDir = path.join(outDir, 'fidelity'); fs.mkdirSync(fidDir, { recursive: true });
    for (const st of manifest) {
      if (!st.capture) { add('fidelity', row('state:' + st.id, ['C-COMP-16'], 'info', 'no capture cited; nothing to compare against', 'a capture per state', 'manifest.csv')); continue; }
      const cap = [path.join(meta.app.source || '', 'captures', st.capture), path.join(rig, 'app', 'captures', st.capture)].find((f) => fs.existsSync(f));
      if (!cap) { add('fidelity', row('state:' + st.id, ['C-COMP-16'], 'fail', 'capture ' + st.capture + ' not found beside the app', 'the cited file exists', 'captures/')); continue; }
      const shot = await render.shoot(rig, function (id) { var st = document.getElementById('stage'); window.VK.reset(); st.classList.add('snap'); window.fade(true); window.state(id); window.home(); void st.offsetHeight; st.classList.remove('snap'); }, st.id, opts);   /* snap after reset: reset drops the snap class when it finishes */
      const statePng = path.join(fidDir, st.id + '-state.png'); fs.writeFileSync(statePng, shot);
      const sim = ssim(grey(shot), greyFile(cap));
      const side = path.join(fidDir, st.id + '.png');
      ff(['-y', '-v', 'error', '-i', statePng, '-i', cap, '-filter_complex', '[1:v]scale=1920:1080[c];[0:v][c]hstack,scale=1920:-1', '-frames:v', '1', side]);
      const cover = (100 * sim.used / sim.all).toFixed(1);
      add('fidelity', row('state:' + st.id, ['C-COMP-16'], 'info', 'similarity ' + sim.score.toFixed(3) + ' against ' + st.capture + ' over ' + sim.used + ' structured windows (' + cover + ' percent of the screen has structure; 1.000 is identical; a few px of shift scores low, on purpose); look at ' + path.relative(dir, side), 'reported, not judged, until a dozen real captures have been looked at', path.relative(dir, side)));
      const last = G('fidelity')[G('fidelity').length - 1]; last.score = +sim.score.toFixed(4); last.coverage = +cover;
    }
    if (!manifest.length) add('fidelity', row('states', [], 'info', 'the app has no states', '', 'rig/app/manifest.csv'));
  } else add('fidelity', row('states', ['C-COMP-16'], 'info', 'an inline or no-screen video; fidelity applies to app states that cite captures', '', 'vkit new --app'));

  fs.mkdirSync(outDir, { recursive: true });
  const reportFile = path.join(outDir, 'check.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  report.file = reportFile;
  return report;
}

function format(report) {
  const lines = [];
  for (const [g, rows] of Object.entries(report.groups)) {
    lines.push(g);
    for (const r of rows) lines.push('  ' + (r.result === 'pass' ? 'pass ' : r.result === 'fail' ? 'FAIL ' : r.result === 'info' ? 'info ' : 'n/m  ') + r.id.padEnd(22) + ' ' + r.measured + (r.rules && r.rules.length ? '  [' + r.rules.join(' ') + ']' : ''));
  }
  lines.push((report.failures ? report.failures + ' failing' : 'nothing failing') + '. n/m means not measured yet; the row says where the number lives. Report: ' + path.relative(process.cwd(), report.file));
  return lines.join('\n');
}

module.exports = { check, format, ssim, measureInPage, accentShare, meanLuminance, ratio };
