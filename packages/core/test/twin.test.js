// Proof for the twin (docs/MODEL.md, milestone A): the app model run by a hand, with the sidekick beside it.
//   1. vkit twin --build writes the runner, the engine, the app, the model and the path into the app's twin/ folder; the
//      command line says what it built; a path that is not there is refused by name
//   2. in a browser, on the test app (test/form-app.js), in a 1200 px wide window: the page is framed in the practice
//      browser (the address from the model, back and forward, the disclaimer) beside the sidekick, scaled to the width
//      and shown whole, the scrollbar always there, growing with the browser's zoom and scrolling sideways then; the sidekick shows the path's goal and first step with the lesson's
//      words and a ring around the step's control; the top bar and footer are where the real page keeps them in the
//      first frame after a scroll (sticky, no script); a click on a typed field puts a real input over it, matching
//      the field's box, with no ring of its own; a value that breaks a rule stays in the field and the sidekick says the
//      rule, the step does not move, and a click that would submit it is held; nothing typed leaves the field empty;
//      Fill it in for me types the lesson's value and the step moves on; a name in the field's taken list takes the
//      when: "taken" transition and the sidekick says the lesson's refusal; a click the model answers that is not the
//      step is exploring; a click the model has nothing for shows the "outside" notice; a click leading to a captured,
//      unbuilt state shows the "unbuilt" notice; the last step landing is done, the learner's text where the lesson's
//      was on the new page and in its address; back and forward walk the pages; the sidekick closes and opens; R starts
//      over
// Needs a browser. About 20 s.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../src');
const { writeApp } = require('./form-app');

const KIT = path.join(__dirname, '..', '..', '..');
const VKIT = path.join(KIT, 'packages', 'cli', 'bin', 'vkit.js');

test('vkit twin builds the practice copy and a hand walks the model with the sidekick', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vkit-twin-'));
  const apps = path.join(tmp, 'apps'); process.env.VKIT_APPS = apps; writeApp(apps);
  // 1. the build, by the command line
  const b = spawnSync(process.execPath, [VKIT, 'twin', 'test/form', '--build'], { encoding: 'utf8', env: process.env });
  assert.strictEqual(b.status, 0, b.stderr);
  assert.ok(/built .*twin: Test form, 5 of 6 states built, \d+ transitions, starts at empty, 5 addresses \(from the captures, else the model\), the sidekick walks walk \(2 steps\), 2 field rules, engine \d+\.\d+\.\d+\./.test(b.stdout), b.stdout);
  const dir = path.join(apps, 'test', 'form', 'twin');
  for (const f of ['index.html', 'twin.js', 'twin.css', 'engine/rig.js', 'engine/rig.css', 'engine/VERSION', 'app/states.js', 'app/model.json', 'app/screen.css', 'app/tokens.css', 'README.md']) assert.ok(fs.existsSync(path.join(dir, f)), 'the twin has ' + f);
  assert.ok(/window\.MODEL = /.test(fs.readFileSync(path.join(dir, 'app', 'states.js'), 'utf8')), 'states.js carries the model');
  assert.ok(/window\.TWIN_PATH = \{"path":"walk"/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')), 'the page carries the path');
  assert.throws(() => core.buildTwin('example/placeholder'), /has no model\.json/, 'an app with no model is refused by name');
  assert.throws(() => core.buildTwin('test/form', { path: 'nope' }), /has no paths\/nope\.json \(it has: walk\)/, 'a path that is not there is refused by name');
  // 2. the hand
  const opts = require('./opts')();
  const { chromium } = require('playwright');
  const served = await core.serveTwin(dir);
  const browser = await chromium.launch(Object.assign({ ignoreDefaultArgs: ['--hide-scrollbars'] }, opts.channel ? { channel: opts.channel } : {}));
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(served.url);
    await page.waitForSelector('body.twin-ready', { timeout: 10000 });
    const look = () => page.evaluate(() => ({ state: TWIN.state(), url: TWIN.url(), scale: +TWIN.scale().toFixed(3), scrollTop: document.getElementById('view').scrollTop, loading: document.getElementById('mock').classList.contains('loading'), notice: document.getElementById('notice').classList.contains('on') ? document.getElementById('notice').textContent : '', live: [...document.querySelectorAll('#mock .twin-live')].map((e) => e.id).sort(), f: (document.querySelector('#f span') || {}).textContent, msg: (document.getElementById('msg') || {}).textContent, pressed: document.getElementById('btn') ? getComputedStyle(document.getElementById('btn')).filter : null, back: document.getElementById('back').disabled, forward: document.getElementById('forward').disabled, brand: document.getElementById('brand').textContent, stageW: document.getElementById('stage').getBoundingClientRect().width, step: TWIN.step(), say: TWIN.say(), goal: document.getElementById('sidekick-goal-text').textContent, count: document.getElementById('sidekick-count').textContent, label: document.getElementById('sidekick-label').textContent, do: document.getElementById('sidekick-do').textContent, why: document.getElementById('sidekick-why').hidden ? '' : document.getElementById('sidekick-why-text').textContent, fill: !document.getElementById('fill').hidden, ring: (() => { const r = document.getElementById('sidekick-ring'), el = r && document.getElementById(TWIN.step().control); if (!r || !el) return null; const a = r.getBoundingClientRect(), b = el.getBoundingClientRect(); return { around: a.left < b.left && a.top < b.top && a.right > b.right && a.bottom > b.bottom }; })(), done: document.getElementById('sidekick-done-text').textContent, guideShown: !document.body.classList.contains('no-sidekick') }));
    let s = await look();
    assert.deepStrictEqual([s.state, s.live, s.f], ['empty', ['f', 'label'], 'a placeholder'], 'the start state with its live controls: ' + JSON.stringify(s));
    assert.ok(Math.abs(s.scale - 0.414) < 0.02 && Math.abs(s.stageW - s.scale * 1920) < 2 && s.url === 'https://example.test/form' && s.back && s.forward && /Practice copy of Test form\. Not the product\./.test(s.brand), 'the practice browser beside the sidekick: scaled to the width it has, the address, the buttons, the disclaimer: ' + JSON.stringify(s));
    assert.ok(s.goal === 'Make a thing' && s.count === 'Step 1 of 2' && s.label === 'Bucket name' && s.do === 'Type a name.' && s.why === 'A thing needs a name.' && s.fill && s.ring && s.ring.around, 'the sidekick: the goal, the first step in the lesson\'s words, Fill it in for me, the ring around the field: ' + JSON.stringify(s));
    // the browser's own zoom (the window's screen width over its CSS width, played here): the page keeps its scale, so it grows
    // with the zoom and the view scrolls sideways; back at 100 percent it fits again
    const zoomed = await page.evaluate(() => { Object.defineProperty(window, 'outerWidth', { configurable: true, value: Math.round(window.innerWidth * 1.25) }); window.dispatchEvent(new Event('resize')); const v = document.getElementById('view'); return { zoom: +TWIN.zoom().toFixed(2), scale: +TWIN.scale().toFixed(3), sideways: v.scrollWidth > v.clientWidth + 100 }; });
    const unzoomed = await page.evaluate(() => { Object.defineProperty(window, 'outerWidth', { configurable: true, value: window.innerWidth }); window.dispatchEvent(new Event('resize')); const v = document.getElementById('view'); return { zoom: TWIN.zoom(), scale: +TWIN.scale().toFixed(3), sideways: v.scrollWidth > v.clientWidth }; });
    assert.ok(zoomed.zoom === 1.25 && zoomed.scale > s.scale * 1.3 && zoomed.sideways && unzoomed.zoom === 1 && unzoomed.scale === s.scale && !unzoomed.sideways, 'zoomed in, the page grows and scrolls sideways; at 100 percent it fits: ' + JSON.stringify({ zoomed, unzoomed, fit: s.scale }));
    // the bars in the first frame after a scroll: sticky, where the real page keeps them; the scrollbar is there
    const bars = await page.evaluate(async () => { const v = document.getElementById('view'), out = []; for (const y of [100, 200]) { v.scrollTop = y; await new Promise((r) => requestAnimationFrame(r)); const vr = v.getBoundingClientRect(); out.push({ y, top: +(document.getElementById('top').getBoundingClientRect().top - vr.top).toFixed(1), footBottom: +(vr.bottom - document.getElementById('foot').getBoundingClientRect().bottom).toFixed(1), scrolled: v.scrollTop }); } v.scrollTop = 0; await new Promise((r) => requestAnimationFrame(r)); return { out, scrollbar: v.offsetWidth - v.clientWidth, scrollH: v.scrollHeight, thumb: getComputedStyle(document.getElementById('thumb')).visibility, pinnedBy: getComputedStyle(document.getElementById('top')).position }; });
    assert.ok(bars.out.every((o) => Math.abs(o.top) < 1 && Math.abs(o.footBottom) < 1 && o.scrolled === o.y) && bars.pinnedBy === 'sticky', 'the top bar and the footer hold in the first frame after a scroll, by sticky: ' + JSON.stringify(bars));
    assert.ok(bars.scrollbar > 0 && Math.abs(bars.scrollH - 2000 * s.scale) < 3 && bars.thumb === 'hidden', 'the browser\'s scrollbar is there, the view holds the whole page and the captured thumb is hidden: ' + JSON.stringify(bars));
    // a click on the field: a real input over it, the field's box, no ring of its own; a value that breaks a rule
    await page.click('#f');
    const input = await page.evaluate(() => { const i = document.getElementById('twin-input'), f = document.getElementById('f'), a = i.getBoundingClientRect(), b = f.getBoundingClientRect(); return { focused: document.activeElement === i, placeholder: i.placeholder, box: Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.top - b.top) < 1, outline: getComputedStyle(i).outlineStyle, say: TWIN.say().kind }; });
    assert.ok(input.focused && input.placeholder === 'a placeholder' && input.box && input.outline === 'none' && input.say === 'note', 'a real input with the field\'s placeholder, the field\'s own box, no browser ring, the sidekick\'s typing note: ' + JSON.stringify(input));
    await page.keyboard.type('My Own'); await page.keyboard.press('Enter'); await page.waitForTimeout(700); s = await look();
    assert.ok(s.state === 'typed' && s.f === 'My Own' && s.step.i === 0 && s.say.kind === 'bad' && /Lowercase letters/.test(s.say.text), 'a value that breaks a rule stays in the field and the sidekick says the rule; the step does not move: ' + JSON.stringify(s));
    await page.click('#btn'); await page.waitForTimeout(700); s = await look();
    assert.ok(s.state === 'typed' && s.say.kind === 'bad', 'a click that would submit the value is held: ' + JSON.stringify(s));
    // nothing typed: the field empty again, no name forced (the input opens with its text selected, so Backspace clears it; no select-all key, which is not Control+A on a Mac)
    await page.click('#f'); await page.keyboard.press('Backspace'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); s = await look();
    assert.ok(s.state === 'empty' && s.f === 'a placeholder' && s.say.kind === '' && s.step.i === 0, 'nothing typed leaves the field empty: ' + JSON.stringify(s));
    // exploring: a click the model answers that is not the step
    await page.click('#label'); await page.waitForTimeout(400); s = await look();
    assert.ok(s.state === 'empty' && s.say.kind === 'explore' && /You clicked Bucket name\. The step is still: Type a name\./.test(s.say.text), 'exploring: ' + JSON.stringify(s));
    // Fill it in for me: the lesson's value, the step moves on
    await page.click('#fill'); await page.waitForTimeout(700); s = await look();
    assert.ok(s.state === 'typed' && s.f === 'hello world' && s.step.i === 1 && s.count === 'Step 2 of 2' && s.label === 'Create' && s.say.kind === '' && !s.fill && s.ring && s.ring.around, 'filled in: the lesson\'s value, the second step up with its ring on the button: ' + JSON.stringify(s));
    // a click the model has nothing for; a click leading to the captured, unbuilt state
    await page.click('#label'); await page.waitForTimeout(100); s = await look();
    assert.strictEqual(s.notice, 'Not in this practice.', 'the outside notice: ' + JSON.stringify(s));
    await page.waitForTimeout(2700);
    await page.click('#low'); await page.waitForTimeout(100); s = await look();
    assert.strictEqual(s.notice, 'Captured, not built.', 'the unbuilt notice: ' + JSON.stringify(s));
    assert.strictEqual(s.state, 'typed', 'nothing moved');
    // the wheel scrolls the page itself; the state stays
    await page.mouse.move(400, 400); await page.mouse.wheel(0, 300); await page.waitForTimeout(400); s = await look();
    assert.ok(s.state === 'typed' && s.scrollTop > 200 && s.f === 'hello world', 'the wheel scrolled the view, the state and the text stayed: ' + JSON.stringify(s));
    await page.mouse.wheel(0, -300); await page.waitForTimeout(400);
    // the taken name: when: "taken" is chosen by what the learner typed; the sidekick says the lesson's refusal; retyping is not exploring
    await page.click('#f'); await page.keyboard.type('taken'); await page.keyboard.press('Enter'); await page.waitForTimeout(700); s = await look();
    assert.ok(s.state === 'typed' && s.f === 'taken' && s.say.kind === '' && s.step.i === 1, 'a name typed again over a step already done: nothing to say: ' + JSON.stringify(s));
    // the button sits on the scrolled state of the same page: found from there without a scroll transition
    await page.click('#btn'); await page.waitForTimeout(700); s = await look();
    assert.ok(s.state === 'refused' && s.f === 'taken' && (await page.evaluate(() => !!document.getElementById('err'))) && s.say.kind === 'bad' && /somebody else's/.test(s.say.text) && s.step.i === 1, 'a taken name takes the refused transition and the sidekick says the lesson\'s refusal: ' + JSON.stringify(s));
    await page.click('#f'); await page.keyboard.type('fresh name'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    // the page change: the press, the load with the content gone, the new screen with the learner's text where the lesson's was; done
    await page.click('#btn'); await page.waitForTimeout(60); const pressed = await look();
    await page.waitForTimeout(330); const loading = await look();
    await page.waitForTimeout(600); s = await look();
    assert.ok(/brightness/.test(pressed.pressed) && !/brightness\(1\)/.test(pressed.pressed), 'the button pressed: ' + pressed.pressed);
    assert.ok(loading.loading && loading.state === 'typed', 'mid-load the content is gone and the page not yet changed: ' + JSON.stringify(loading));
    assert.ok(s.state === 'done' && s.msg === 'Created fresh name' && s.url === 'https://example.test/done?name=fresh name', 'the Done screen carries the learner\'s name where the lesson\'s was, in the page and the address: ' + JSON.stringify(s));
    assert.ok(s.step.done && s.count === 'Done' && s.done === 'The thing is made.' && (await page.evaluate(() => document.body.classList.contains('done'))), 'the sidekick is done in the path\'s words: ' + JSON.stringify(s));
    // back and forward walk the pages
    assert.ok(!s.back && s.forward, 'back is live on the second page: ' + JSON.stringify(s));
    await page.click('#back'); await page.waitForTimeout(300); s = await look();
    assert.ok(s.state === 'typed' && s.url === 'https://example.test/form' && s.f === 'fresh name' && !s.forward, 'back: the form, the learner\'s text still in it: ' + JSON.stringify(s));
    await page.click('#forward'); await page.waitForTimeout(300); s = await look();
    assert.ok(s.state === 'done' && s.forward, 'forward: the Done page again: ' + JSON.stringify(s));
    // the sidekick closes and the page takes the width; it opens again
    await page.click('#sidekick-close'); await page.waitForTimeout(100); s = await look();
    assert.ok(!s.guideShown && s.scale > 0.6, 'the sidekick closed, the page wider: ' + JSON.stringify(s));
    await page.click('#sidekick-open'); await page.waitForTimeout(100); s = await look();
    assert.ok(s.guideShown && s.scale < 0.45, 'the sidekick open again: ' + JSON.stringify(s));
    // R starts over
    await page.keyboard.press('r'); await page.waitForSelector('body.twin-ready', { timeout: 10000 }); s = await look();
    assert.ok(s.state === 'empty' && s.step.i === 0 && !s.step.done, 'R starts over: ' + JSON.stringify(s));
    assert.deepStrictEqual(errs, [], 'no page errors');
    console.log('twin: ' + b.stdout.trim().split(':')[1].trim() + '; the practice browser at ' + s.scale + ' beside the sidekick, 1.25x under zoom; bars sticky in the scroll\'s frame; a bad value said, held and emptied; filled in; refused "taken"; created "fresh name" (page and address); exploring; notices: outside, unbuilt; done; back and forward; the sidekick closed and opened; R starts over');
  } finally { await browser.close(); await served.close(); }
});
