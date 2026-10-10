#!/usr/bin/env python3
"""Word times for one voice clip, for vkit time.

    python3 words.py <clip> <out.json> [--model large-v3-turbo] [--prompt "names, labels"]

Runs faster-whisper locally (CPU, int8) with word timestamps on and writes
{ "clip", "model", "duration", "words": [ { "w", "s", "e", "p" }, ... ] }, one entry per spoken
word with its start and end in seconds from the clip's start and the model's confidence.
Nothing leaves the machine: no service is called. The same engine and settings as the
meeting-transcript skill; the prompt primes the model with the console's labels so a label is
heard as itself. The first run downloads the model once (about 1.5 GB for large-v3-turbo).
"""
import json, os, subprocess, sys, tempfile, time

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__); sys.exit(2)
    clip, out = args[0], args[1]
    model_name = 'large-v3-turbo'; prompt = ''
    i = 2
    while i < len(args):
        if args[i] == '--model': model_name = args[i + 1]; i += 2
        elif args[i] == '--prompt': prompt = args[i + 1]; i += 2
        else: print('unknown flag ' + args[i]); sys.exit(2)
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print('faster-whisper is not installed: pip install --break-system-packages faster-whisper (and ffmpeg on the path)')
        sys.exit(3)
    t0 = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'clip.wav')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', clip, '-ac', '1', '-ar', '16000', wav], check=True)
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).decode().strip())
        # the samples are read here (16 kHz mono 16-bit from ffmpeg) and handed to the model as an array, so the
        # model's own decoder, which breaks across PyAV versions (metadata_errors, PyAV 19), is never on the path
        import wave, array
        with wave.open(wav, 'rb') as wf:
            raw = wf.readframes(wf.getnframes())
        pcm = array.array('h'); pcm.frombytes(raw)
        import numpy as np
        samples = np.asarray(pcm, dtype=np.float32) / 32768.0
        model = WhisperModel(model_name, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
        segs, info = model.transcribe(samples, language='en', beam_size=5, word_timestamps=True, vad_filter=False,
                                      initial_prompt=prompt or None, condition_on_previous_text=False)
        words = []
        for s in segs:
            for w in (s.words or []):
                words.append({'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3), 'p': round(w.probability, 3)})
    data = {'clip': os.path.basename(clip), 'model': model_name, 'duration': round(dur, 3), 'words': words,
            'made_on': time.strftime('%Y-%m-%d'), 'seconds_to_make': round(time.time() - t0, 1)}
    with open(out, 'w') as f:
        json.dump(data, f, indent=1)
    print('%s: %d words over %.2f s (%s, %.0f s)' % (os.path.basename(clip), len(words), dur, model_name, time.time() - t0))

if __name__ == '__main__':
    main()
