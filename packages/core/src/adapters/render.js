// Render adapter. A render is a job: a rig folder and a list of times in,
// image files out. The local implementation drives headless Chromium on this
// machine. A cloud runner (a container with Chromium, frames to object
// storage) implements the same two calls; the CLI and an app call either.
//
//   frames(rigDir, times, outDir)   -> [filePath]   one PNG per time, seek-correct
//   every(rigDir, fps, outDir)      -> [filePath]   every frame of the run

module.exports = {
  name: 'local-chromium',
  frames: function () { throw new Error('render.frames is not built yet'); },
  every: function () { throw new Error('render.every is not built yet'); }
};
