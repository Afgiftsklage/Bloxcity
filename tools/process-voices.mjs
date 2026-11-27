// Raw ElevenLabs takes -> trimmed, pitched-up, normalized voice clips (+ lip-sync envelopes).
// usage: node tools/process-voices.mjs ep01
import fs from 'node:fs'; import path from 'node:path';
import { SR, decode, writeWav, gatedRms, db, undb, rms } from './lib/wav.mjs';
const ep = process.argv[2] || 'ep01', dir = `episodes/${ep}`;
const script = JSON.parse(fs.readFileSync(`${dir}/script.json`));
const TARGET_DB = -17, PEAK_DB = -3, FPS = script.fps, SPEED = script.speed ?? 1;     // speed: 1.5 = whole episode plays 1.5x faster, voices keep their natural pitch
fs.mkdirSync(`${dir}/voices`, { recursive: true });
const out = {};
for (const line of script.lines) {
  const raw = ['mp3', 'wav'].map(e => `${dir}/voices_raw/${line.id}.${e}`).find(f => fs.existsSync(f));      // ElevenLabs takes are .mp3, local VoiceStudio/OmniVoice takes .wav
  if (!raw) { console.log('MISSING', `${dir}/voices_raw/${line.id}.mp3`); continue; }
  const st = line.pitch_semitones ?? script.characters[line.speaker].pitch_semitones ?? 0;
  const pitch = Math.pow(2, st / 12);
  // high-pitched cartoon voice: pitch shift with formants shifted too (duration unchanged)
  let x = decode(raw, `highpass=f=70,rubberband=tempo=${SPEED}:pitch=${pitch.toFixed(5)}:formant=shifted:pitchq=quality`);
  // trim leading/trailing silence (below -45 dBFS), keep 40 ms pre-roll and 120 ms tail
  const win = Math.round(SR * 0.01), thr = undb(-45); let a = 0, b = x.length;
  while (a + win < b && rms(x, a, a + win) < thr) a += win;
  while (b - win > a && rms(x, b - win, b) < thr) b -= win;
  a = Math.max(0, a - Math.round(SR * 0.04)); b = Math.min(x.length, b + Math.round(SR * 0.12));
  x = x.slice(a, b);
  // normalize speech level to -17 dBFS (gated RMS), then soft-limit peaks to -1 dBFS
  const g = undb(TARGET_DB) / gatedRms(x), ceil = undb(PEAK_DB), knee = ceil * 0.7;
  for (let i = 0; i < x.length; i++) {
    let v = x[i] * g; const av = Math.abs(v);
    if (av > knee) v = Math.sign(v) * (knee + (ceil - knee) * Math.tanh((av - knee) / (ceil - knee)));
    x[i] = v;
  }
  const fade = Math.round(SR * 0.008);
  for (let i = 0; i < fade; i++) { x[i] *= i / fade; x[x.length - 1 - i] *= i / fade; }
  writeWav(`${dir}/voices/${line.id}.wav`, [x, x]);   // dual-mono stereo: Remotion would play a mono clip 3 dB quieter
  // per-frame loudness envelope 0..1 for lip sync
  const hop = SR / FPS, env = [];
  for (let f = 0; f * hop < x.length; f++) env.push(rms(x, Math.floor(f * hop), Math.min(x.length, Math.floor((f + 1) * hop))));
  const mx = Math.max(...env);
  out[line.id] = { speaker: line.speaker, as: line.as || line.speaker, dur: +(x.length / SR).toFixed(3), level_db: +db(gatedRms(x)).toFixed(2),
    peak_db: +db(x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)).toFixed(2), pitch_semitones: st, env: env.map(v => +Math.min(1, v / mx).toFixed(2)) };
  console.log(line.id, line.speaker.padEnd(7), `${out[line.id].dur}s`, `level ${out[line.id].level_db} dB`, `peak ${out[line.id].peak_db} dB`, `pitch +${st}st`);
}
fs.writeFileSync(`${dir}/voices.json`, JSON.stringify(out));
console.log('total speech', Object.values(out).reduce((s, v) => s + v.dur, 0).toFixed(2), 's');
