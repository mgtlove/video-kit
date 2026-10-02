/* video-kit engine: the clock, the timeline, seek, the camera, scenes and the card.
   One file, no dependencies, loaded by a video's rig page from rig/engine/.

   The page supplies:
     PARTS      [seconds, ...]   exact length of each voice clip, in order
     timeline() calls at(t, fn) once per beat; t is seconds from the start of the video
     copy()     optional: puts COPY strings into the markup, called once before the first reset
   and calls VK.boot() at the end.

   Contracts (docs/ARCHITECTURE.md):
     - a frame at t equals playback at t. seekTo(t) replays every beat before t (old beats
       snapped, beats still in motion at t re-fired with motion on and held at t minus their
       beat time), so a still is exactly what a viewer would see.
     - beats are replayable from a reset; motion is CSS transitions and animations only;
       no timers; nothing reads the wall clock.
     - positions are measured through the offset chain (pos), never the bounding rectangle,
       so the camera transform cannot poison a measurement.
*/
(function () {
  'use strict';

  var W = 1920, H = 1080;
  var MOTION_WINDOW = 6;          /* seconds: a beat older than this is snapped on seek */
  var $ = function (id) { return document.getElementById(id); };

  var stage, cam, fade;
  var beats = [];                 /* {t, fn, done} */
  var clock = 0, playing = false, lastNow = null, ready = false;
  var TOTAL = 0;

  /* ---------- parts and time ---------- */
  function P(i) { var s = 0; for (var k = 0; k < i; k++) s += window.PARTS[k]; return s; }
  function at(t, fn) { beats.push({ t: t, fn: fn, done: false }); }

  /* ---------- fit the stage to the window (recording is 1:1 only at 1920x1080) ---------- */
  function fit() {
    var s = Math.min(1, innerWidth / W, innerHeight / H);
    stage.style.transform = 'scale(' + s + ')';
    stage.setAttribute('data-scale', s.toFixed(3));
  }

  /* ---------- measurement ---------- */
  function pos(el) {
    var x = 0, y = 0, n = el;
    while (n && n !== cam) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight, x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
  }

  /* ---------- camera ---------- */
  var camState = { x: 0, y: 0, s: 1 }, camNextSec = null, snapping = false;
  function ease(sec) { camNextSec = sec; }                  /* for the next move only */
  function camTo(x, y, s) {
    s = Math.max(1, s);
    x = Math.min(Math.max(x, 0), W - W / s);
    y = Math.min(Math.max(y, 0), H - H / s);
    camState = { x: x, y: y, s: s };
    cam.style.transitionDuration = snapping ? '0s' : (camNextSec || 1.4) + 's';
    camNextSec = null;
    cam.style.transform = 'scale(' + s + ') translate(' + (-x) + 'px,' + (-y) + 'px)';
    if (cardNear !== null) placeCard();
  }
  function focus(cx, cy, s) { camTo(cx - (W / 2) / s, cy - (H / 2) / s, s); }
  function focusEl(id, s, dx, dy) { var p = pos($(id)); focus(p.x + (dx || 0), p.y + (dy || 0), s || 1.3); }
  function travel(id, s, dx, dy) { var e = camNextSec || 3.2; ease(e); focusEl(id, s, dx, dy); }
  function home() { focus(W / 2, H / 2, 1); }

  /* ---------- scenes, elements, the card ---------- */
  function scene(id) {
    var all = document.querySelectorAll('.scene');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i].id === id);
  }
  function show(id, off) { $(id).classList.toggle('on', !off); }
  function fadeTo(clear) { fade.classList.toggle('clear', !!clear); }

  var cardNear = null, cardSide = null;
  var SAFE = { l: 96, t: 54, r: W - 96, b: H - 54 }, GAP = 24;
  function card(text, nearId, side) {
    var c = $('card'); if (!c) return;
    if (!text) { c.classList.remove('on'); cardNear = null; cardSide = null; return; }
    var k = c.querySelector('.kick'), b = c.querySelector('.body');
    if (b) b.textContent = text;
    if (k && window.COPY && window.COPY.cardKicker) k.textContent = window.COPY.cardKicker;
    cardNear = nearId || ''; cardSide = side || null;
    placeCard();
    c.classList.add('on');
  }
  function frameBox(el) {                 /* an element's box on the frame, where the camera is going */
    var p = pos(el), c = camState;
    return { l: (p.l - c.x) * c.s, t: (p.t - c.y) * c.s, w: p.w * c.s, h: p.h * c.s };
  }
  function placeCard() {
    var c = $('card'), w = c.offsetWidth, h = c.offsetHeight, x, y;
    var cx = function (v) { return Math.min(Math.max(v, SAFE.l), SAFE.r - w); };
    var cy = function (v) { return Math.min(Math.max(v, SAFE.t), SAFE.b - h); };
    var el = cardNear ? $(cardNear) : null, b = el ? frameBox(el) : null;
    if (b) {
      var room = [
        { side: 'right', n: SAFE.r - (b.l + b.w) - GAP, need: w },
        { side: 'left',  n: b.l - SAFE.l - GAP,         need: w },
        { side: 'below', n: SAFE.b - (b.t + b.h) - GAP, need: h },
        { side: 'above', n: b.t - SAFE.t - GAP,         need: h }
      ].filter(function (o) { return o.n >= o.need || o.side === cardSide; })
       .sort(function (a, z) { return (z.side === cardSide) - (a.side === cardSide) || (z.n - z.need) - (a.n - a.need); });
      var pick = room.length ? room[0].side : null;
      if (pick === 'right') { x = cx(b.l + b.w + GAP); y = cy(b.t + b.h / 2 - h / 2); }
      else if (pick === 'left') { x = cx(b.l - GAP - w); y = cy(b.t + b.h / 2 - h / 2); }
      else if (pick === 'below') { y = cy(b.t + b.h + GAP); x = cx(b.l + b.w / 2 - w / 2); }
      else if (pick === 'above') { y = cy(b.t - GAP - h); x = cx(b.l + b.w / 2 - w / 2); }
    }
    if (x === undefined) { x = SAFE.r - w; y = SAFE.b - h; }   /* bottom right, inside title safe */
    c.style.left = Math.round(x) + 'px'; c.style.top = Math.round(y) + 'px';
  }

  /* ---------- reset, play, seek ---------- */
  var resetHooks = [];
  function onReset(fn) { resetHooks.push(fn); }
  function resetAll() {
    playing = false; clock = 0; lastNow = null; camNextSec = null;
    stage.classList.add('snap');                      /* a reset never animates, and it cancels anything in flight */
    var touched = document.querySelectorAll('.on, .clear');
    for (var i = 0; i < touched.length; i++) { touched[i].classList.remove('on'); touched[i].classList.remove('clear'); }
    for (var j = 0; j < baked.length; j++) baked[j][0].style.removeProperty(baked[j][1]);
    baked = [];
    cardNear = null; cardSide = null;
    for (var k = 0; k < resetHooks.length; k++) resetHooks[k]();
    snapping = true; home(); snapping = false;
    void stage.offsetHeight;
    stage.classList.remove('snap');
    beats = []; window.timeline(); beats.sort(function (a, b) { return a.t - b.t; });
  }
  /* holdAll(anims, msOf): each animation held at msOf(a) and then baked: the value it has at
     that time is read on the main thread, written inline with transitions off for one style
     flush, and the animation is cancelled. A held animation left to the compositor is drawn on
     the compositor's own clock, which steps about every 10 ms with a phase that differs between
     browser sessions, so the same still could differ by a few levels from one run to the next;
     and cancelling a transition after an inline write without transitions off starts a new one.
     Transitions only; a keyframe animation stays held. Every value is read before any is
     written, because writing one element's value cancels its other transitions. */
  var baked = [];
  function holdAll(anims, msOf) {
    var i, a, el, prop, items = [];
    for (i = 0; i < anims.length; i++) {
      a = anims[i]; a.pause();
      try { a.currentTime = msOf(a); } catch (e) { continue; }   /* a finished animation is gone already */
      el = a.effect && a.effect.target; prop = a.transitionProperty;
      if (el && prop) items.push({ a: a, el: el, prop: prop, v: getComputedStyle(el).getPropertyValue(prop), tp: el.style.getPropertyValue('transition-property') });
    }
    for (i = 0; i < items.length; i++) {
      el = items[i].el;
      el.style.setProperty('transition-property', 'none');
      el.style.setProperty(items[i].prop, items[i].v);
      items[i].a.cancel();
      baked.push([el, items[i].prop]);
    }
    if (items.length) void stage.offsetHeight;
    for (i = 0; i < items.length; i++) {
      el = items[i].el;
      if (items[i].tp) el.style.setProperty('transition-property', items[i].tp); else el.style.removeProperty('transition-property');
    }
  }
  function fireSnapped(b) {
    stage.classList.add('snap'); b.fn(); b.done = true;
    void stage.offsetHeight;                          /* flush the style with transitions off */
    stage.classList.remove('snap');
  }
  function fireLive(b, holdSec) {
    var before = document.getAnimations ? document.getAnimations() : [];
    b.fn(); b.done = true;
    void stage.offsetHeight;                          /* start the transitions now */
    if (!document.getAnimations) return;
    var after = document.getAnimations(), fresh = [];
    for (var i = 0; i < after.length; i++) if (before.indexOf(after[i]) < 0) fresh.push(after[i]);
    holdAll(fresh, function () { return Math.max(0, holdSec * 1000); });
  }
  /* seekTo(t): the still frame at t, exactly as playback would show it */
  function seekTo(t) {
    resetAll();
    cam.style.transitionDuration = '0s';
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.t > t) break;
      if (t - b.t > MOTION_WINDOW) fireSnapped(b);
      else { snapping = false; fireLive(b, t - b.t); }
    }
    clock = t;
  }
  /* playTo(t, done): real playback from 0 to t, then everything paused. done(reached)
     gets the exact time the picture shows, read off the animations themselves: a beat
     fires on a frame boundary, up to a frame after its time, and the clock is read at
     the top of a frame, so the animations' own time is the truth. A seek to `reached`
     reproduces this frame; that is the proof vkit check runs. */
  var live = [];
  function playTo(t, done) {
    resetAll(); live = []; clock = 0; playing = true;
    var check = function () {
      if (clock >= t || !playing) {
        playing = false;
        var all = document.getAnimations ? document.getAnimations() : [];
        for (var i = 0; i < all.length; i++) all[i].pause();
        var reached = -1;
        for (var k = 0; k < live.length; k++) {
          var a = live[k][0], bt = live[k][1];
          if (a.currentTime !== null && a.currentTime < a.effect.getComputedTiming().endTime) reached = Math.max(reached, bt + a.currentTime / 1000);
        }
        if (reached < 0) reached = clock;
        clock = reached;
        holdAll(all.filter(function (a) { return a.currentTime !== null; }), function (a) { return a.currentTime; });   /* baked, like a seek */
        requestAnimationFrame(function () { requestAnimationFrame(function () { done(reached); }); });
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }
  /* recording mode: no start panel, no hud; what the frame shows is the footage */
  function recording(on) {
    var ui = $('ui'), hud = $('hud');
    if (ui) { ui.classList.toggle('gone', !!on); ui.style.display = on ? 'none' : ''; }   /* gone at once; its fade would sit over the footage */
    if (hud) hud.style.display = on ? 'none' : '';
  }
  function tick(now) {
    if (playing) {
      if (lastNow !== null) clock += (now - lastNow) / 1000;
      lastNow = now;
      for (var i = 0; i < beats.length; i++) {
        var b = beats[i];
        if (!b.done && b.t <= clock) {
          var before = document.getAnimations ? document.getAnimations() : [];
          b.fn(); b.done = true; void stage.offsetHeight;
          if (document.getAnimations) { var after = document.getAnimations(); for (var k = 0; k < after.length; k++) if (before.indexOf(after[k]) < 0) live.push([after[k], b.t]); }
        }
      }
      if (clock >= TOTAL + 3) playing = false;
    } else lastNow = null;
    var hud = $('hud'); if (hud) hud.textContent = clock.toFixed(2) + 's' + (playing ? '' : ' (paused)');
    requestAnimationFrame(tick);
  }

  /* ---------- start panel and keys ---------- */
  function start() { var ui = $('ui'); if (ui) ui.classList.add('gone'); resetAll(); playing = true; }
  function keys(e) {
    if (e.key === ' ' || e.key === 's' || e.key === 'S') { e.preventDefault(); if (!playing && clock === 0) start(); else playing = !playing; }
    else if (e.key === 'r' || e.key === 'R') { resetAll(); }
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= window.PARTS.length) { seekTo(P(Number(e.key) - 1)); playing = true; var ui = $('ui'); if (ui) ui.classList.add('gone'); }
  }

  /* ---------- boot ---------- */
  function boot() {
    stage = $('stage'); cam = $('cam'); fade = $('fade');
    TOTAL = P(window.PARTS.length);
    if (typeof window.copy === 'function') window.copy();
    addEventListener('resize', fit); fit();
    addEventListener('keydown', keys);
    var btn = $('start'); if (btn) btn.addEventListener('click', start);
    var pre = $('pre'); if (pre) pre.textContent = window.PARTS.length + ' parts, ' + TOTAL.toFixed(1) + ' s. Stage scale ' + stage.getAttribute('data-scale') + (stage.getAttribute('data-scale') === '1.000' ? '' : ' (not 1:1; record on a 1920x1080 page)');
    var go = function () {
      if (typeof window.doodles === 'function') window.doodles();   /* after fonts and copy, so sizes are right */
      resetAll(); ready = true; requestAnimationFrame(tick);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  window.VK = {
    version: '0.1.1',
    boot: boot, at: at, P: P, total: function () { return TOTAL; }, parts: function () { return window.PARTS.slice(); },
    beats: function () { return beats.map(function (b) { return b.t; }); },
    ready: function () { return ready; },
    seekTo: seekTo, playTo: playTo, reset: resetAll, onReset: onReset, recording: recording,
    scene: scene, show: show, fade: fadeTo, card: card,
    focus: focus, focusEl: focusEl, travel: travel, ease: ease, home: home, camTo: camTo, pos: pos,
    W: W, H: H
  };
  /* short names for the page's timeline */
  window.at = at; window.P = P;
  window.scene = scene; window.show = show; window.fade = fadeTo; window.card = card;
  window.focusAt = focus; window.focusEl = focusEl; window.travel = travel; window.ease = ease; window.home = home; window.pos = pos;
})();
