# Local voices with VoiceStudio's default engine (k2-fsa OmniVoice), as an alternative to the ElevenLabs connector.
# Each character's voice is cloned zero-shot from one of their earlier raw takes, so the cast sounds the same across episodes.
#   script.json  "tts_engine": "omnivoice",  characters.<name>.ref = { "ep": "ep03", "line": "L17" }  (optional per-line "ref" override)
# ElevenLabs-style direction tags ([excited], [whispers] …) are not understood by OmniVoice and would be read aloud,
# so they are stripped; [sighs] / [laughs] map to OmniVoice's own [sigh] / [laughter] tokens.
# usage (inside the venv that has `pip install omnivoice`):  python tools/voicestudio-tts.py ep04 [L03 L07 …] [--force] [--seed 7]
#   -> episodes/<ep>/voices_raw/Lxx.wav  (then: npm run voices -- <ep>, which accepts .wav or .mp3)
import sys, os, re, json, time
import torch, soundfile as sf
from omnivoice import OmniVoice

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ep, only = args[0], set(args[1:])
force = '--force' in sys.argv
seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1234
d = f'episodes/{ep}'
script = json.load(open(f'{d}/script.json'))
os.makedirs(f'{d}/voices_raw', exist_ok=True)

KEEP = {'sigh': '[sigh]', 'sighs': '[sigh]', 'laughs': '[laughter]', 'laughter': '[laughter]', 'nervous laugh': '[laughter]', 'giggles': '[laughter]'}
def clean(tts):
    t = re.sub(r'\[([^\]]+)\]', lambda m: KEEP.get(m.group(1).strip().lower(), ''), tts)
    t = re.sub(r'\b([A-Z]{2,})\b', lambda m: m.group(1).capitalize() if m.group(1) not in ('I',) else m.group(1), t)   # SHOUTED words read as words
    return re.sub(r'\s+', ' ', t).strip()

def ref_for(line):
    r = line.get('ref') or script['characters'][line['speaker']]['ref']
    src = json.load(open(f"episodes/{r['ep']}/script.json"))
    l = next(x for x in src['lines'] if x['id'] == r['line'])
    audio = next(f"episodes/{r['ep']}/voices_raw/{r['line']}.{e}" for e in ('mp3', 'wav') if os.path.exists(f"episodes/{r['ep']}/voices_raw/{r['line']}.{e}"))
    return audio, re.sub(r'\s+', ' ', re.sub(r'\[[^\]]+\]', '', l['tts'])).strip()

torch.set_num_threads(os.cpu_count())
model = OmniVoice.from_pretrained('k2-fsa/OmniVoice', device_map='cpu', dtype=torch.float32)
prompts = {}
for line in script['lines']:
    lid = line['id']; out = f'{d}/voices_raw/{lid}.wav'
    if only and lid not in only: continue
    if os.path.exists(out) and not force: continue
    audio, rtext = ref_for(line)
    if audio not in prompts: prompts[audio] = model.create_voice_clone_prompt(ref_audio=audio, ref_text=rtext)
    text = clean(line['tts']); torch.manual_seed(seed); t0 = time.time()
    wav = model.generate(text=text, language='English', voice_clone_prompt=prompts[audio], num_step=32, guidance_scale=2.0, speed=line.get('tts_speed'))[0]
    sf.write(out, wav, model.sampling_rate)
    print(f'{lid} {line["speaker"]:7s} {len(wav) / model.sampling_rate:5.2f}s  ({time.time() - t0:.1f}s)  "{text}"', flush=True)
