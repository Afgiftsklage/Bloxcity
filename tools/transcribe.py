# Word-level timings for captions: whisper word timestamps aligned to the known script text.
# usage: python3 tools/transcribe.py ep01   -> episodes/ep01/words.json  ({line: [{text, start, end}]}, seconds, clip-local)
import sys, json, re, difflib, subprocess
import numpy as np
from faster_whisper import WhisperModel
ep = sys.argv[1] if len(sys.argv) > 1 else 'ep01'
d = f'episodes/{ep}'
script = json.load(open(f'{d}/script.json')); voices = json.load(open(f'{d}/voices.json'))
model = WhisperModel('small.en', device='cpu', compute_type='int8')
def load(path):   # decode to 16 kHz mono float32 ourselves (avoids PyAV version issues)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
out = {}
for line in script['lines']:
    lid = line['id']; dur = voices[lid]['dur']
    segs, _ = model.transcribe(load(f'{d}/voices/{lid}.wav'), word_timestamps=True, language='en', initial_prompt=line['caption'], condition_on_previous_text=False)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    want = line['caption'].split()
    a, b = [norm(w) for w in want], [norm(h[0]) for h in heard]
    times = [None] * len(want)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1): times[i1 + k] = [heard[j1 + k][1], heard[j1 + k][2]]
        elif tag == 'replace' and j2 > j1:      # misheard words: share the heard span evenly
            t0, t1 = heard[j1][1], heard[j2 - 1][2]; n = i2 - i1
            for k in range(n): times[i1 + k] = [t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n]
    if heard and times[0] and times[0][0] > heard[0][1] + 0.2: times[0][0] = heard[0][1]   # leading scream/sound belongs to word 1
    # fill gaps by interpolation between known neighbours
    for i in range(len(want)):
        if times[i] is None:
            prev = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.05)
            nxt_i = next((j for j in range(i + 1, len(want)) if times[j]), None)
            nxt = times[nxt_i][0] if nxt_i is not None else dur - 0.1
            n = (nxt_i if nxt_i is not None else len(want)) - i
            for k in range(n): times[i + k] = [prev + (nxt - prev) * k / n, prev + (nxt - prev) * (k + 1) / n]
    out[lid] = [{'text': w, 'start': round(max(0, t[0]), 3), 'end': round(min(dur, max(t[1], t[0] + 0.08)), 3)} for w, t in zip(want, times)]
    print(lid, '| heard:', ' '.join(h[0] for h in heard), '| aligned:', ' '.join(f"{w['text']}@{w['start']:.2f}" for w in out[lid]))
json.dump(out, open(f'{d}/words.json', 'w'), indent=1)
