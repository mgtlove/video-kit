// @video-kit/core: the only place logic lives. The CLI, the plugin, the MCP
// server and any app call these functions. Nothing here reads argv, prints,
// or knows which shell is calling.
//
// Status: skeleton. Each export below is a contract; the body lands with its
// frame proof, in the order docs/ROADMAP.md gives.

const voice = require('./adapters/voice');
const render = require('./adapters/render');
const script = require('./adapters/script');
const hosting = require('./adapters/hosting');

function notBuilt(name) {
  return function () { throw new Error(name + ' is not built yet. See docs/ROADMAP.md.'); };
}

module.exports = {
  // a video is a folder; these take its path
  newVideo: notBuilt('newVideo'),            // copy starter/, write video.json with menu defaults
  menu: notBuilt('menu'),                    // read and write video.json.menu; list looks, patterns, brands
  narration: notBuilt('narration'),          // parts -> FULL.md, lengths, limits
  measure: notBuilt('measure'),              // clip files -> exact PART_SECONDS
  frames: notBuilt('frames'),                // rig -> a PNG per beat (seek-correct)
  renderVideo: notBuilt('renderVideo'),      // rig -> every frame at 30 fps -> mux with clips -> MP4
  check: notBuilt('check'),                  // offline, deterministic, seekable, seek-correct; craft rules; brand contrast
  brand: notBuilt('brand'),                  // brand.json -> brand.css; report
  look: notBuilt('look'),                    // look pack -> theme tokens
  syncReference: notBuilt('syncReference'),  // ../video-reference -> rules.json, looks/, patterns/index.json
  adapters: { voice, render, script, hosting }
};
