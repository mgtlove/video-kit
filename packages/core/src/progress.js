// Progress: how a long function tells its caller where it is.
//
// Every slow function in core takes opts.progress, a function
//   progress(step, done, total, note)
// and calls it as work lands: step is a short name ('render', 'frames', 'check
// seek proof'), done and total count the units (frames, stills, moments; total
// may be 0 when it is not known), note is a few words about the current unit.
// Core never prints; a shell decides what the calls look like: the CLI draws a
// bar that rewrites one line on a terminal and prints plain lines in a pipe
// (packages/cli); the plugin and the MCP server read the same calls.
//
// phase(opts, name) returns a copy of opts whose progress prefixes the step
// with a phase name, so vkit check can hand the adapters its own labels.

function noop() {}

function of(opts) { return (opts && typeof opts.progress === 'function') ? opts.progress : noop; }

function phase(opts, name) {
  const p = of(opts);
  if (p === noop) return opts || {};
  return Object.assign({}, opts, { progress: (step, done, total, note) => p(name + (step ? ': ' + step : ''), done, total, note) });
}

/* a plain line for a log or a pipe: "render  1200/2040  58%  frame at 40.00 s" */
function line(step, done, total, note) {
  const pct = total ? Math.round(done / total * 100) : null;
  return step.padEnd(18) + (total ? String(done).padStart(String(total).length) + '/' + total + '  ' + String(pct).padStart(3) + '%' : String(done)) + (note ? '  ' + note : '');
}

/* a bar for a terminal, `width` columns wide, with the time left from the rate so far */
function bar(step, done, total, note, startedMs, width) {
  width = width || 24;
  const now = Date.now(), elapsed = (now - startedMs) / 1000;
  let left = '';
  if (total && done > 0 && done < total) { const s = elapsed / done * (total - done); left = fmtSec(s) + ' left'; }
  else if (total && done >= total) left = 'done in ' + fmtSec(elapsed);
  if (!total) return step.padEnd(18) + ' ' + done + (note ? '  ' + note : '') + '  ' + fmtSec(elapsed);
  const filled = Math.round(done / total * width);
  const pct = Math.round(done / total * 100);
  return step.padEnd(18) + ' [' + '#'.repeat(filled) + '.'.repeat(width - filled) + '] ' + String(done).padStart(String(total).length) + '/' + total + ' ' + String(pct).padStart(3) + '%  ' + left + (note ? '  ' + note : '');
}

function fmtSec(s) { s = Math.max(0, Math.round(s)); return s >= 60 ? Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's' : s + 's'; }

/* A reporter that throttles: a caller can report every frame and the sink hears about one a
   second (or when a step changes, or when a step finishes). write(text, final) is the sink. */
function throttled(write, everyMs) {
  everyMs = everyMs == null ? 1000 : everyMs;
  let last = 0, lastStep = null, started = Date.now();
  return function (step, done, total, note) {
    const now = Date.now();
    if (step !== lastStep) { lastStep = step; started = now; last = 0; }
    const final = total && done >= total;
    if (!final && now - last < everyMs) return;
    last = now;
    write({ step, done, total, note, started, final: !!final });
  };
}

module.exports = { of, phase, line, bar, throttled, fmtSec };
