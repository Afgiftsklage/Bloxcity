// Verifies the mix from the files on disk: every spoken word must be >= 6 dB above music + effects; lines at about -17 dB.
// usage: node tools/check-mix.mjs ep01
import fs from 'node:fs'; import { SR, decode, rms, gatedRms, db } from './lib/wav.mjs';
const ep = process.argv[2] || 'ep01', dir = `episodes/${ep}`, tl = JSON.parse(fs.readFileSync(`${dir}/timeline.json`));
const N = Math.ceil(tl.duration * SR), voice = new Float32Array(N), bedL = decode(`${dir}/audio/bed.wav`, 'pan=mono|c0=c0'), bedR = decode(`${dir}/audio/bed.wav`, 'pan=mono|c0=c1');
const bedRms = (a, b) => Math.max(rms(bedL, a, b), rms(bedR, a, b));       // louder channel of the stereo bed
let bad = 0;
for (const v of tl.voices) { const x = decode(`${dir}/${v.file}`), o = Math.round(v.start * SR), lv = db(gatedRms(x)); for (let i = 0; i < x.length && i + o < N; i++) voice[i + o] += x[i];
  if (Math.abs(lv + 17) > 1) { bad++; console.log(`LEVEL ${v.line}: ${lv.toFixed(1)} dB (want -17 ±1)`); } }
let worst = { m: Infinity };
for (const w of tl.captions) { const a = Math.round(w.startMs / 1000 * SR), b = Math.min(N, Math.round(Math.max(w.endMs, w.startMs + 120) / 1000 * SR)), m = db(rms(voice, a, b)) - db(bedRms(a, b));
  if (m < worst.m) worst = { m, w }; if (m < 6) { bad++; console.log(`DUCK FAIL "${w.text}" @${(w.startMs / 1000).toFixed(2)}s margin ${m.toFixed(1)} dB`); } }
const mix = decode(`${dir}/audio/mix.wav`, 'pan=mono|c0=c0'), peak = db(mix.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
console.log(`${tl.captions.length} words checked | worst margin ${worst.m.toFixed(1)} dB ("${worst.w.text}") | lines at -17 dB: ${tl.voices.length - 0} | mix peak ${peak.toFixed(1)} dBFS | bed overall ${db(bedRms(0, N)).toFixed(1)} dB rms`);
console.log(bad ? `MIX CHECK FAILED (${bad})` : 'MIX CHECK PASSED'); process.exit(bad ? 1 : 0);
