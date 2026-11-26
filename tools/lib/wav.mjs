import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
export const SR = 48000;
export const db = x => 20 * Math.log10(Math.max(x, 1e-9));
export const undb = d => Math.pow(10, d / 20);
// decode any audio file to mono Float32 @48k (optionally through an ffmpeg filter chain)
export function decode(file, filter) {      // -> channel 1 as mono Float32 @48k (ffmpeg's own stereo->mono downmix would change the level)
  const af = [filter, filter && filter.includes('pan=') ? null : 'pan=mono|c0=c0'].filter(Boolean).join(',');
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
}
export function writeWav(file, chans, sr = SR) {      // chans: [Float32Array] (mono) or [L, R]
  const n = chans[0].length, nc = chans.length, buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 2, 28);
  buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++)
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, chans[c][i])) * 32767), 44 + (i * nc + c) * 2);
  fs.writeFileSync(file, buf);
}
export function rms(x, a = 0, b = x.length) { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); }
// RMS of the "active" part only (windows within 30 dB of the loudest window) = speech level
export function gatedRms(x, win = Math.round(SR * 0.05)) {
  const w = []; for (let i = 0; i + win <= x.length; i += win) w.push(rms(x, i, i + win));
  const mx = Math.max(...w, 1e-9), act = w.filter(v => v > mx * undb(-30));
  return Math.sqrt(act.reduce((s, v) => s + v * v, 0) / Math.max(1, act.length));
}
