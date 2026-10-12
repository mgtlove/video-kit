// The test app every engine and twin proof uses: one screen ("Form") in four states (the field empty; the name
// typed; the page scrolled 600 px; the name refused), a second screen ("Done"), a state captured and not built
// ("ghost"), a model over them with two rules on the field (docs/MODEL.md), and one path for the guide
// (paths/walk.json). Invented on purpose; nothing here is a product.
const fs = require('fs');
const path = require('path');
function writeApp(apps) {
  const dir = path.join(apps, 'test', 'form');
  fs.mkdirSync(path.join(dir, 'states'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ name: 'form', family: 'test', title: 'Test form', extends: '', version: '0.1.0', created_on: '2026-10-09', rule: 'a test', note: 'a page in three states for the engine proof; invented on purpose' }, null, 2));
  fs.writeFileSync(path.join(dir, 'tokens.css'), ':root{--p-ground:#fff;--p-strong:#111}\n');
  fs.writeFileSync(path.join(dir, 'screen.css'), '#mock{background:#fff;color:#111;font-family:Arial,sans-serif}#mock .page{position:absolute;left:0;width:1905px}#mock .t{position:absolute;font-size:16px}#mock .field{position:absolute;left:200px;top:300px;width:600px;height:32px;border:1px solid #888}#mock .field.focus{border:2px solid #06c}#mock .ph{color:#999;font-style:italic}#mock .val{color:#111}#mock .bar{position:absolute;right:0;top:0;width:15px;height:1080px;background:#eee}#mock .thumb{position:absolute;left:2px;width:11px;background:#aaa}#mock .fixed{position:absolute;left:0;top:0;width:1905px;height:60px;background:#232f3e;color:#fff}#mock .foot{position:absolute;left:0;top:1040px;width:1905px;height:40px;background:#333;color:#fff}\n');
  const page = (scroll, typed) => '<div class="fixed t" id="top" data-chrome><span class="t" style="left:20px;top:20px">Test console</span></div>'
    + '<div class="foot t" id="foot" data-chrome><span class="t" style="left:20px;top:10px">Footer</span></div>'
    + '<div class="bar"><div class="thumb" id="thumb" data-scrolls style="top:' + (60 + scroll / 2) + 'px;height:400px"></div></div>'
    + '<div class="page" id="page" data-scrolls style="top:' + (-scroll) + 'px;height:2000px">'
    + '<span class="t" style="left:200px;top:200px" id="label">Bucket name</span>'
    + '<div class="field' + (typed ? ' focus' : '') + '" id="f">' + (typed ? '<span class="val t" style="left:8px;top:6px">hello world</span>' : '<span class="ph t" style="left:8px;top:6px">a placeholder</span>') + '</div>'
    + '<span class="t" style="left:200px;top:900px" id="low">Lower down</span>'
    + '<div class="field" id="btn" style="top:1500px;width:120px">Create</div></div>';
  fs.writeFileSync(path.join(dir, 'states', 'empty.html'), page(0, false));
  fs.writeFileSync(path.join(dir, 'states', 'typed.html'), page(0, true));
  fs.writeFileSync(path.join(dir, 'states', 'scrolled.html'), page(600, true));
  fs.writeFileSync(path.join(dir, 'states', 'refused.html'), page(0, true).replace('id="f">', 'id="f" style="border-color:#d00">') + '<span class="t" id="err" style="left:200px;top:340px;color:#d00">That name is taken</span>');
  fs.writeFileSync(path.join(dir, 'states', 'done.html'), '<div class="fixed t" id="top" data-chrome><span class="t" style="left:20px;top:20px">Test console</span></div><span class="t" id="msg" style="left:200px;top:200px">Created hello world</span>');
  fs.writeFileSync(path.join(dir, 'manifest.csv'), 'id,file,screen,state,capture,captured_on,note\nempty,empty.html,Form,the form,,,\ntyped,typed.html,Form,the name typed,,,\nscrolled,scrolled.html,Form,scrolled 600,,,\ndone,done.html,Done,after Create,,,\nrefused,refused.html,Form,the name refused,,,\nghost,,Form,captured only: a screen with a capture and no state yet,CAP-009.png,2026-10-09,not built\n');
  fs.writeFileSync(path.join(dir, 'model.json'), JSON.stringify({ app: 'test/form', model: 1, start: 'empty', urls: { empty: 'https://example.test/form', typed: 'https://example.test/form', scrolled: 'https://example.test/form', refused: 'https://example.test/form', done: 'https://example.test/done?name=hello world' }, fields: { f: { label: 'Bucket name', taken: ['taken'], rules: [{ test: '^.{3,}$', says: 'At least three characters.', source: 'invented for the test' }, { test: '^[a-z0-9 -]*$', says: 'Lowercase letters, numbers, spaces and hyphens only.', source: 'invented for the test' }] } }, transitions: [
    { from: 'empty', control: 'f', action: 'type', to: 'typed' }, { from: 'empty', control: 'label', action: 'click', to: 'empty' }, { from: 'typed', action: 'scroll', to: 'scrolled' }, { from: 'scrolled', action: 'scroll', to: 'typed' },
    { from: 'scrolled', control: 'btn', action: 'click', to: 'done' }, { from: 'typed', control: 'btn', action: 'click', to: 'done' },
    { from: 'typed', control: 'btn', action: 'click', to: 'refused', when: 'taken' }, { from: 'refused', control: 'f', action: 'type', to: 'typed' }, { from: 'typed', control: 'f', action: 'type', to: 'typed' }, { from: 'typed', control: 'low', action: 'click', to: 'ghost' }], notice: { unbuilt: 'Captured, not built.', outside: 'Not in this practice.' } }, null, 1));
  fs.mkdirSync(path.join(dir, 'paths'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'paths', 'walk.json'), JSON.stringify({ path: 'walk', app: 'test/form', goal: 'Make a thing', steps: [
    { control: 'f', label: 'Bucket name', do: 'Type a name.', why: 'A thing needs a name.', refused: 'That name is somebody else\'s. Type another.' },
    { control: 'btn', label: 'Create', do: 'Click Create.' }], done: 'The thing is made.' }, null, 1));
  return dir;
}

module.exports = { writeApp };
