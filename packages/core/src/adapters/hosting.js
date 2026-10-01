// Hosting adapter. A finished MP4 (and captions) in, a URL out, plus whatever
// the host needs recorded in video.json. The core never knows the host.
//
//   publish(mp4, captions, meta) -> { url, embedUrl, hostRecord }
//
// Providers to come: a local folder (default), YouTube, S3 plus CloudFront, a
// Synthesia scene set (one scene per part with its own clip as the audio).

module.exports = {
  name: 'local-folder',
  publish: function () { throw new Error('hosting.publish is not built yet'); }
};
