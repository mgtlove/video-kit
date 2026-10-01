// Script adapter. Sources in, parts out. A source is a walkthrough document
// with pictures, raw screenshots plus a transcript, or a person's draft. The
// adapter returns narration parts (one sentence per line, a size limit per
// part) and the capture ids each part cites. Which model or person wrote the
// parts is the adapter's business; the core only sees parts and citations.
//
//   fromDocument(path)                 -> { parts: [...], captures: [...] }
//   fromScreenshots(folder, transcript)-> the same, and writes the document
//   fromDraft(text)                    -> the same

module.exports = {
  name: 'manual',
  fromDocument: function () { throw new Error('script.fromDocument is not built yet'); },
  fromScreenshots: function () { throw new Error('script.fromScreenshots is not built yet'); },
  fromDraft: function () { throw new Error('script.fromDraft is not built yet'); }
};
