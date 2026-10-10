// Proof for engine 0.5.0: a recreated screen is a page that changes in place, not a stack of photographs.
// A tiny app in a temp apps folder has one screen ("Form") in three states (empty field; the name typed;
// the page scrolled 600 px) and a second screen ("Done"). A starter video is made on it and its timeline
// replaced with: the empty form, typeTo into the typed state, a state change that scrolls, a page change.
//   1. typeTo: half a second in, the field shows the first six characters of the state's own text, in the
//      state's own span (the class the capture had), with the typing caret on
//   2. the scroll: a still mid-move shows the page between its two positions and the thumb between its
//      two, with a transition (a replace would jump); the still after the move shows them landed, and the
//      card named in that beat waited for the scroll
//   3. a page change is a cut: the new screen is up at once, and a scroll beat before it left no transition
//   4. vkit check --quick: the actions-move row passes when the Action rows move the frame
// Needs a browser. About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const render = require('../src/adapters/render');

function writeApp(apps) {
  const dir = path.join(apps, 'test', 'form');
  fs.mkdirSync(path.join(dir, 'states'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ name: 'form', family: 'test', title: 'Test form', extends: '', version: '0.1.0', created_on: '2026-10-09', rule: 'a test', note: 'a page in three states for the engine proof; invented on purpose' }, null, 2));
  fs.writeFileSync(path.join(dir, 'tokens.css'), ':root{--p-ground:#fff;--p-strong:#111}\n');
  fs.writeFileSync(path.join(dir, 'screen.css'), '#mock{background:#fff;color:#111;font-family:Arial,sans-serif}#mock .page{position:absolute;left:0;width:1905px}#mock .t{position:absolute;font-size:16px}#mock .field{position:absolute;left:200px;top:300px;width:600px;height:32px;border:1px solid #888}#mock .field.focus{border:2px solid #06c}#mock .ph{color:#999;font-style:italic}#mock .val{color:#111}#mock .bar{position:absolute;right:0;top:0;width:15px;height:1080px;background:#eee}#mock .thumb{position:absolute;left:2px;width:11px;background:#aaa}#mock .fixed{position:absolute;left:0;top:0;width:1905px;height:60px;background:#232f3e;color:#fff}\n');
  const page = (scroll, typed) => '<div class="fixed t" id="top"><span class="t" style="left:20px;top:20px">Test console</span></div>'
    + '<div class="bar"><div class="thumb" id="thumb" data-scrolls style="top:' + (60 + scroll / 2) + 'px;height:400px"></div></div>'
    + '<div class="page" id="page" data-scrolls style="top:' + (-scroll) + 'px;height:2000px">'
    + '<span class="t" style="left:200px;top:200px" id="label">Bucket name</span>'
    + '<div class="field' + (typed ? ' focus' : '') + '" id="f">' + (typed ? '<span class="val t" style="left:8px;top:6px">hello world</span>' : '<span class="ph t" style="left:8px;top:6px">a placeholder</span>') + '</div>'
    + '<span class="t" style="left:200px;top:900px" id="low">Lower down</span>'
    + '<div class="field" id="btn" style="top:1500px;width:120px">Create</div></div>';
  fs.writeFileSync(path.join(dir, 'states', 'empty.html'), page(0, false));
  fs.writeFileSync(path.join(dir, 'states', 'typed.html'), page(0, true));
  fs.writeFileSync(path.join(dir, 'states', 'scrolled.html'), page(600, true));
  fs.writeFileSync(path.join(dir, 'states', 'done.html'), '<div class="fixed t" id="top"><span class="t" style="left:20px;top:20px">Test console</span></div><span class="t" id="msg" style="left:200px;top:200px">Created</span>');
  fs.writeFileSync(path.join(dir, 'manifest.csv'), 'id,file,screen,state,capture,captured_on,note\nempty,empty.html,Form,the form,,,\ntyped,typed.html,Form,the name typed,,,\nscrolled,scrolled.html,Form,scrolled 600,,,\ndone,done.html,Done,after Create,,,\n');
  return dir;
}

test('a screen is one page: typeTo types the state\'s own text, a state change scrolls in place, a new screen is a cut', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-screen-'));
  const apps = path.join(tmp, 'apps'); process.env.VKIT_APPS = apps; writeApp(apps);
  const v = core.newVideo('screen', { cwd: tmp, app: 'test/form' });
  const page = path.join(v.dir, 'rig', 'index.html');
  let html = fs.readFileSync(page, 'utf8');
  const timeline = "function timeline() {\n  at(0.02, function () { fade(true); scene(null); state('empty'); home(); });\n  typeTo(2.0, 'typed', 'f');\n  at(6.0, function () { ease(2.0); state('scrolled'); card('Lower', 'low'); });\n  at(10.0, function () { state('done'); });\n  at(VK.total() + 1.5, function () { fade(false); });\n}\n";
  html = html.replace(/function timeline\(\) \{[\s\S]*?\n\}\n/, timeline);
  assert.ok(html.includes("typeTo(2.0, 'typed', 'f')"), 'the timeline was replaced');
  fs.writeFileSync(page, html);
  const opts = require('./opts')();
  const measure = function () {
    var f = document.getElementById('f'), leaf = f && f.querySelector('span'), p = document.getElementById('page'), th = document.getElementById('thumb'), c = document.getElementById('card');
    var cs = p && getComputedStyle(p), ts = th && getComputedStyle(th);
    return { text: leaf ? leaf.textContent : null, cls: leaf ? leaf.className : null, typing: leaf ? leaf.classList.contains('caret') : null, focus: f ? f.classList.contains('focus') : null,
      pageTop: cs ? parseFloat(cs.top) : null, thumbTop: ts ? parseFloat(ts.top) : null, pageTransition: cs ? cs.transitionProperty : null, cardOpacity: c ? parseFloat(getComputedStyle(c).opacity) : null,
      msg: !!document.getElementById('msg'), screens: window.SCREENS, version: window.VK.version };
  };
  const out = await render.survey(path.join(v.dir, 'rig'), [1.0, 2.5, 4.5, 7.0, 9.0, 10.3], measure, opts);
  const [before, typing, typed, mid, after, cut] = out.map((o) => o.data);
  assert.strictEqual(before.version, '0.5.0');
  assert.deepStrictEqual(before.screens, { empty: 'Form', typed: 'Form', scrolled: 'Form', done: 'Done' }, 'states.js carries the screen of each state');
  assert.strictEqual(before.cls, 'ph t'); assert.strictEqual(before.focus, false);
  // 1. typing: 0.5 s at 12 a second is six characters, in the typed state's own span, with the caret
  assert.strictEqual(typing.text, 'hello ', 'six characters at 2.5 s: ' + JSON.stringify(typing));
  assert.ok(typing.cls.indexOf('val') === 0 && typing.focus && typing.typing, 'the typed state is on with the caret: ' + JSON.stringify(typing));
  assert.strictEqual(typed.text, 'hello world'); assert.strictEqual(typed.typing, false, 'the caret is gone 0.6 s after the last character');
  // 2. the scroll: mid-move, between the positions, as a transition; landed after; the card waited
  assert.ok(mid.pageTop < 0 && mid.pageTop > -600 && mid.thumbTop > 60 && mid.thumbTop < 360, 'the page and the thumb are between their positions 1 s into a 2 s scroll: ' + JSON.stringify(mid));
  assert.ok(/top/.test(mid.pageTransition), 'the page moves by a transition, not a replace: ' + mid.pageTransition);
  assert.strictEqual(mid.cardOpacity, 0, 'the card waits for the scroll to land');
  assert.strictEqual(after.pageTop, -600); assert.strictEqual(after.thumbTop, 360); assert.strictEqual(after.cardOpacity, 1, 'the card is up once the scroll has landed');
  assert.strictEqual(after.text, 'hello world', 'the typed name survives the scroll: the page changed in place');
  // 3. a new screen is a cut
  assert.ok(cut.msg && cut.text === null, 'the Done screen replaced the form at once: ' + JSON.stringify(cut));
  console.log('screen: typed "' + typing.text + '" at 2.5 s; page ' + mid.pageTop.toFixed(0) + ' px and thumb ' + mid.thumbTop.toFixed(0) + ' px mid-scroll, landed at ' + after.pageTop + ' and ' + after.thumbTop + '; card waited; the cut shows ' + cut.msg);
  // 4. the actions-move row: two action rows (the typing, the scroll) move the frame; a row that says it acts but does nothing is named
  const sb = path.join(v.dir, 'storyboard.md');
  const head = fs.readFileSync(sb, 'utf8').split('\n').filter((l) => !/^\|\s*\d/.test(l)).join('\n');
  fs.writeFileSync(sb, head + '\n| 1 | The form. | 0.5 | | state empty, the form | rest | | |\n| 1 | Type the name. | 2.0 | type the name | state typed, the field | hold | | |\n| 1 | Scroll down. | 6.0 | scroll to Lower down | state scrolled | hold | | |\n| 1 | Nothing happens here. | 12.0 | click Create | state done | hold | | |\n');
  const report = await core.check(v.dir, Object.assign({ quick: true }, opts));
  const row = report.groups.craft.find((x) => x.id === 'actions-move');
  assert.ok(row && row.result === 'fail' && /12\.0 s "click Create": nothing on screen moved/.test(row.measured) && !/type the name/.test(row.measured), JSON.stringify(row));
  console.log('check: ' + row.measured);
});
