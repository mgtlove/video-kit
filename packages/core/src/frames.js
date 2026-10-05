// frames(videoDir, opts): a still per beat (sampled 0.3 s after it fires) plus
// each part start, or the times given. Writes rig/_frames/ and returns the
// list. Looking at these is how a rig is judged.
const path = require('path');
const render = require('./adapters/render');

async function frames(videoDir, opts) {
  opts = opts || {};
  const rigDir = path.join(path.resolve(videoDir), 'rig');
  const outDir = opts.outDir || path.join(rigDir, '_frames');
  const i = await render.info(rigDir, opts);
  let times;
  if (opts.times && opts.times.length) times = opts.times;
  else if (opts.every) { times = []; for (let t = 0; t <= i.total; t = +(t + opts.every).toFixed(2)) times.push(t); }
  else {
    const starts = i.parts.map((_, k) => i.parts.slice(0, k).reduce((a, b) => a + b, 0));
    times = [...new Set([...starts, ...i.beats.map((t) => +(t + 0.3).toFixed(2))])].sort((a, b) => a - b);
  }
  const files = await render.frames(rigDir, times, outDir, require('./progress').phase(opts, 'frames'));
  return { files, times, total: i.total, parts: i.parts, engine: i.version };
}

module.exports = { frames };
