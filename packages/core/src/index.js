// @video-kit/core: the only place logic lives. The CLI, the plugin, the MCP
// server and any app call these functions. Nothing here reads argv, prints,
// or knows which shell is calling.
//
// Each export is a contract; a body lands with its frame proof, in the order
// docs/ROADMAP.md gives. notBuilt marks the ones still to come.

const { newVideo } = require('./new');
const { frames } = require('./frames');
const { renderVideo } = require('./render');
const apps = require('./apps');
const { check } = require('./check');
const { syncReference } = require('./sync');
const voice = require('./adapters/voice');
const render = require('./adapters/render');
const script = require('./adapters/script');
const hosting = require('./adapters/hosting');

function notBuilt(name) {
  return function () { throw new Error(name + ' is not built yet. See docs/ROADMAP.md.'); };
}

module.exports = {
  // a video is a folder; these take its path
  newVideo: newVideo,                        // copy starter/, engine in at this version, video.json with menu defaults; opts.app for an app-backed video
  apps: apps,                                // recreated apps: resolveApp, installApp, appNew, appAddState, appExtract
  menu: notBuilt('menu'),                    // read and write video.json.menu; list looks, patterns, brands
  narration: notBuilt('narration'),          // parts -> FULL.md, lengths, limits
  measure: notBuilt('measure'),              // clip files -> exact PART_SECONDS
  frames: frames,                            // rig -> a PNG per beat (seek-correct)
  renderVideo: renderVideo,                  // rig -> every frame at 30 fps -> mux with clips -> MP4, captions sidecar
  check: check,                              // offline, deterministic, seekable, seek-correct; craft rules; contrast; fidelity against captures
  brand: notBuilt('brand'),                  // brand.json -> brand.css; report
  look: notBuilt('look'),                    // look pack -> theme tokens
  syncReference: syncReference,              // ../video-reference -> rules.json (looks/ and patterns/ in step 7)
  adapters: { voice, render, script, hosting }
};
