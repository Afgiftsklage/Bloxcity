// Music + sound effects composed directly in code (pure JS synthesis, no samples), timed to the timeline's cue points.
// Then the bed (music + sfx) is ducked under every spoken word so each word sits >= 6 dB above it.
// usage: node tools/synth-audio.mjs ep01   ->  episodes/ep01/audio/{music,sfx,bed,voice,mix}.wav
import fs from 'node:fs';
import { SR, decode, writeWav, rms, db, undb } from './lib/wav.mjs';
const ep = process.argv[2] || 'ep01', dir = `episodes/${ep}`;
const tl = JSON.parse(fs.readFileSync(`${dir}/timeline.json`));
const N = Math.ceil(tl.duration * SR), TAU = Math.PI * 2;
const MARGIN_DB = 6, DUCK_TARGET_DB = 9;        // spec: >= 6 dB; we aim for 9 dB so there is headroom

// ------------------------------------------------------------------ tiny DSP toolkit
let seed = 1234; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0, seed / 4294967296 * 2 - 1);
const buf = sec => new Float32Array(Math.ceil(sec * SR));
const env = (i, n, a = 0.005, r = 0.05) => Math.min(1, i / (a * SR)) * Math.min(1, (n - i) / (r * SR));
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function lowpass(x, fc) { const a = 1 - Math.exp(-TAU * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } return x; }
function highpass(x, fc) { const a = 1 - Math.exp(-TAU * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] -= y; } return x; }
function bandpass(x, f0, q, f1 = f0) {            // state-variable filter with optional frequency sweep f0 -> f1
  let lo = 0, bp = 0; for (let i = 0; i < x.length; i++) { const f = 2 * Math.sin(Math.PI * (f0 + (f1 - f0) * i / x.length) / SR); const hi = x[i] - lo - bp / q; bp += f * hi; lo += f * bp; x[i] = bp; } return x; }
const norm = (x, peak = 1) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; };
function pluck(freq, dur, bright = 0.5, damp = 0.996) {        // Karplus-Strong plucked string (pizzicato / music box)
  const n = buf(dur), P = Math.max(2, Math.round(SR / freq)), d = new Float32Array(P); let prev = 0;
  for (let i = 0; i < P; i++) { const w = rnd(); prev = prev + bright * (w - prev); d[i] = prev; }
  for (let i = 0; i < n.length; i++) { const k = i % P, nx = (k + 1) % P, v = d[k]; n[i] = v * env(i, n.length, 0.001, 0.03); d[k] = (v + d[nx]) * 0.5 * damp; }
  return n;
}
function tone(dur, f, shape = 'sine', a = 0.005, r = 0.05) {   // f: number or (t)=>Hz
  const n = buf(dur); let ph = 0;
  for (let i = 0; i < n.length; i++) { const t = i / SR; ph += TAU * (typeof f === 'function' ? f(t) : f) / SR;
    const s = shape === 'sine' ? Math.sin(ph) : shape === 'saw' ? ((ph / TAU) % 1) * 2 - 1 : shape === 'tri' ? Math.asin(Math.sin(ph)) * 2 / Math.PI : Math.sign(Math.sin(ph));
    n[i] = s * env(i, n.length, a, r); }
  return n;
}
const noise = (dur, a = 0.003, r = 0.03) => { const n = buf(dur); for (let i = 0; i < n.length; i++) n[i] = rnd() * env(i, n.length, a, r); return n; };
const decay = (x, tau) => { for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / (tau * SR)); return x; };
const mixin = (a, b, g = 1, at = 0) => { const o = Math.round(at * SR); for (let i = 0; i < b.length && i + o < a.length; i++) a[i + o] += b[i] * g; return a; };

// ------------------------------------------------------------------ sound effects
const SFX = {
  tick: () => norm(mixin(decay(bandpass(noise(0.05), 3200, 4), 0.006), decay(tone(0.05, 1900), 0.008), 0.5), 0.5),
  ding: () => { const o = buf(1.1); [[1318.5, 1], [2637, 0.5], [3990, 0.25], [5300, 0.12]].forEach(([f, g], i) => mixin(o, decay(tone(1.1, f), 0.42 / (1 + i * 0.5)), g)); return norm(o, 0.5); },
  gurgle: () => { const o = tone(0.7, t => 62 + 30 * Math.sin(t * 34) + 22 * Math.sin(t * 9.1), 'saw', 0.06, 0.2); lowpass(o, 420); mixin(o, bandpass(noise(0.7, 0.1, 0.2), 180, 3, 320), 0.6); for (let i = 0; i < o.length; i++) o[i] *= 0.6 + 0.4 * Math.sin(i / SR * 27); return norm(o, 0.55); },
  plink: c => norm(pluck(mtof([69, 72, 76, 79, 81][(c.note ?? 0) % 5]), 0.4, 0.7, 0.99), 0.5),
  shimmer: () => { const o = buf(0.8); for (let i = 0; i < 9; i++) mixin(o, decay(tone(0.3, 2400 + 3600 * Math.abs(rnd())), 0.07), 0.5, i * 0.055 + Math.abs(rnd()) * 0.02); return norm(o, 0.35); },
  sparkle: () => { const o = buf(0.7); [84, 88, 91, 96, 100].forEach((m, i) => mixin(o, decay(tone(0.35, mtof(m)), 0.09), 0.6, i * 0.06)); return norm(o, 0.38); },
  sting: () => { const o = buf(0.9); [45, 46, 57, 63, 70].forEach(m => mixin(o, tone(0.9, mtof(m), 'saw', 0.004, 0.3), 0.4)); lowpass(o, 2600); decay(o, 0.3); mixin(o, decay(tone(0.5, t => 80 - 60 * t), 0.2), 1.2); return norm(o, 0.7); },
  rumble: () => { const o = lowpass(lowpass(noise(1.5, 0.3, 0.7), 90), 90); mixin(o, tone(1.5, t => 44 + 3 * Math.sin(t * 5), 'sine', 0.3, 0.7), 0.012); return norm(o, 0.55); },
  boom: () => { const o = tone(0.8, t => 34 + 60 * Math.exp(-t * 14), 'sine', 0.002, 0.3); decay(o, 0.28); for (let i = 0; i < o.length; i++) o[i] = Math.tanh(o[i] * 2.2); mixin(o, decay(lowpass(noise(0.2), 900), 0.03), 0.5); return norm(o, 0.75); },
  boing: () => norm(decay(tone(0.5, t => 190 + 420 * t + 60 * Math.sin(t * 58) * Math.exp(-t * 5), 'tri'), 0.22), 0.5),
  slide: () => norm(tone(0.42, t => 1350 * Math.pow(0.28, t / 0.42), 'tri', 0.01, 0.08), 0.32),
  thud: () => norm(mixin(decay(tone(0.25, t => 48 + 70 * Math.exp(-t * 30)), 0.07), decay(lowpass(noise(0.05), 1200), 0.01), 0.5), 0.7),
  step: () => norm(mixin(decay(tone(0.09, t => 70 + 90 * Math.exp(-t * 50)), 0.025), decay(highpass(noise(0.03), 2500), 0.006), 0.25), 0.42),
  whoosh: () => { const o = bandpass(noise(0.45, 0.01, 0.1), 350, 1.6, 3400); for (let i = 0; i < o.length; i++) o[i] *= Math.pow(Math.sin(Math.PI * i / o.length), 1.5); return norm(o, 0.55); },
  pop: () => norm(decay(tone(0.09, t => 380 + 5200 * t), 0.03), 0.5),
  wah: () => { const o = buf(0.75); [[62, 0], [61, 0.3]].forEach(([m, at]) => { const n = tone(0.4, t => mtof(m) * (1 - 0.03 * t / 0.4), 'saw', 0.02, 0.1); bandpass(n, 900, 2.5, 350); mixin(o, n, 1, at); }); return norm(o, 0.5); },
  click: () => norm(mixin(decay(bandpass(noise(0.03), 2400, 3), 0.004), decay(bandpass(noise(0.03), 1500, 3), 0.005), 0.8, 0.028), 0.6),
  creak: () => { const o = tone(0.55, t => 170 + 150 * t + 25 * Math.sin(t * 43), 'saw', 0.03, 0.12); for (let i = 0; i < o.length; i++) o[i] *= 0.5 + 0.5 * Math.sign(Math.sin(i / SR * TAU * (38 + 30 * i / o.length))); bandpass(o, 1100, 3, 1700); return norm(o, 0.35); },
  scratch: () => { const o = noise(0.32, 0.005, 0.03); let lo = 0, bp = 0; for (let i = 0; i < o.length; i++) { const t = i / o.length, f = 2 * Math.sin(Math.PI * (700 + 2600 * Math.abs(Math.sin(t * Math.PI * 1.5))) / SR), hi = o[i] - lo - bp / 4; bp += f * hi; lo += f * bp; o[i] = bp * (1 - t); } return norm(o, 0.5); },
  squeak: () => norm(tone(0.16, t => 1700 + 1100 * Math.sin(t / 0.16 * Math.PI), 'sine', 0.01, 0.04), 0.3),
  kaching: () => { const o = buf(0.9); mixin(o, decay(bandpass(noise(0.08), 4200, 5), 0.02), 0.6); [[2093, 0.07], [2637, 0.07], [3136, 0.16], [4186, 0.16]].forEach(([f, at]) => mixin(o, decay(tone(0.7, f), 0.16), 0.5, at)); return norm(o, 0.42); },
  knock: () => norm(mixin(decay(tone(0.12, t => 150 + 120 * Math.exp(-t * 60)), 0.03), decay(bandpass(noise(0.06), 900, 3), 0.012), 0.7), 0.7),
  doorslam: () => { const o = decay(tone(0.4, t => 55 + 90 * Math.exp(-t * 40)), 0.09); mixin(o, decay(lowpass(noise(0.25), 1400), 0.04), 0.9); mixin(o, decay(bandpass(noise(0.05), 2600, 4), 0.006), 0.5, 0.03); return norm(o, 0.8); },
  chomp: () => { const o = buf(0.3); [0, 0.13].forEach(at => mixin(o, decay(lowpass(noise(0.1), 1800), 0.025), 1, at)); mixin(o, decay(tone(0.12, 110), 0.03), 0.6); return norm(o, 0.55); },
};

// ------------------------------------------------------------------ music (sections switch at the timeline's music cues)
const music = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
const put = (bus, x, t, gain = 1, pan = 0) => { const o = Math.round(t * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4); for (let i = 0; i < x.length && i + o < N; i++) { if (i + o < 0) continue; bus[0][i + o] += x[i] * gl * 1.414; bus[1][i + o] += x[i] * gr * 1.414; } };
const sections = tl.music.map((m, i) => ({ ...m, end: tl.music[i + 1]?.t ?? tl.duration }));
const sin2 = i => Math.sin(i * 1.7) * 0.4;
const shaker = () => norm(decay(highpass(noise(0.05), 5000), 0.012), 0.2);
const block = f => norm(decay(bandpass(noise(0.06), f, 8), 0.012), 0.5);
for (const s of sections) {
  const len = s.end - s.t, tail = Math.round(s.end * SR), start = [music[0].slice(), music[1].slice()];
  const note = (m, t, dur, g, pan = 0, bright = 0.6) => { if (t < len - 0.02) put(music, pluck(mtof(m), dur, bright), s.t + t, g, pan); };
  if (s.name === 'sneak') {                       // tiptoe pizzicato in A minor, 104 bpm
    const b = 60 / 104, bass = [45, 52, 45, 52, 43, 50, 44, 52], mel = [69, null, 72, null, 76, 75, 76, null, 69, null, 72, null, 74, 73, 74, null];
    for (let i = 0; i * b < len; i++) { note(bass[i % 8], i * b, 0.5, 0.5, -0.15, 0.35); if (i % 2) put(music, shaker(), s.t + i * b + b / 2, 0.5, 0.3); }
    for (let i = 0; i * b / 2 < len; i++) { const m = mel[i % 16]; if (m) note(m + 12, i * b / 2, 0.3, 0.26, 0.25, 0.8); }
  } else if (s.name === 'tension') {              // low drone + heartbeat + creeping minor seconds
    const d = buf(len); for (const [m, g] of [[33, 1], [45, 0.5], [46, 0.22], [52, 0.3]]) mixin(d, tone(len, t => mtof(m) * (1 + 0.004 * Math.sin(t * 5.2 + m)), 'saw', 1.2, 0.3), g);
    lowpass(d, 520); for (let i = 0; i < d.length; i++) d[i] *= 0.75 + 0.25 * Math.sin(i / SR * TAU * 6.5); put(music, norm(d, 0.36), s.t, 1, 0);
    const b = 60 / 92; for (let i = 0; i * b < len; i++) { put(music, SFX.thud(), s.t + i * b, 0.42); put(music, SFX.thud(), s.t + i * b + 0.17, 0.26);
      if (i % 4 === 2) note([81, 82, 80, 79][(i >> 2) % 4], i * b, 0.9, 0.2, 0.4, 0.9); if (i % 2) note(57 + (i % 4 === 3 ? 1 : 0), i * b + b / 2, 0.4, 0.26, -0.3, 0.4); }
  } else if (s.name === 'comedy') {               // bouncy oom-pah in C major, 132 bpm
    const b = 60 / 132, bass = [48, 55, 43, 55, 41, 53, 43, 55], mel = [76, 79, 81, 79, 76, 72, 74, null, 77, 81, 84, 81, 79, 76, 74, null];
    for (let i = 0; i * b < len; i++) { note(bass[i % 8], i * b, 0.4, 0.5, -0.1, 0.4); put(music, block(i % 2 ? 2100 : 1500), s.t + i * b + b / 2, 0.22, 0.35);
      if (i % 2) { note(64, i * b, 0.2, 0.2, 0.2); note(67, i * b, 0.2, 0.2, 0.2); } }
    for (let i = 0; i * b / 2 < len; i++) { const m = mel[(i >> 1) % 16]; if (m && i % 2 === 0) note(m, i * b / 2, 0.32, 0.3, 0.2, 0.85); }
  } else if (s.name === 'happy') {                // sunny day: light skipping tune in G major, 120 bpm
    const b = 60 / 120, bass = [43, 50, 47, 50, 48, 55, 50, 54], mel = [79, 83, 86, 83, 81, 79, 78, null, 76, 79, 83, 79, 81, 83, 86, null];
    for (let i = 0; i * b < len; i++) { note(bass[i % 8], i * b, 0.4, 0.46, -0.1, 0.4); put(music, shaker(), s.t + i * b + b / 2, 0.45, 0.3); if (i % 2) { note(62, i * b, 0.18, 0.16, 0.25); note(67, i * b, 0.18, 0.16, 0.25); } }
    for (let i = 0; i * b / 2 < len; i++) { const m = mel[i % 16]; if (m) note(m, i * b / 2, 0.35, 0.27, 0.2, 0.85); }
  } else if (s.name === 'dream') {                // candy daydream: music-box arpeggios + bell shimmer
    const b = 60 / 150, arp = [72, 76, 79, 84, 88, 84, 79, 76, 74, 77, 81, 86, 89, 86, 81, 77];
    for (let i = 0; i * b / 2 < len; i++) { note(arp[i % 16] + 12, i * b / 2, 0.6, 0.24, sin2(i), 0.95); if (i % 4 === 0) note(arp[i % 16] - 24, i * b / 2, 0.8, 0.4, 0, 0.4); }
  } else if (s.name === 'drumroll') {             // snare roll that stops dead for the reveal
    const roll = Math.min(len, 1.2); for (let t = 0; t < roll; t += 0.035) put(music, norm(decay(bandpass(noise(0.05), 1900, 1.2), 0.012), 0.5), s.t + t, 0.35 + 0.5 * t / roll, 0);
  } else if (s.name === 'panic') {                // frantic chromatic gallop
    const b = 60 / 176; for (let i = 0; i * b / 2 < len; i++) { note(72 + [0, 1, 3, 4, 6, 7, 9, 10, 12, 10, 9, 7, 6, 4, 3, 1][i % 16], i * b / 2, 0.14, 0.32, (i % 2) * 0.5 - 0.25, 0.9);
      if (i % 2 === 0) note(i % 4 ? 43 : 36, i * b / 2, 0.2, 0.5, 0, 0.4); put(music, shaker(), s.t + i * b / 2, 0.55, 0.3); }
  } else if (s.name === 'button') {               // cheeky "ta-da" to close (and loop back to the top)
    [[60, 0.55], [64, 0.55], [67, 0.55], [72, 0.75], [76, 0.95], [79, 0.95], [84, 0.95]].forEach(([m, t]) => note(m, t, 0.7, 0.34, (m - 72) / 30, 0.85));
    [43, 47, 48].forEach((m, i) => note(m, 0.15 + i * 0.2, 0.3, 0.45, 0, 0.4));
  }
  // nothing from this section rings past its end (hard musical stops: "stop" = record-scratch silence)
  const fade = Math.round(0.07 * SR);
  for (const c of [0, 1]) { for (let i = tail - fade; i < N; i++) { if (i < 0) continue; const k = i < tail ? (tail - i) / fade : 0; music[c][i] = start[c][i] + (music[c][i] - start[c][i]) * k; } }
}
for (const c of [0, 1]) for (let i = 0; i < N; i++) music[c][i] *= 0.6;
// one small room reverb on the music for glue (4 feedback combs)
for (const c of [0, 1]) { const dry = music[c].slice(); for (const [d, g] of [[0.0297 + c * 0.001, 0.72], [0.0371, 0.7], [0.0411 + c * 0.0013, 0.68], [0.0437, 0.66]]) { const D = Math.round(d * SR), y = new Float32Array(N); for (let i = D; i < N; i++) y[i] = dry[i - D] + y[i - D] * g; for (let i = 0; i < N; i++) music[c][i] += y[i] * 0.045; } }

for (const c of tl.cues) { const gen = SFX[c.sfx || c.name]; if (!gen) { console.warn('unknown sfx', c.name); continue; } put(sfx, gen(c), c.t, (c.gain ?? 1) * 0.8, c.pan ?? 0); }

// ------------------------------------------------------------------ voice track + ducking
const voice = new Float32Array(N);
for (const v of tl.voices) { const x = decode(`${dir}/${v.file}`), o = Math.round(v.start * SR); for (let i = 0; i < x.length && i + o < N; i++) voice[i + o] += x[i]; }
const bedPre = [0, 1].map(c => { const b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = music[c][i] + sfx[c][i]; return b; });
const bedMono = () => { const m = new Float32Array(N); for (let i = 0; i < N; i++) m[i] = (bed[0][i] + bed[1][i]) / 2; return m; };
let bed = bedPre.map(b => b.slice());
const target = new Float32Array(N).fill(1), pre = bedMono();
const win = (s, e) => [Math.max(0, Math.round(s * SR)), Math.min(N, Math.round(e * SR))];
for (const v of tl.voices) {                      // whole line: bed sits DUCK_TARGET_DB under the line's speech level (-17 dBFS)
  const [a, b] = win(v.start - 0.05, v.start + v.dur + 0.05), need = undb(-17 - DUCK_TARGET_DB) / Math.max(1e-6, rms(pre, a, b));
  for (let i = a; i < b; i++) target[i] = Math.min(target[i], need, 1);
}
const words = tl.captions.map(w => ({ ...w, s: w.startMs / 1000, e: Math.max(w.endMs / 1000, w.startMs / 1000 + 0.12) }));
let gain, report;
for (let pass = 0; pass < 8; pass++) {
  // zero-phase smoothing of the gain curve (fast down, slow up) so ducking starts just before each word
  gain = target.slice(); const att = Math.exp(-1 / (0.02 * SR)), rel = Math.exp(-1 / (0.18 * SR));
  for (let i = 1; i < N; i++) gain[i] = gain[i] < gain[i - 1] ? gain[i] + (gain[i - 1] - gain[i]) * att : Math.min(gain[i], gain[i - 1] + (1 - rel) * (gain[i] - gain[i - 1]) + 0);
  for (let i = N - 2; i >= 0; i--) gain[i] = Math.min(gain[i], gain[i + 1] + (gain[i] - gain[i + 1]) * (gain[i] > gain[i + 1] ? rel : 0));
  for (let i = 0; i < N; i++) gain[i] = Math.min(gain[i], target[i]);
  bed = bedPre.map(b => { const o = new Float32Array(N); for (let i = 0; i < N; i++) { let s = b[i] * gain[i]; if (Math.abs(voice[i]) > 0.02 && Math.abs(s) > 0.1) s = Math.sign(s) * (0.1 + 0.02 * Math.tanh((Math.abs(s) - 0.1) / 0.02)); o[i] = s; } return o; });
  let worst = Infinity; report = [];
  for (const w of words) { const [a, b] = win(w.s, w.e), vr = db(rms(voice, a, b)), br = db(Math.max(rms(bed[0], a, b), rms(bed[1], a, b))), m = vr - br; report.push({ ...w, voice_db: vr, bed_db: br, margin: m }); worst = Math.min(worst, m);
    if (m < MARGIN_DB + 1.5) { const g = undb(m - (MARGIN_DB + 3)); const [a2, b2] = win(w.s - 0.03, w.e + 0.03); for (let i = a2; i < b2; i++) target[i] *= g; } }
  console.log(`duck pass ${pass + 1}: worst word margin ${worst.toFixed(1)} dB`);
  if (worst >= MARGIN_DB + 1.5) break;
}
// ------------------------------------------------------------------ write stems + final mix
fs.mkdirSync(`${dir}/audio`, { recursive: true });
const mix = [0, 1].map(c => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = Math.max(-0.985, Math.min(0.985, voice[i] + bed[c][i])); return o; });
writeWav(`${dir}/audio/music.wav`, music); writeWav(`${dir}/audio/sfx.wav`, sfx); writeWav(`${dir}/audio/bed.wav`, bed); writeWav(`${dir}/audio/voice.wav`, [voice]); writeWav(`${dir}/audio/mix.wav`, mix);
const pk = x => db(x.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
console.log(`music ${db(rms(music[0])).toFixed(1)} dB rms | sfx peak ${pk(sfx[0]).toFixed(1)} dB | bed peak ${pk(bed[0]).toFixed(1)} dB | mix peak ${pk(mix[0]).toFixed(1)} dB | ${tl.cues.length} sfx cues, ${sections.length} music sections`);
