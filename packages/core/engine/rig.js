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
  /* at(t, fn, minor): a beat. A minor beat (one character of typing) is not a moment vkit frames
     samples; VK.beats() leaves them out. */
  function at(t, fn, minor) { beats.push({ t: t, fn: fn, done: false, minor: !!minor }); }

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

  /* state(id): the recreated screen. With states present (window.STATES, written by vkit new
     --app from the app's states/), state `id` fills #mock and shows; with none, the inline
     #mock shows as it is. state(null) hides it. (Not named screen: window.screen is the
     browser's display object.) On every reset #mock goes back to the markup
     the page loaded with, so a beat that changed a state (a highlight, a typed value) never
     leaks into an earlier frame. */
  var mockHome = '', screenState = null;
  function state(id) {
    var m = $('mock'); if (!m) return;
    if (!id) { m.classList.remove('on'); return; }
    if (window.STATES && window.STATES[id] !== undefined) {
      if (screenState !== id) { m.innerHTML = window.STATES[id]; screenState = id; }
    }
    m.classList.add('on');
  }

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

  /* ---------- seeded strokes, the pointer, the cast (step 4) ----------
     Everything here is built at beat time from pos(), after fonts and copy, so sizes are right;
     geometry is seeded from the kind and the element id, so a re-render is identical; motion is
     CSS transitions on a class, so a seek holds and bakes it like any other. Colours and widths
     are tokens (--stroke, --stroke-width, --stroke-draw, --pointer, --cast-stroke, --cast-fill) from theme.css;
     --ink is the theme's text colour and is not touched. */
  var SVG = 'http://www.w3.org/2000/svg';
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = hash(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function layer(id, tag) {
    var el = $(id); if (el) return el;
    el = document.createElementNS(SVG, tag || 'svg'); el.setAttribute('id', id);
    if (!tag) { el.setAttribute('viewBox', '0 0 ' + W + ' ' + H); el.setAttribute('width', W); el.setAttribute('height', H); }
    cam.appendChild(el); return el;
  }
  function fmt(n) { return Math.round(n * 10) / 10; }
  function pathOf(pts, close) { var d = 'M' + fmt(pts[0][0]) + ' ' + fmt(pts[0][1]); for (var i = 1; i < pts.length; i++) d += ' L' + fmt(pts[i][0]) + ' ' + fmt(pts[i][1]); return close ? d + ' Z' : d; }
  var rough = 1;   /* --stroke-rough: 1 is the house wobble, 0 is a straight line, a look sets it */
  function wobble(r, amount) { return (r() - 0.5) * 2 * amount * rough; }
  function tokenNumber(name, fallback) { var v = parseFloat(getComputedStyle(stage).getPropertyValue(name)); return isNaN(v) ? fallback : v; }

  /* the four strokes. Each returns a list of point lists (one path each), in stage pixels. */
  var STROKES = {
    circle: function (b, r, o) {
      var pad = o.pad != null ? o.pad : 18, cx = b.x, cy = b.y, rx = b.w / 2 + pad + 10, ry = b.h / 2 + pad;
      var start = r() * Math.PI * 2, turns = 1.08 + r() * 0.08, n = 56, pts = [];
      for (var i = 0; i <= n; i++) {
        var a = start + (i / n) * Math.PI * 2 * turns, k = 1 + wobble(r, 0.012) + (i / n) * 0.03;
        pts.push([cx + Math.cos(a) * rx * k + wobble(r, 1.2), cy + Math.sin(a) * ry * k + wobble(r, 1.2)]);
      }
      return [pts];
    },
    frame: function (b, r, o) {
      var pad = o.pad != null ? o.pad : 12, l = b.l - pad, t = b.t - pad, rt = b.l + b.w + pad, bt = b.t + b.h + pad, pts = [], corners = [[l, t], [rt, t], [rt, bt], [l, bt], [l, t]];
      for (var c = 0; c < 4; c++) {
        var a = corners[c], z = corners[c + 1], n = 10;
        for (var i = 0; i <= n; i++) { var u = i / n; pts.push([a[0] + (z[0] - a[0]) * u + wobble(r, 1.6), a[1] + (z[1] - a[1]) * u + wobble(r, 1.6)]); }
      }
      pts.push([l + 6 + wobble(r, 2), t + wobble(r, 2)]);   /* the overshoot a hand leaves */
      return [pts];
    },
    underline: function (b, r, o) {
      var pad = o.pad != null ? o.pad : 8, y = b.t + b.h + pad, n = 14, pts = [];
      for (var i = 0; i <= n; i++) { var u = i / n; pts.push([b.l - 4 + (b.w + 8) * u, y + Math.sin(u * Math.PI) * 2.5 + wobble(r, 1.2)]); }
      return [pts];
    },
    arrow: function (b, r, o) {
      var dx = o.dx != null ? o.dx : -160, dy = o.dy != null ? o.dy : 120;          /* the tail, relative to the box centre */
      var from = [b.x + dx, b.y + dy];
      var tx = Math.min(Math.max(b.x, b.l - 6), b.l + b.w + 6), ty = dy > 0 ? b.t + b.h + 10 : b.t - 10;     /* the head meets the box edge */
      if (Math.abs(dx) > Math.abs(dy)) { tx = dx > 0 ? b.l + b.w + 10 : b.l - 10; ty = b.y; }
      var to = [tx, ty], mid = [(from[0] + to[0]) / 2 + (to[1] - from[1]) * 0.12, (from[1] + to[1]) / 2 - (to[0] - from[0]) * 0.12], n = 16, shaft = [];
      for (var i = 0; i <= n; i++) { var u = i / n, v = 1 - u; shaft.push([v * v * from[0] + 2 * v * u * mid[0] + u * u * to[0] + wobble(r, 1), v * v * from[1] + 2 * v * u * mid[1] + u * u * to[1] + wobble(r, 1)]); }
      var ang = Math.atan2(to[1] - mid[1], to[0] - mid[0]), hl = 22;
      var head = [[to[0] - Math.cos(ang - 0.5) * hl, to[1] - Math.sin(ang - 0.5) * hl], to, [to[0] - Math.cos(ang + 0.5) * hl, to[1] - Math.sin(ang + 0.5) * hl]];
      return [shaft, head];
    }
  };
  /* ink(kind, id, opts): draw a stroke around or to element `id`, drawn on over --stroke-draw. opts:
     pad, dx, dy (arrow tail), seed (to vary a repeat), keep (do not clear earlier strokes). ink(null) clears. */
  function ink(kind, id, opts) {
    var svg = layer('ink');
    if (!kind) { while (svg.firstChild) svg.removeChild(svg.firstChild); return; }
    var el = $(id); if (!el || !STROKES[kind]) return;
    opts = opts || {};
    if (!opts.keep) while (svg.firstChild) svg.removeChild(svg.firstChild);
    rough = tokenNumber('--stroke-rough', 1);
    var glow = tokenNumber('--stroke-glow', 0);
    var paths = STROKES[kind](pos(el), rng(kind + ':' + id + ':' + (opts.seed || '')), opts), made = [];
    for (var i = 0; i < paths.length; i++) {
      var p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', pathOf(paths[i], false));
      p.setAttribute('data-stroke', kind + ' ' + id);
      if (glow > 0) p.style.filter = 'drop-shadow(0 0 ' + glow + 'px var(--stroke, var(--hi)))';   /* a lightboard glow; set only when asked, so no look is pixel-identical */
      svg.appendChild(p);
      var L = Math.ceil(p.getTotalLength()) + 2;
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      made.push(p);
    }
    for (var k = 0; k < made.length; k++) void getComputedStyle(made[k]).strokeDashoffset;   /* the start state exists before the change, so it transitions */
    for (var m = 0; m < made.length; m++) made[m].classList.add('on');
  }

  /* the pointer: one cursor that glides to an element over --pointer-glide; click() rings where it is */
  var pointAt = null;
  function instant(el, fn) { el.style.setProperty('transition-property', 'none'); fn(); void getComputedStyle(el).transform; el.style.removeProperty('transition-property'); }   /* a change with no transition */
  function pointerEl() {
    var p = $('pointer'); if (p) return p;
    p = document.createElement('div'); p.id = 'pointer';
    p.innerHTML = '<svg viewBox="0 0 24 32" width="30" height="40"><path d="M3 2 L3 26 L9.5 20.5 L13.5 30 L17 28.5 L13 19 L21 19 Z"/></svg>';
    cam.appendChild(p);
    var ring = document.createElement('div'); ring.id = 'ring'; cam.appendChild(ring);
    return p;
  }
  function pointer(id, dx, dy, opts) {
    var p = pointerEl();
    if (!id) { p.classList.remove('on'); return; }
    var el = $(id); if (!el) return;
    var b = pos(el); pointAt = [b.x + (dx || 0), b.y + (dy || 0)];
    var move = function () { p.style.transform = 'translate(' + fmt(pointAt[0]) + 'px,' + fmt(pointAt[1]) + 'px)'; };
    if (opts && opts.jump) instant(p, move); else move();
    p.classList.add('on');
  }
  function click() {
    var ring = $('ring'); if (!ring || !pointAt) return;
    instant(ring, function () { ring.classList.remove('on'); ring.style.opacity = '.9'; ring.style.left = fmt(pointAt[0]) + 'px'; ring.style.top = fmt(pointAt[1]) + 'px'; });
    ring.style.removeProperty('opacity'); ring.classList.add('on');          /* bright and small, then grows and fades */
  }
  /* type(t, id, text, cps): one beat per character from t, each setting the field's text to the
     prefix; no animation, so it is seek-correct by construction. The first beat is a real beat
     (a still is sampled there), the rest are minor. Returns the time the last character lands. */
  function type(t, id, text, cps) {
    cps = cps || 12;
    for (var i = 1; i <= text.length; i++) {
      (function (n) { at(t + (n - 1) / cps, function () { var el = $(id); if (!el) return; el.textContent = text.slice(0, n); el.classList.add('typing'); }, n > 1); })(i);
    }
    var end = t + (text.length - 1) / cps;
    at(end + 0.6, function () { var el = $(id); if (el) el.classList.remove('typing'); }, true);
    return end;   /* the field is looked up at beat time: in an app-backed video it exists only once its state is on */
  }

  /* the cast: seeded figures beside an element. who(name, pose, nearId, side); who(null) hides.
     Poses: point, think, wave. Two figures by name (any name; the seed is the name). The
     mechanism is here; the drawing style belongs to a look (roadmap step 7). */
  function who(name, pose, nearId, side) {
    var svg = layer('cast');
    if (!name) { svg.classList.remove('on'); return; }
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    rough = tokenNumber('--stroke-rough', 1);
    var r = rng('who:' + name), el = nearId ? $(nearId) : null, b = el ? pos(el) : { l: W / 2 - 100, t: H / 2 - 150, w: 200, h: 300, x: W / 2, y: H / 2 };
    var hgt = 300 + r() * 60, x = side === 'left' ? b.l - 160 : b.l + b.w + 160, y = b.t + b.h / 2 + hgt * 0.1;
    x = Math.min(Math.max(x, 140), W - 140);
    var head = 30 + r() * 6, g = document.createElementNS(SVG, 'g'); g.setAttribute('data-who', name + ' ' + pose);
    var add = function (pts, cls) { var p = document.createElementNS(SVG, 'path'); p.setAttribute('d', pathOf(pts, false)); if (cls) p.setAttribute('class', cls); g.appendChild(p); };
    var top = y - hgt / 2, neck = top + head * 2 + 6, hip = neck + hgt * 0.38, foot = y + hgt / 2;
    var ring = []; for (var i = 0; i <= 40; i++) { var a = (i / 40) * Math.PI * 2.05; ring.push([x + Math.cos(a) * head + wobble(r, 1), top + head + Math.sin(a) * head * 1.08 + wobble(r, 1)]); }
    add(ring, 'head');
    add([[x + wobble(r, 2), neck], [x + wobble(r, 3), hip]]);                              /* spine */
    add([[x, hip], [x - 22 + wobble(r, 3), foot]]); add([[x, hip], [x + 22 + wobble(r, 3), foot]]);   /* legs */
    var sh = neck + 14, dir = side === 'left' ? 1 : -1;                                      /* arms face the element */
    if (pose === 'point') { add([[x, sh], [x - dir * 20, sh + 50]]); add([[x, sh], [x + dir * 62, sh - 26], [x + dir * 86, sh - 34]]); }
    else if (pose === 'wave') { add([[x, sh], [x - dir * 18, sh + 54]]); add([[x, sh], [x + dir * 40, sh - 40], [x + dir * 44, sh - 80]]); }
    else { add([[x, sh], [x - dir * 18, sh + 54]]); add([[x, sh], [x + dir * 30, sh + 30], [x + dir * 12, top + head * 1.7]]); }   /* think: hand to chin */
    var hair = 3 + Math.floor(r() * 4); for (var h = 0; h < hair; h++) { var hx = x - head * 0.6 + (head * 1.2) * (h / Math.max(1, hair - 1)); add([[hx, top + 2 + wobble(r, 2)], [hx + wobble(r, 6), top - 10 - r() * 12]]); }
    svg.appendChild(g);
    void getComputedStyle(svg).opacity;
    svg.classList.add('on');
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
    var mk = $('mock'); if (mk && (screenState !== null || mk.innerHTML !== mockHome)) { mk.innerHTML = mockHome; screenState = null; }
    var inkL = $('ink'); if (inkL) while (inkL.firstChild) inkL.removeChild(inkL.firstChild);
    var castL = $('cast'); if (castL) while (castL.firstChild) castL.removeChild(castL.firstChild);
    var ptr = $('pointer'); if (ptr) { ptr.style.transform = 'translate(' + (W - 80) + 'px,' + (H - 80) + 'px)'; pointAt = null; }   /* home: bottom right, hidden */
    var typed = document.querySelectorAll('.typing'); for (var ty = 0; ty < typed.length; ty++) typed[ty].classList.remove('typing');
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
     written, because writing one element's value cancels its other transitions. A transition
     already past its end is cancelled instead: its class value is the value, and a baked inline
     copy would shadow a later beat that changes the same class. Known limit: two changes to the
     same property on one element inside its transition time (under a second apart) seek as the
     first held, because the second's class change cannot show through the bake. */
  var baked = [];
  function holdAll(anims, msOf) {
    var i, a, el, prop, items = [];
    for (i = 0; i < anims.length; i++) {
      a = anims[i]; a.pause();
      var ms = msOf(a), end = a.effect ? a.effect.getComputedTiming().endTime : 0;
      if (ms >= end) { a.cancel(); continue; }   /* already over: the class value is the value; baking it would shadow a later class change */
      try { a.currentTime = ms; } catch (e) { continue; }
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
          /* a beat fires on the first frame at or after its time, so up to a frame late, and Chrome
             starts a new transition either on this frame or the next (33 ms after a dropped frame).
             Every animation a beat starts gets its start time set to the beat's nominal time on the
             document timeline, so it runs exactly as if it had started on time whatever the frame
             clock did; playback then means what a seek means and the proof compares like with
             like. The shift is under two frames and never seen. */
          var startAt = now - (clock - b.t) * 1000;
          if (document.getAnimations) { var after = document.getAnimations(); for (var k = 0; k < after.length; k++) if (before.indexOf(after[k]) < 0) { try { after[k].startTime = startAt; } catch (e) { /* finished already */ } live.push([after[k], b.t]); } }
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
    var mk = $('mock'); if (mk) mockHome = mk.innerHTML;         /* after copy(), so COPY strings are part of home */
    layer('ink'); layer('cast'); pointerEl();                      /* the layers exist from the start */
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
    version: '0.3.2',
    boot: boot, at: at, P: P, total: function () { return TOTAL; }, parts: function () { return window.PARTS.slice(); },
    beats: function () { return beats.filter(function (b) { return !b.minor; }).map(function (b) { return b.t; }); },
    ready: function () { return ready; },
    seekTo: seekTo, playTo: playTo, reset: resetAll, onReset: onReset, recording: recording,
    scene: scene, show: show, state: state, fade: fadeTo, card: card,
    ink: ink, pointer: pointer, click: click, type: type, who: who, rng: rng,
    focus: focus, focusEl: focusEl, travel: travel, ease: ease, home: home, camTo: camTo, pos: pos,
    W: W, H: H
  };
  /* short names for the page's timeline */
  window.at = at; window.P = P;
  window.scene = scene; window.show = show; window.state = state; window.fade = fadeTo; window.card = card;
  window.focusAt = focus; window.focusEl = focusEl; window.travel = travel; window.ease = ease; window.home = home; window.pos = pos;
  window.ink = ink; window.pointer = pointer; window.click = click; window.type = type; window.who = who;
})();
