// Browser options every proof shares: the Chrome channel from PW_CHANNEL (nothing downloads a
// browser) and a progress reporter, so a four-minute proof prints a line every 20 seconds
// instead of nothing. The test runner shows the lines as comments.
const progress = require('../src/progress');
module.exports = function (extra) {
  const report = progress.throttled((r) => { if (!r.final) process.stdout.write(progress.line(r.step, r.done, r.total, r.note) + '\n'); }, 20000);
  return Object.assign({ channel: process.env.PW_CHANNEL || undefined, progress: report }, extra || {});
};
