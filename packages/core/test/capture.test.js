// Proof for roadmap step 9, capture by walkthrough document.
//   1. a walkthrough document (three steps, three pictures, one note, one picture used twice)
//      becomes a capture set: CAP-001 to CAP-003 in document order, bytes untouched, a
//      walkthrough.md with each picture in its place, a captures.csv with the step and its
//      text beside each picture; the shape check passes, with a 2x picture recorded as scale 2
//   2. a document with a 1280x720 picture, a JPEG, a repeat and a picture with no step fails
//      on exactly those rows, by picture id; a 2560x1440 picture warns; the files are still
//      written so a person can look
//   3. a second run into the same folder is refused by name; nothing is overwritten
//   4. no browser: with no PW_CHANNEL and no bundled browser, vkit frames stops in a moment
//      with a plain message instead of hanging or asking for a download
// No browser needed for 1 to 3. A few seconds.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { PNG } = require('pngjs');
const core = require('../src');
const { writeZip, readZip } = require('../src/zip');
const { KIT } = require('../src/new');

const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');

function png(w, h, seed) {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) { p.data[i * 4] = 240; p.data[i * 4 + 1] = 240; p.data[i * 4 + 2] = 240; p.data[i * 4 + 3] = 255; }
  p.data[seed * 4] = 20;   /* one dark pixel, so two pictures of the same size differ */
  return PNG.sync.write(p);
}
function jpegish() { return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]); }

/* a Word document from a list of blocks: ['h1', text] | ['p', text] | ['li', text] | ['img', name] */
function docx(blocks, media) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rels = [], body = [];
  const ids = {};
  for (const [kind, v] of blocks) {
    if (kind === 'img') {
      if (!ids[v]) { ids[v] = 'rId' + (rels.length + 10); rels.push('<Relationship Id="' + ids[v] + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + v + '"/>'); }
      body.push('<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="' + ids[v] + '"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>');
    } else if (kind === 'h1' || kind === 'h2') body.push('<w:p><w:pPr><w:pStyle w:val="Heading' + kind[1] + '"/></w:pPr><w:r><w:t>' + esc(v) + '</w:t></w:r></w:p>');
    else if (kind === 'li') body.push('<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">' + esc(v) + '</w:t></w:r></w:p>');
    else body.push('<w:p><w:r><w:t xml:space="preserve">' + esc(v) + '</w:t></w:r></w:p>');
  }
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'docProps/core.xml', data: '<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-05T20:00:00Z</dcterms:modified></cp:coreProperties>' },
    { name: 'word/document.xml', data: '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + body.join('') + '<w:sectPr/></w:body></w:document>' },
    { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') + '</Relationships>' }
  ];
  for (const [name, data] of Object.entries(media)) files.push({ name: 'word/media/' + name, data });
  return writeZip(files);
}

test('a walkthrough document becomes a capture set in reading order, with its text beside each picture', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-capture-'));
  const media = { 'image1.png': png(1920, 1080, 7), 'image2.png': png(3840, 2160, 99), 'image3.png': png(1920, 1080, 5000) };
  const buf = docx([
    ['h1', 'Make a bucket'],
    ['p', 'Captured in the console on 5 October 2026, region us-east-1, a sandbox account.'],
    ['h2', 'Step 1: open the bucket list'],
    ['p', 'Clicked S3 in the services menu & waited for the list to load.'],
    ['img', 'image1.png'],
    ['li', 'Note: the "Create bucket" button is orange; the list was empty.'],
    ['h2', 'Step 2: start a new bucket'],
    ['p', 'Clicked Create bucket.'],
    ['img', 'image2.png'],
    ['img', 'image1.png'],
    ['h2', 'Step 3: name it'],
    ['p', 'Typed the name; the field turned green a moment later, which the still does not show.'],
    ['img', 'image3.png']
  ], media);
  const file = path.join(tmp, 'make-a-bucket.docx');
  fs.writeFileSync(file, buf);
  assert.ok(readZip(buf).has('word/document.xml'), 'the writer and the reader agree');

  const into = path.join(tmp, 'bucket-video'); fs.mkdirSync(into);
  const r = core.capture(file, { into });
  assert.strictEqual(r.failures, 0, JSON.stringify(r.rows.filter((x) => x.result !== 'pass')));
  assert.strictEqual(r.warnings, 0);
  assert.deepStrictEqual(r.pictures.map((c) => c.id + ' ' + c.width + 'x' + c.height + ' x' + c.scale), ['CAP-001 1920x1080 x1', 'CAP-002 3840x2160 x2', 'CAP-003 1920x1080 x1']);
  assert.deepStrictEqual(r.pictures.map((c) => c.step), ['Step 1: open the bucket list', 'Step 2: start a new bucket', 'Step 3: name it']);
  assert.ok(fs.readFileSync(path.join(r.dir, 'CAP-002.png')).equals(media['image2.png']), 'the bytes are the document\'s, untouched');
  assert.strictEqual(fs.readdirSync(r.dir).filter((f) => /\.png$/.test(f)).length, 3, 'a picture used twice is one file');
  const md = fs.readFileSync(path.join(r.dir, 'walkthrough.md'), 'utf8');
  const order = [...md.matchAll(/^(## .*|!\[(CAP-\d{3})[^\]]*\].*|- Note.*|Clicked S3.*)$/gm)].map((m) => m[2] || m[1].slice(0, 20));
  assert.deepStrictEqual(order, ['## Step 1: open the ', 'Clicked S3 in the se', 'CAP-001', '- Note: the "Create ', '## Step 2: start a n', 'CAP-002', 'CAP-001', '## Step 3: name it', 'CAP-003'], md);
  assert.ok(/Clicked S3 in the services menu & waited/.test(md), 'entities are unescaped');
  const csv = fs.readFileSync(path.join(r.dir, 'captures.csv'), 'utf8').trim().split('\n');
  assert.strictEqual(csv[0], 'id,file,step,text,width,height,scale,captured_on,source');
  assert.strictEqual(csv.length, 4);
  assert.ok(/^CAP-001,CAP-001\.png,Step 1: open the bucket list,"Clicked S3 in the services menu & waited for the list to load\. \/ Note: the ""Create bucket"" button is orange; the list was empty\.",1920,1080,1,2026-10-05,make-a-bucket\.docx$/.test(csv[1]), csv[1]);
  assert.ok(/^CAP-002,.*,3840,2160,2,/.test(csv[2]), csv[2]);
  console.log(r.pictures.length + ' pictures from ' + r.steps.length + ' headings, in order; CAP-002 is a 2x capture; ' + csv.length + ' csv lines; dated ' + r.captured_on);
});

test('the wrong shape fails by picture id, warns on an odd 16:9, and a second run is refused', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-capture-'));
  const media = { 'small.png': png(1280, 720, 3), 'shot.jpeg': jpegish(), 'good.png': png(1920, 1080, 9), 'wide.png': png(2560, 1440, 11) };
  const buf = docx([
    ['img', 'good.png'],                              /* before any heading: no step */
    ['h2', 'Step 1'],
    ['p', 'Opened the page.'],
    ['img', 'small.png'],
    ['img', 'shot.jpeg'],
    ['h2', 'Step 2'],
    ['img', 'wide.png'],                              /* a heading but no line before the picture */
    ['p', 'Then the same screen again.'],
    ['img', 'good.png']                               /* used twice: one file, no row */
  ], media);
  /* a second copy of good.png under another name, so the repeat is two files with the same bytes */
  media['good2.png'] = media['good.png'];
  const buf2 = docx([['h2', 'Step 1'], ['p', 'Opened the page.'], ['img', 'good.png'], ['p', 'Again.'], ['img', 'good2.png']], media);
  const file = path.join(tmp, 'bad.docx'); fs.writeFileSync(file, buf);
  const file2 = path.join(tmp, 'twice.docx'); fs.writeFileSync(file2, buf2);

  const a = core.capture(file, { into: path.join(tmp, 'a') });
  const bad = a.rows.filter((x) => x.result !== 'pass').map((x) => x.result + ' ' + x.id + ' ' + x.what);
  assert.deepStrictEqual(bad, ['fail CAP-001 step', 'fail CAP-002 size', 'fail CAP-003 format', 'warn CAP-004 size', 'fail CAP-004 step'], JSON.stringify(a.rows));
  assert.strictEqual(a.failures, 4); assert.strictEqual(a.warnings, 1);
  assert.ok(fs.existsSync(path.join(a.dir, 'CAP-003.png')) && fs.existsSync(path.join(a.dir, 'walkthrough.md')), 'everything is still written for a person to look at');
  const text = core.captureFormat(a);
  assert.ok(/FAIL\s+CAP-002 size: 1280x720; 1920x1080 wanted/.test(text) && /WARN\s+CAP-004 size: 2560x1440/.test(text) && /4 failing rows, 1 warning/.test(text), text);

  const b = core.capture(file2, { into: path.join(tmp, 'b') });
  assert.deepStrictEqual(b.rows.filter((x) => x.result !== 'pass').map((x) => x.id + ' ' + x.what + ': ' + x.measured), ['CAP-002 unique: the same picture as CAP-001']);

  assert.throws(() => core.capture(file2, { into: path.join(tmp, 'b') }), /already holds a capture set \(CAP-001\.png, CAP-002\.png, captures\.csv, \.\.\.\)[\s\S]*Nothing is overwritten/);
  assert.throws(() => core.capture(path.join(tmp, 'missing.docx'), { into: tmp }), /no such document/);
  const notDoc = path.join(tmp, 'notes.docx'); fs.writeFileSync(notDoc, writeZip([{ name: 'hello.txt', data: 'hi' }]));
  assert.throws(() => core.capture(notDoc, { into: path.join(tmp, 'c') }), /not a Word document/);

  const cli = spawnSync(process.execPath, [VKIT, 'capture', file, '--into', path.join(tmp, 'd')], { encoding: 'utf8' });
  assert.strictEqual(cli.status, 1, cli.stdout + cli.stderr);
  assert.ok(/FAIL\s+CAP-003 format: JPEG/.test(cli.stdout), cli.stdout);
  console.log('bad.docx: ' + bad.join('; ') + '; twice.docx: one unique row; a second run, a missing file and a non-document are refused by name; vkit capture exits 1');
});

test('no browser channel and no bundled browser: a plain stop, not a hang', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-capture-'));
  const v = core.newVideo('nb', { cwd: tmp });
  const env = Object.assign({}, process.env, { PLAYWRIGHT_BROWSERS_PATH: path.join(tmp, 'no-browsers-here') });
  delete env.PW_CHANNEL;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [VKIT, 'frames', v.dir, '1'], { encoding: 'utf8', env, timeout: 20000 });
  const took = Date.now() - t0;
  assert.notStrictEqual(r.status, 0, 'frames must not succeed without a browser');
  assert.ok(/no browser: set PW_CHANNEL=chrome/.test(r.stderr), r.stderr);
  assert.ok(!/playwright install/.test(r.stderr), 'nothing suggests a download: ' + r.stderr);
  assert.ok(took < 10000, 'stopped in ' + took + ' ms');
  console.log('no browser: exit ' + r.status + ' in ' + took + ' ms: ' + r.stderr.trim().split('\n')[0].slice(0, 120));
});
