// Voice adapter. The clips are the clock: every beat is timed to a measured
// file, so a provider must return files. Two operations.
//
//   measure(folder)            -> [{ part, file, seconds }]  exact, two decimals, no padding
//   generate(parts, options)   -> writes part-N.wav|mp3 into a folder, returns the same shape
//
// Local implementation today: measure only (ffprobe or a WAV header read).
// Later providers drop in here without the core changing: Amazon Polly, a
// Synthesia clip export, a phone recording transcribed for word timings.

module.exports = {
  name: 'local',
  measure: function () { throw new Error('voice.measure is not built yet'); },
  generate: null   // null means "this provider cannot generate"; the menu says so
};
