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
//   4. a page change the browser's way (engine 0.5.1): openPage hides the content and keeps the chrome for the
//      load, then the new screen is up; the control under the pointer takes the pressed look on click; a note
//      is a small callout, decoration, with a leader to its element
//   5. vkit check --quick: the actions-move row passes when the Action rows move the frame
//   (the test app itself is test/form-app.js, shared with twin.test.js)
//   6. seeking backward across every beat kind here (the load, the note, the press, the scroll, the typing)
//      lands on the same state as seeking forward did (engine 0.5.3: every beat's state is reset by a seek)
// Needs a browser. About 25 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src');
const render = require('../src/adapters/render');

const { writeApp } = require('./form-app');

const TIMELINE_BY_HAND = "function timeline() {\n  at(0.02, function () { fade(true); scene(null); state('empty'); home(); });\n  typeTo(2.0, 'typed', 'f');\n  at(6.0, function () { ease(2.0); state('scrolled'); note('Lower', 'low'); });\n  at(9.0, function () { note(null); pointer('btn'); });\n  at(9.5, function () { click(); });\n  openPage(10.0, 'done', 600);\n  at(VK.total() + 1.5, function () { fade(false); });\n}\n";
// the same moments through the model (engine 0.6.0): act() types, scrollPage() scrolls, act() opens the page; a control the model has no transition for is a recorded miss
const TIMELINE_BY_MODEL = "function timeline() {\n  at(0.02, function () { fade(true); scene(null); state('empty'); home(); });\n  act(1.5, 'f');\n  scrollPage(6.0, 'scrolled', 2.0); at(6.0, function () { note('Lower', 'low'); });\n  at(9.0, function () { note(null); pointer('btn'); });\n  act(9.5, 'btn', { load: 500 });\n  act(10.7, 'nope');\n  at(VK.total() + 1.5, function () { fade(false); });\n}\n";

async function screenProof(timeline, mark) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-screen-'));
  const apps = path.join(tmp, 'apps'); process.env.VKIT_APPS = apps; writeApp(apps);
  const v = core.newVideo('screen', { cwd: tmp, app: 'test/form' });
  const page = path.join(v.dir, 'rig', 'index.html');
  let html = fs.readFileSync(page, 'utf8');
  html = html.replace(/function timeline\(\) \{[\s\S]*?\n\}\n/, timeline);
  assert.ok(html.includes(mark), 'the timeline was replaced');
  fs.writeFileSync(page, html);
  const opts = require('./opts')();
  const measure = function () {
    var f = document.getElementById('f'), leaf = f && f.querySelector('span'), p = document.getElementById('page'), th = document.getElementById('thumb'), c = document.getElementById('note');
    var btn = document.getElementById('btn'), top = document.getElementById('top'), mk = document.getElementById('mock');
    var cs = p && getComputedStyle(p), ts = th && getComputedStyle(th);
    return { text: leaf ? leaf.textContent : null, cls: leaf ? leaf.className : null, typing: leaf ? leaf.classList.contains('caret') : null, focus: f ? f.classList.contains('focus') : null,
      pageTop: cs ? parseFloat(cs.top) : null, thumbTop: ts ? parseFloat(ts.top) : null, pageTransition: cs ? cs.transitionProperty : null, cardOpacity: c ? parseFloat(getComputedStyle(c).opacity) : null,
      msg: !!document.getElementById('msg'), screens: window.SCREENS, version: window.VK.version,
      noteDecor: c ? c.hasAttribute('data-decor') : null, noteSize: c ? parseFloat(getComputedStyle(c).fontSize) : null, leader: c ? (c.querySelector('svg.leader path').getAttribute('d') || '') : '',
      pressed: btn ? getComputedStyle(btn).filter : null, loading: mk ? mk.classList.contains('loading') : null, chromeSeen: top ? getComputedStyle(top).visibility : null, labelSeen: document.getElementById('label') ? getComputedStyle(document.getElementById('label')).visibility : null,
      acts: window.VK.acts(), faults: window.VK.faults().map((f) => f.key), model: !!window.MODEL };
  };
  const out = await render.survey(path.join(v.dir, 'rig'), [1.0, 2.5, 4.5, 7.0, 8.9, 9.55, 10.3, 10.8], measure, opts);
  const [before, typing, typed, mid, after, pressed, loading, cut] = out.map((o) => o.data);
  assert.strictEqual(before.version, core.engineVersion(), 'the page runs the kit engine');
  assert.deepStrictEqual(before.screens, { empty: 'Form', typed: 'Form', scrolled: 'Form', done: 'Done', refused: 'Form', ghost: 'Form' }, 'states.js carries the screen of each state, the unbuilt one included');
  assert.strictEqual(before.cls, 'ph t'); assert.strictEqual(before.focus, false);
  // 1. typing: 0.5 s at 12 a second is six characters, in the typed state's own span, with the caret
  assert.strictEqual(typing.text, 'hello ', 'six characters at 2.5 s: ' + JSON.stringify(typing));
  assert.ok(typing.cls.indexOf('val') === 0 && typing.focus && typing.typing, 'the typed state is on with the caret: ' + JSON.stringify(typing));
  assert.strictEqual(typed.text, 'hello world'); assert.strictEqual(typed.typing, false, 'the caret is gone 0.6 s after the last character');
  // 2. the scroll: mid-move, between the positions, as a transition; landed after; the card waited
  assert.ok(mid.pageTop < 0 && mid.pageTop > -600 && mid.thumbTop > 60 && mid.thumbTop < 360, 'the page and the thumb are between their positions 1 s into a 2 s scroll: ' + JSON.stringify(mid));
  assert.ok(/top/.test(mid.pageTransition), 'the page moves by a transition, not a replace: ' + mid.pageTransition);
  assert.strictEqual(mid.cardOpacity, 0, 'the note waits for the scroll to land');
  assert.strictEqual(after.pageTop, -600); assert.strictEqual(after.thumbTop, 360); assert.strictEqual(after.cardOpacity, 1, 'the note is up once the scroll has landed');
  assert.ok(after.noteDecor && after.noteSize < 54 && /^M/.test(after.leader), 'the note is decoration under the read floor, with a leader drawn: ' + JSON.stringify({ decor: after.noteDecor, size: after.noteSize, leader: after.leader.slice(0, 20) }));
  assert.strictEqual(after.text, 'hello world', 'the typed name survives the scroll: the page changed in place');
  // 3. the press, the load, the new screen
  assert.ok(/brightness/.test(pressed.pressed) && !/brightness\(1\)/.test(pressed.pressed), 'the button under the pointer is pressed 50 ms after the click: ' + pressed.pressed);
  assert.ok(loading.loading && loading.chromeSeen === 'visible' && loading.labelSeen === 'hidden' && !loading.msg, 'mid-load: the chrome stays, the content is gone, the new page is not up yet: ' + JSON.stringify({ loading: loading.loading, chrome: loading.chromeSeen, label: loading.labelSeen, msg: loading.msg }));
  assert.ok(cut.msg && cut.text === null && !cut.loading, 'the Done screen is up after the load: ' + JSON.stringify({ msg: cut.msg, loading: cut.loading }));
  // 6. the same moments reached backward: after the load, mid-scroll, mid-typing
  const back = await render.survey(path.join(v.dir, 'rig'), [10.8, 7.0, 2.5], measure, opts);
  const [cutB, midB, typingB] = back.map((o) => o.data);
  const same = (a, b, keys, where) => { for (const k of keys) assert.deepStrictEqual(b[k], a[k], 'seeking backward to ' + where + ' differs on ' + k + ': ' + JSON.stringify([a[k], b[k]])); };
  same(cut, cutB, ['msg', 'text', 'loading', 'cardOpacity', 'pressed'], '10.8 s');
  same(mid, midB, ['text', 'cardOpacity', 'loading', 'msg', 'focus'], '7.0 s');
  assert.ok(midB.pageTop < 0 && midB.pageTop > -600, 'the page is mid-scroll again after a backward seek: ' + midB.pageTop);
  same(typing, typingB, ['text', 'cls', 'typing', 'focus', 'pageTop', 'loading', 'msg'], '2.5 s');
  console.log('screen: typed "' + typing.text + '" at 2.5 s; page ' + mid.pageTop.toFixed(0) + ' px and thumb ' + mid.thumbTop.toFixed(0) + ' px mid-scroll, landed at ' + after.pageTop + ' and ' + after.thumbTop + '; note waited (' + after.noteSize + ' px, leader ' + (after.leader ? 'drawn' : 'none') + '); pressed ' + pressed.pressed + '; mid-load chrome ' + loading.chromeSeen + ', content ' + loading.labelSeen + '; the new page is up at 10.8 s: ' + cut.msg);
  return { v, out, cut, opts };
}

test('a screen is one page: typeTo types the state\'s own text, a state change scrolls in place, a new screen is a cut', async () => {
  const { v, cut, opts } = await screenProof(TIMELINE_BY_HAND, "typeTo(2.0, 'typed', 'f')");
  assert.deepStrictEqual(cut.acts.map((a) => a.from + '>' + a.to + ':' + a.via), ['empty>typed:type', 'typed>scrolled:state', 'scrolled>done:open'], 'every state change is on record, with how it was made: ' + JSON.stringify(cut.acts));
  // 4. the actions-move row: two action rows (the typing, the scroll) move the frame; a row that says it acts but does nothing is named
  const sb = path.join(v.dir, 'storyboard.md');
  const head = fs.readFileSync(sb, 'utf8').split('\n').filter((l) => !/^\|\s*\d/.test(l)).join('\n');
  fs.writeFileSync(sb, head + '\n| 1 | The form. | 0.5 | | state empty, the form | rest | | |\n| 1 | Type the name. | 2.0 | type the name | state typed, the field | hold | | |\n| 1 | Scroll down. | 6.0 | scroll to Lower down | state scrolled | hold | | |\n| 1 | Nothing happens here. | 12.0 | click Create | state done | hold | | |\n');
  const report = await core.check(v.dir, Object.assign({ quick: true }, opts));
  const row = report.groups.craft.find((x) => x.id === 'actions-move');
  assert.ok(row && row.result === 'fail' && /12\.0 s "click Create": nothing on screen moved/.test(row.measured) && !/type the name/.test(row.measured), JSON.stringify(row));
  console.log('check: ' + row.measured);
});

test('the same screen through the model: act() reads the transition, the frames measure the same, a control the model lacks is a miss', async () => {
  const { v, cut, opts } = await screenProof(TIMELINE_BY_MODEL, "act(1.5, 'f')");
  assert.ok(cut.model, 'states.js carries window.MODEL');
  assert.deepStrictEqual(cut.acts.map((a) => a.from + '>' + a.to + ':' + a.via), ['empty>typed:type', 'typed>scrolled:scroll', 'scrolled>done:open'], JSON.stringify(cut.acts));
  assert.deepStrictEqual(cut.faults, ['act:nope on done'], 'act on a control the model has no transition for is recorded, never thrown: ' + JSON.stringify(cut.faults));
  // the checker holds the model and the timeline to each other: a transition to a state the app lacks, a control the state lacks, a state change the model lacks
  const mf = path.join(v.dir, 'rig', 'app', 'model.json');
  const model = JSON.parse(fs.readFileSync(mf, 'utf8'));
  model.transitions = model.transitions.filter((t) => !(t.from === 'scrolled' && t.to === 'done'));
  model.transitions.push({ from: 'done', control: 'ghost', action: 'click', to: 'nowhere' });
  fs.writeFileSync(mf, JSON.stringify(model));
  const report = await core.check(v.dir, Object.assign({ quick: true }, opts));
  const rowOf = (id) => [].concat(...Object.values(report.groups)).find((x) => x.id === id);
  const st = rowOf('model-states'), ct = rowOf('model-controls'), am = rowOf('actions-in-model');
  assert.ok(st && st.result === 'fail' && /nowhere is not a state the app has/.test(st.measured), JSON.stringify(st));
  assert.ok(ct && ct.result === 'fail' && /no element with id ghost in done/.test(ct.measured), JSON.stringify(ct));
  assert.ok(am && am.result === 'fail' && /scrolled > done at 10\.6 s \(open\)/.test(am.measured), JSON.stringify(am));
  console.log('model: ' + cut.acts.map((a) => a.from + ' > ' + a.to + ' (' + a.via + ')').join(', ') + '; miss: ' + cut.faults.join(', ') + '; check: ' + st.measured + ' | ' + ct.measured + ' | ' + am.measured);
});
