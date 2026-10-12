/* The twin runner (docs/MODEL.md): a learner's hand on the app model, in a page that behaves like a page, with the
   sidekick beside it. The page is the kit's engine with the app's states and model and no timeline. This script:
   - frames the screen in a practice browser: back, forward, the page's real address (from the captures) in a
     field that cannot be typed in, "Practice copy of ..., not the product"
   - scales the 1920 px page to the width the browser has at 100 percent (CSS zoom, a layout scale) and shows it at
     its full captured height, so the browser's own scrollbar and wheel scroll it; under the browser's own zoom the
     page keeps that scale, growing with the zoom and scrolling sideways as a fixed-width page does; and the
     product's top bars and footer stay pinned as they do on the real page (position sticky, moved by the
     compositor in the scroll's own frame; the captured scrollbar thumb is hidden; the browser's is the real one,
     always shown)
   - turns real clicks into the model's transitions through VK.perform (the same code a video's act() uses on the
     clock): the press, the load, the morph; the scrolled states of one page are one page here, so a control is
     found from any of them
   - drops a real text input onto a field named in a type transition, matching the field's own box; Enter or
     clicking away keeps the text, Escape puts it back; nothing typed means nothing typed (the field goes back to
     empty, no name is forced); the lesson's value for that field (the typed state's own text) is replaced by the
     learner's wherever it appears afterwards, in the page and in the address
   - checks a typed value against the field's rules (model.json, fields.<id>.rules, each in the console's own
     words with its source): a value that breaks one stays in the field, the sidekick says the rule, and a click that
     would submit it is held until the value passes; a value in the field's taken list takes the when: "taken"
     transition the captures showed
   - runs the sidekick (window.TWIN_PATH, the app's paths/<name>.json): the goal, the step's control, what to do and
     why in the lesson's words, a ring around the step's control (the kit's, outside the control), Fill it in for
     me on a typed field, Show me, Start over; a click that the model answers but is not the step is "exploring",
     with the way back; a click on a later step skips to it and says what was skipped; the last step landing is
     done. The sidekick is beside the simulated screen, never on it, in a colour the product never uses.
   - shows the notice for a click the model has nothing for: "captured, not built" when the model leads to a state
     the manifest cites and no file exists, "outside" when there is nothing
   Generic: nothing here names any product; the app's words, pixels, addresses, rules and path come with the app. */
(function () {
  var M = window.MODEL || { start: null, transitions: [], fields: {}, notice: {} };
  var URLS = window.TWIN_URLS || {};
  var P = window.TWIN_PATH || null;
  var VK = window.VK, W = 1920, H0 = 1080;
  var NOTICE = Object.assign({ unbuilt: 'That screen was captured and is not built yet in this practice copy.', outside: 'Not part of this practice. Follow the step the lesson showed.' }, M.notice || {});
  var S = { mock: null, view: null, stage: null, fit: null, scale: 1, zoom: 1, learner: {}, lesson: {}, editing: null, page: null, history: [], at: -1, pinning: false, last: null };
  var G = { i: 0, done: false, skipped: [], ring: null, say: null };

  function $(id) { return document.getElementById(id); }
  function from() { return VK.screenState(); }
  function sameScreen(a, b) { return !!(window.SCREENS && window.SCREENS[a] && window.SCREENS[a] === window.SCREENS[b]); }
  function pageOf(state) {   /* the states joined to this one by scroll transitions on the same screen: one page, scrolled */
    var set = {}; set[state] = 1; var grew = true;
    while (grew) {
      grew = false;
      (M.transitions || []).forEach(function (t) {
        if (t.action !== 'scroll' || !sameScreen(t.from, t.to)) return;
        if (set[t.from] && !set[t.to]) { set[t.to] = 1; grew = true; }
        if (set[t.to] && !set[t.from]) { set[t.from] = 1; grew = true; }
      });
    }
    return Object.keys(set);
  }
  function transitionsFor(control) { var here = pageOf(from()); return (M.transitions || []).filter(function (t) { return t.control === control && here.indexOf(t.from) >= 0; }); }
  function whenFor(control) {
    var ts = transitionsFor(control), f;
    if (!ts.some(function (t) { return t.when === 'taken'; })) return undefined;
    for (f in (M.fields || {})) if (S.learner[f] && (M.fields[f].taken || []).indexOf(S.learner[f]) >= 0) return 'taken';
    return undefined;
  }
  function lookup(control) {   /* the current state first, then the other states of this page */
    var cur = from(), order = [cur].concat(pageOf(cur).filter(function (s) { return s !== cur; })), when = whenFor(control), i, tr;
    for (i = 0; i < order.length; i++) { tr = VK.transitionFor(order[i], control, when) || VK.transitionFor(order[i], control); if (tr) return { tr: tr, from: order[i] }; }
    return null;
  }
  function leafOf(el) {
    if (!el) return null;
    if (!el.firstElementChild) return el;
    var all = el.querySelectorAll('*'), i;
    for (i = 0; i < all.length; i++) if (!all[i].firstElementChild && all[i].textContent.trim()) return all[i];
    for (i = 0; i < all.length; i++) if (!all[i].firstElementChild) return all[i];
    return el;
  }
  function stateHtml(id) { return (window.STATES && window.STATES[id]) || ''; }
  function lessonValue(stateId, control) {
    var tpl = document.createElement('template'); tpl.innerHTML = stateHtml(stateId);
    var leaf = leafOf(tpl.content.querySelector('#' + control));
    return leaf ? leaf.textContent.trim() : '';
  }
  function words(text) {   /* the learner's words where the lesson's were */
    var k; for (k in S.learner) if (S.lesson[k] && S.learner[k] && S.learner[k] !== S.lesson[k] && text.indexOf(S.lesson[k]) >= 0) text = text.split(S.lesson[k]).join(S.learner[k]);
    return text;
  }
  function substitute() {
    var keys = Object.keys(S.learner).filter(function (k) { return S.lesson[k] && S.learner[k] && S.learner[k] !== S.lesson[k]; });
    if (!keys.length || !S.mock) return;
    var walker = document.createTreeWalker(S.mock, NodeFilter.SHOW_TEXT), node;
    while ((node = walker.nextNode())) { var v = words(node.nodeValue); if (v !== node.nodeValue) node.nodeValue = v; }
  }
  function notice(text) {
    var n = $('notice'); if (!n) return;
    n.textContent = text; n.classList.add('on');
    clearTimeout(notice.t); notice.t = setTimeout(function () { n.classList.remove('on'); }, 2600);
  }
  function mark() {
    if (!S.mock) return;
    var live = S.mock.querySelectorAll('.twin-live'), i, here = pageOf(from());
    for (i = 0; i < live.length; i++) live[i].classList.remove('twin-live');
    (M.transitions || []).forEach(function (t) { if (t.control && here.indexOf(t.from) >= 0) { var el = $(t.control); if (el) el.classList.add('twin-live'); } });
  }

  /* ---- the field's rules ---- */
  function rulesFor(control) { return (M.fields && M.fields[control] && M.fields[control].rules) || []; }
  function broken(control, text) {   /* the first rule the text breaks, or null */
    var rules = rulesFor(control), i;
    for (i = 0; i < rules.length; i++) { try { if (!new RegExp(rules[i].test).test(text)) return rules[i]; } catch (e) { /* a rule that is not a regular expression is not a rule */ } }
    return null;
  }
  function brokenHere() {   /* a field on this page holding a value that breaks a rule */
    var here = pageOf(from()), f, tr;
    for (f in (M.fields || {})) {
      if (!S.learner[f]) continue;
      tr = (M.transitions || []).some(function (t) { return t.control === f && here.indexOf(t.from) >= 0; });
      if (tr && broken(f, S.learner[f])) return { control: f, rule: broken(f, S.learner[f]) };
    }
    return null;
  }

  /* ---- the page: shown whole, scaled to the width, the chrome pinned, the thumb hidden ---- */
  function scrollTopOf(stateId) {   /* where the page sits in a state: the top of the tallest data-scrolls element */
    var re = /data-scrolls[^>]*top:\s*(-?[\d.]+)px;?\s*height:\s*([\d.]+)px/g, m, best = null, tall = -1, html = stateHtml(stateId);
    while ((m = re.exec(html))) if (parseFloat(m[2]) > tall) { tall = parseFloat(m[2]); best = parseFloat(m[1]); }
    return best;
  }
  function layout() {
    var mock = S.mock, scrolls = Array.prototype.slice.call(mock.querySelectorAll('[data-scrolls]')), page = null, tall = -1, H = H0;
    scrolls.forEach(function (el) { var h = parseFloat(el.style.height) || el.offsetHeight || 0; if (h > tall) { tall = h; page = el; } });
    S.page = page;
    if (page) {
      page.style.top = '0px';
      H = Math.max(H0, tall);
      scrolls.forEach(function (el) { if (el === page) return; el.style.visibility = 'hidden'; var p = el.parentElement; if (p && p !== mock && p.children.length === 1) p.style.visibility = 'hidden'; });
    }
    H = Math.max(H, S.view.clientHeight / ((S.view.clientWidth + window.innerWidth * (browserZoom() - 1)) / W));   /* a page shorter than the browser fills it, so the footer sits at the bottom as the real one does; the ground below the captured page is the product's own */
    mock.style.height = H + 'px'; mock.style.overflow = 'visible';
    S.stage.style.height = H + 'px';
    fitWidth();
  }
  function pinBars() {   /* the product's own top bars and footer stay where the real page keeps them: position sticky in the browser's
                           own scroll, so the compositor moves them in the scroll's own frame (moving them from a scroll event is a
                           frame late and shimmers; sticky under a transform moves at the wrong rate, which is why the page is scaled
                           with zoom). A bar goes into the flow at its own place with a margin, so nothing moves until the page
                           scrolls under it. A footer is stuck to the top too, a viewport's height down, so its bottom sits where the real one does: a sticky
                           element never leaves its containing block, so it stops at the page's end as a real footer does, and the
                           margin that a sticky bottom would need is what the containing block forbids. A recreated screen places
                           every element by left and top, so only the bars take flow room. */
    var cursor = 0, vh = S.view.clientHeight / S.scale;
    Array.prototype.slice.call(S.mock.children).forEach(function (el) {
      if (!el.hasAttribute('data-chrome')) return;
      var top = parseFloat(el.style.top) || parseFloat(getComputedStyle(el).top) || 0, h = el.offsetHeight;
      if (el.getAttribute('data-chrome-top') === null) el.setAttribute('data-chrome-top', top);   /* its own top, kept for the next layout */
      top = parseFloat(el.getAttribute('data-chrome-top'));
      var foot = top > H0 / 2;
      el.style.position = 'sticky'; el.style.bottom = 'auto';
      el.style.top = (foot ? Math.max(cursor, vh - (H0 - top)) : top).toFixed(2) + 'px';
      el.style.marginTop = (foot ? 0 : top - cursor) + 'px'; cursor += h + (foot ? 0 : top - cursor);
    });
  }
  function browserZoom() {   /* the browser's own zoom: the window's width in screen pixels over its width in CSS pixels (1 when it cannot be read) */
    var z = window.outerWidth / window.innerWidth;
    return (isFinite(z) && z > 0.5 && z < 6) ? z : 1;
  }
  function fitWidth() {   /* the page scaled to the width the browser has at 100 percent, with CSS zoom (a layout scale: sticky bars and the
                             browser's scroll agree on it). Under the browser's own zoom the page keeps that scale, so it grows and shrinks
                             with the zoom as a fixed-width page does and the view scrolls sideways; fit to the zoomed width instead and
                             zooming in made the page smaller, since the sidekick and the gaps kept their pixels. */
    var z = browserZoom(), s = (S.view.clientWidth + window.innerWidth * (z - 1)) / W; S.scale = s; S.zoom = z;
    S.stage.style.transform = 'none'; S.stage.style.zoom = s; S.stage.setAttribute('data-scale', s.toFixed(3));
    S.fit.style.width = Math.max(S.view.clientWidth, W * s) + 'px';
    S.fit.style.height = ((parseFloat(S.stage.style.height) || H0) * s) + 'px';
    pinBars(); ring();
  }
  function scrollToState(stateId, smooth) {
    var top = scrollTopOf(stateId); if (top === null) return;
    S.view.scrollTo({ top: -top * S.scale, behavior: smooth ? 'smooth' : 'auto' });
  }
  function scrollToControl(control) {   /* the control centred in the view, as the step says to scroll to it */
    var el = $(control); if (!el) return;
    var mr = S.mock.getBoundingClientRect(), r = el.getBoundingClientRect();
    var y = (r.top - mr.top) + S.view.scrollTop - S.view.clientHeight / 2 + r.height / 2;
    S.view.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  /* ---- the address and the history ---- */
  function showUrl() { var t = $('url-text'); if (t) t.textContent = words(URLS[from()] || ''); }
  function remember(stateId) {   /* a page change is a history entry; a change in place is not */
    if (S.at >= 0 && sameScreen(S.history[S.at], stateId)) { S.history[S.at] = stateId; return; }
    S.history = S.history.slice(0, S.at + 1); S.history.push(stateId); S.at = S.history.length - 1;
    buttons();
  }
  function buttons() { $('back').disabled = S.at <= 0; $('forward').disabled = S.at >= S.history.length - 1; }
  function go(delta) {
    var i = S.at + delta; if (i < 0 || i >= S.history.length) return;
    S.at = i; S.pinning = true; VK.state(S.history[i]); S.pinning = false; buttons(); scrollToState(S.history[i], false);
  }

  /* ---- typing: a real input over the field, the field's own box ---- */
  function emptyStateFor(control, typedState) {   /* the state the field is empty in: a type transition into the typed state from another state */
    var ts = (M.transitions || []).filter(function (t) { return t.control === control && t.action === 'type' && t.to === typedState && t.from !== t.to && window.STATES[t.from]; });
    return ts.length ? ts[0].from : null;
  }
  function endEdit(commit) {
    if (!S.editing) return;
    var e = S.editing; S.editing = null;
    var text = e.input.value.trim();
    e.input.remove(); e.leaf.style.visibility = '';
    if (!commit) return;
    if (!text) {   /* nothing typed is nothing typed: the field empty again, no name forced */
      var had = !!S.learner[e.control]; delete S.learner[e.control];
      var empty = emptyStateFor(e.control, e.tr.to);
      if (had && empty && empty !== from()) { S.pinning = true; VK.state(empty); S.pinning = false; }
      say(null); sidekick();
      return;
    }
    S.learner[e.control] = text;
    perform(e.control, e.from, { typed: true });
  }
  function startEdit(control, tr, fromState) {
    var el = $(control), leaf = leafOf(el); if (!el || !leaf) return;
    S.lesson[control] = S.lesson[control] || lessonValue(tr.to, control);
    var mr = S.mock.getBoundingClientRect(), lr = leaf.getBoundingClientRect(), er = el.getBoundingClientRect(), cs = getComputedStyle(leaf), s = S.scale;
    var input = document.createElement('input');
    input.id = 'twin-input'; input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('aria-label', (M.fields && M.fields[control] && M.fields[control].label) || control);
    input.style.left = ((er.left - mr.left) / s).toFixed(2) + 'px'; input.style.top = ((er.top - mr.top) / s).toFixed(2) + 'px';
    input.style.width = (er.width / s).toFixed(2) + 'px'; input.style.height = (er.height / s).toFixed(2) + 'px';
    input.style.paddingLeft = Math.max(0, (lr.left - er.left) / s).toFixed(2) + 'px'; input.style.paddingRight = '8px';
    input.style.font = cs.font; input.style.fontStyle = 'normal'; input.style.color = cs.color; input.style.letterSpacing = cs.letterSpacing;
    var shown = leaf.textContent.trim();
    if (shown && shown !== S.lesson[control] && shown !== S.learner[control]) input.placeholder = shown;   /* the field's own placeholder stays a placeholder */
    input.value = S.learner[control] || '';
    leaf.style.visibility = 'hidden';
    S.mock.appendChild(input);
    S.editing = { control: control, leaf: leaf, input: input, from: fromState, tr: tr };
    input.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); endEdit(true); } else if (ev.key === 'Escape') { ev.preventDefault(); endEdit(false); } });
    input.addEventListener('blur', function () { if (S.editing && S.editing.input === input) endEdit(true); });
    input.focus(); input.select();
    if (step() && step().control === control) say('note', 'Typing', 'Enter or clicking away keeps what you typed. Escape puts it back.');
  }

  /* ---- a click ---- */
  function perform(control, fromState, opts) {
    opts = opts || {};
    if (fromState && fromState !== from()) { S.pinning = true; VK.state(fromState); S.pinning = false; }   /* the page's state the control belongs to; no visible change, the page is shown whole */
    if (!opts.typed) {   /* a click that would carry a value the rules refuse is held, and the sidekick says which rule */
      var bad = brokenHere();
      if (bad) { say('bad', 'Not accepted', bad.rule.says); scrollToControl(bad.control); loud(bad.control); return null; }
    }
    var when = whenFor(control), here = from();
    var tr = VK.perform(control, { when: when });
    if (!tr) return null;
    S.last = { control: control, when: tr.when };
    if (tr.to === here) setTimeout(rerender, 200);   /* a transition to the state already up (a name typed over itself): the engine's state() is a no-op on the same id, so the page is drawn again with the new words */
    else { var same = sameScreen(here, tr.to); setTimeout(function () { scrollToState(tr.to, true); }, same ? 260 : 760); }
    return tr;
  }
  function rerender() { S.mock.innerHTML = stateHtml(from()); S.mock.classList.add('on'); afterState(from()); }
  function onClick(ev) {
    if (S.editing) { if (ev.target === S.editing.input) return; endEdit(true); return; }
    var el = ev.target, control = null, found = null;
    while (el && el !== S.mock) { if (el.id) { found = lookup(el.id); if (found) { control = el.id; break; } } el = el.parentElement; }
    if (!control) {
      var idEl = ev.target.closest ? ev.target.closest('[id]') : null, id = idEl ? idEl.id : null;
      var any = (M.transitions || []).filter(function (t) { return t.control === id && pageOf(from()).indexOf(t.from) >= 0; });
      notice(any.length && any.some(function (t) { return !window.STATES[t.to]; }) ? NOTICE.unbuilt : NOTICE.outside);
      return;
    }
    if (!window.STATES[found.tr.to]) { notice(NOTICE.unbuilt); return; }
    if (found.tr.action === 'type') { startEdit(control, found.tr, found.from); return; }
    perform(control, found.from);
  }
  function onKey(ev) {
    if (S.editing) return;   /* the input has its own keys */
    if (ev.key === 'r' || ev.key === 'R') { ev.stopImmediatePropagation(); location.reload(); }
  }

  /* ---- the sidekick ---- */
  function steps() { return (P && P.steps) || []; }
  function step() { return G.done ? null : steps()[G.i] || null; }
  function labelOf(control) {   /* the step's label, else what the control says on screen, else its id */
    var st = steps().filter(function (s) { return s.control === control; })[0]; if (st && st.label) return st.label;
    var leaf = leafOf($(control)), t = leaf ? leaf.textContent.trim() : '';
    return t ? t.slice(0, 40) : control;
  }
  function actionOf(control) { var ts = (M.transitions || []).filter(function (t) { return t.control === control; }); return ts.length ? ts[0].action : 'click'; }
  function onPage(control) { return !!$(control) && (M.transitions || []).some(function (t) { return t.control === control && pageOf(from()).indexOf(t.from) >= 0; }); }
  function wayTo(control) {   /* the first control to click to reach a page where the control is live: a breadth-first walk of the model's clicks */
    var start = from(), seen = {}, queue = [{ state: start, first: null }], here, i, t;
    pageOf(start).forEach(function (s) { seen[s] = 1; });
    while (queue.length) {
      here = queue.shift();
      if ((M.transitions || []).some(function (x) { return x.control === control && pageOf(here.state).indexOf(x.from) >= 0; }) && here.first) return here.first;
      for (i = 0; i < (M.transitions || []).length; i++) {
        t = M.transitions[i];
        if (!t.control || t.when || pageOf(here.state).indexOf(t.from) < 0 || seen[t.to] || !window.STATES[t.to]) continue;
        pageOf(t.to).forEach(function (s) { seen[s] = 1; });
        queue.push({ state: t.to, first: here.first || t.control });
      }
    }
    return null;
  }
  function say(kind, head, text) {
    var el = $('sidekick-say'); if (!el) return;
    el.className = ''; el.textContent = '';
    if (!kind) return;
    var h = document.createElement('span'); h.className = 'g-micro'; h.textContent = head; el.appendChild(h);
    el.appendChild(document.createTextNode(text)); el.className = kind;
  }
  function drawRing(control, loudly) {   /* a ring around a control, the kit's, outside the product's own box; inside a pinned bar it rides with the bar */
    var el = $(control); if (!el || !S.mock) return null;
    var host = el.closest('[data-chrome]') || S.mock, hr = host.getBoundingClientRect(), r = el.getBoundingClientRect(), s = S.scale, pad = 6;
    var ringEl = document.createElement('div'); ringEl.className = 'sidekick-ring' + (loudly ? ' loud' : '');
    ringEl.style.left = ((r.left - hr.left) / s - pad).toFixed(2) + 'px'; ringEl.style.top = ((r.top - hr.top) / s - pad).toFixed(2) + 'px';
    ringEl.style.width = (r.width / s + 2 * pad).toFixed(2) + 'px'; ringEl.style.height = (r.height / s + 2 * pad).toFixed(2) + 'px';
    host.appendChild(ringEl); return ringEl;
  }
  function ring(loudly) {   /* the ring around the step's control */
    if (G.ring) { G.ring.remove(); G.ring = null; }
    var st = step(); if (!st || !onPage(st.control)) return;
    G.ring = drawRing(st.control, loudly); if (G.ring) G.ring.id = 'sidekick-ring';
  }
  function loud(control) {   /* a moment's attention on a control, the step's or another */
    var st = step();
    if (st && st.control === control) { ring(true); setTimeout(function () { ring(false); }, 1300); return; }
    var r = drawRing(control, true); if (r) setTimeout(function () { r.remove(); }, 1300);
  }
  function sidekick() {   /* the panel from the step */
    if (!$('sidekick')) return;
    var st = step(), total = steps().length, badges = $('sidekick-badges');
    $('sidekick-goal-text').textContent = P ? (P.goal || P.path || '') : 'No path yet';
    $('sidekick-count').textContent = G.done ? 'Done' : (total ? 'Step ' + (G.i + 1) + ' of ' + total : '');
    badges.textContent = '';
    document.body.classList.toggle('done', G.done);
    if (!P) {
      $('sidekick-label').textContent = ''; $('sidekick-do').textContent = 'This practice copy has no path yet. Click where the lesson showed; a control the model answers is live under the hand.'; $('sidekick-why').hidden = true;
      $('fill').hidden = true; $('show').hidden = true; return;
    }
    if (G.done) {
      $('sidekick-label').textContent = ''; $('sidekick-do').textContent = ''; $('sidekick-why').hidden = true;
      G.skipped.forEach(function (sk) { var k = document.createElement('span'); k.className = 'g-badge skipped'; k.textContent = 'Skipped: ' + (sk.label || sk.control); badges.appendChild(k); });
      $('sidekick-done-text').textContent = (P.done || 'Every step of the path is done.') + (G.skipped.length ? ' Start over to walk the step' + (G.skipped.length > 1 ? 's' : '') + ' you skipped.' : '');
      $('fill').hidden = true; $('show').hidden = true; return;
    }
    var action = actionOf(st.control), here = onPage(st.control);
    var b = document.createElement('span'); b.className = 'g-badge'; b.textContent = action === 'type' ? 'Type' : 'Click'; badges.appendChild(b);
    G.skipped.forEach(function (sk) { var k = document.createElement('span'); k.className = 'g-badge skipped'; k.textContent = 'Skipped: ' + (sk.label || sk.control); badges.appendChild(k); });
    $('sidekick-label').textContent = st.label || labelOf(st.control);
    $('sidekick-do').textContent = st.do || '';
    $('sidekick-why').hidden = !st.why; $('sidekick-why-text').textContent = st.why || '';
    $('fill').hidden = !(action === 'type' && here); $('show').hidden = !here;
    if (!here) { var way = wayTo(st.control); say('explore', 'Off the path', way ? 'This step is on another screen. To get back to it, click ' + labelOf(way) + '.' : 'This step is on another screen this practice copy cannot reach from here. Start over to walk the path again.'); }
    ring(false);
  }
  function advance(control, tr) {   /* after a transition the learner took: the step done, a later step skipped to, or exploring */
    var st = step(); if (!st) return;
    if (tr && tr.when === 'taken') {   /* the refusal the captures showed; the lesson's words for it sit on the field's own step */
      var f, fs = null; for (f in (M.fields || {})) if (S.learner[f] && (M.fields[f].taken || []).indexOf(S.learner[f]) >= 0) { fs = steps().filter(function (x) { return x.control === f; })[0]; break; }
      say('bad', 'Refused', (fs && fs.refused) || 'The captures showed this value refused. Type another.'); if (f) loud(f); return;
    }
    if (actionOf(control) === 'type' && S.learner[control] && broken(control, S.learner[control])) { say('bad', 'Not accepted', broken(control, S.learner[control]).says); loud(control); return; }
    var idx = -1, i;
    for (i = G.i; i < steps().length; i++) if (steps()[i].control === control) { idx = i; break; }
    if (idx < 0) {
      for (i = 0; i < G.i; i++) if (steps()[i].control === control) { say(null); sidekick(); return; }   /* a step already done, done again (a name retyped): nothing to say */
      say('explore', 'Exploring', 'You clicked ' + labelOf(control) + '. The step is still: ' + (st.do || st.label || st.control)); sidekick(); return;
    }
    if (idx > G.i) G.skipped = G.skipped.concat(steps().slice(G.i, idx));
    say(null);
    if (idx + 1 >= steps().length) { G.done = true; } else { G.i = idx + 1; }
    sidekick();
  }
  function fill() {   /* the lesson's own value typed into the step's field, one field per click, the transition it leads to taken */
    var st = step(); if (!st || actionOf(st.control) !== 'type') return;
    var found = lookup(st.control); if (!found) return;
    if (S.editing) endEdit(false);
    S.lesson[st.control] = S.lesson[st.control] || lessonValue(found.tr.to, st.control);
    S.learner[st.control] = st.fill || S.lesson[st.control];
    say(null);
    perform(st.control, found.from, { typed: true });
  }
  function show() { var st = step(); if (!st) return; if (onPage(st.control)) { scrollToControl(st.control); loud(st.control); } }
  function openGuide(on) { document.body.classList.toggle('no-sidekick', !on); $('sidekick-open').hidden = on; fitWidth(); }

  function afterState(id) {   /* after every state change, and after a page drawn again in the same state */
    substitute(); layout(); mark(); showUrl(); if (!S.pinning) remember(id);
    if (S.last) { var l = S.last; S.last = null; advance(l.control, { when: l.when }); } else ring(false);
  }
  function begin() {
    S.mock = $('mock'); S.view = $('view'); S.stage = $('stage'); S.fit = $('fit');
    VK.onState(afterState);
    VK.fade(true); VK.scene(null); VK.home();
    if (M.start) VK.state(M.start);
    S.mock.addEventListener('click', onClick);
    window.addEventListener('resize', layout);
    window.addEventListener('keydown', onKey, true);
    $('back').addEventListener('click', function () { go(-1); });
    $('forward').addEventListener('click', function () { go(1); });
    $('restart').addEventListener('click', function () { location.reload(); });
    $('fill').addEventListener('click', fill);
    $('show').addEventListener('click', show);
    $('sidekick-close').addEventListener('click', function () { openGuide(false); });
    $('sidekick-open').addEventListener('click', function () { openGuide(true); });
    buttons(); sidekick();
    document.body.classList.add('twin-ready');
  }
  function ready() { if (VK && VK.ready()) begin(); else setTimeout(ready, 30); }
  window.TWIN = { learner: S.learner, lesson: S.lesson, state: from, notice: notice, url: function () { return $('url-text').textContent; }, scale: function () { return S.scale; }, zoom: function () { return S.zoom; }, history: function () { return { list: S.history.slice(), at: S.at }; }, step: function () { return { i: G.i, done: G.done, control: step() ? step().control : null, skipped: G.skipped.map(function (s) { return s.control; }) }; }, say: function () { var el = $('sidekick-say'); return { kind: el.className, text: el.textContent }; }, broken: broken };
  ready();
})();
