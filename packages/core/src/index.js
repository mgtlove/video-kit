// @video-kit/core: the only place logic lives. The CLI, the plugin, the MCP
// server and any app call these functions. Nothing here reads argv, prints,
// or knows which shell is calling.
//
// Each export is a contract; a body lands with its frame proof, in the order
// docs/ROADMAP.md gives. Capture (step 9) and publish (step 11) arrive as adapters.

const { newVideo } = require('./new');
const { frames } = require('./frames');
const { renderVideo } = require('./render');
const apps = require('./apps');
const { check } = require('./check');
const { syncReference } = require('./sync');
const { applyLook } = require('./look');
const { narration, measure } = require('./words');
const brand = require('./brand');
const menu = require('./menu');
const progress = require('./progress');
const voice = require('./adapters/voice');
const render = require('./adapters/render');
const script = require('./adapters/script');
const hosting = require('./adapters/hosting');

module.exports = {
  // a video is a folder; these take its path
  newVideo: newVideo,                        // copy starter/, engine in at this version, video.json with menu defaults; opts.app for an app-backed video
  apps: apps,                                // recreated apps: resolveApp, installApp, appNew, appAddState, appExtract
  menu: menu,                                // the ten choices: items, show, set, explain, format; options from looks/, brands/, patterns/, apps
  narration: narration,                      // parts -> FULL.md, limits, estimates, a PARTS line
  measure: measure,                          // clip files -> exact PARTS in the page and video.json; re-timing items lock
  frames: frames,                            // rig -> a PNG per beat (seek-correct)
  renderVideo: renderVideo,                  // rig -> every frame at 30 fps -> mux with clips -> MP4, captions sidecar
  check: check,                              // offline, deterministic, seekable, seek-correct; craft rules; contrast; fidelity against captures
  brand: brand.applyBrand,                   // brands/<name>/ -> rig/brand/ and rig/brand.css tokens the theme reads first; the engine builds the mark and banner
  brandCheck: brand.brandCheck,              // what the brand does to the contrast rules, measured without a browser
  brands: brand,                             // listBrands, loadBrand, tokensFor, formatCheck
  look: applyLook,                           // look pack -> rig/look.css tokens the theme reads; video.json.menu.look records it
  syncReference: syncReference,              // ../video-reference -> rules.json, looks/, patterns/index.json
  progress: progress,                        // opts.progress(step, done, total, note): how every slow function reports; of, phase, line, bar, throttled
  adapters: { voice, render, script, hosting }
};
