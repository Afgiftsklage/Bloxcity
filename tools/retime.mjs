// Retime the shots to the real voice timings -> episodes/<ep>/timeline.json
// Every beat that has a line lasts exactly as long as its (processed) voice clip + padding; cuts land every 1–2 s, snapped to word starts.
// usage: node tools/retime.mjs ep01
import fs from 'node:fs';
const ep = process.argv[2] || 'ep01', dir = `episodes/${ep}`;
const { beats } = await import(`../${dir}/shots.js`);
const script = JSON.parse(fs.readFileSync(`${dir}/script.json`)), voices = JSON.parse(fs.readFileSync(`${dir}/voices.json`)), words = JSON.parse(fs.readFileSync(`${dir}/words.json`));
const FPS = script.fps, K = 1 / (script.speed ?? 1);      // a 1.5x episode keeps the 1–2 s cut rhythm of the un-sped story: 0.67–1.33 s on screen
const PAD = [0.1 * K, 0.2 * K], MIN_SHOT = 1.0 * K, MAX_SHOT = 2.0 * K, TARGET = 1.5 * K;
const q = t => Math.round(t * FPS) / FPS;
const tl = { ep, title: script.title, fps: FPS, beats: [], shots: [], voices: [], cues: [], music: [], captions: [], mouth: {} };
let t = 0, shotIndex = 0;
for (const b of beats) {
  const start = t; let dur, vo = 0, vdur = 0, bw = [], speaker = b.speaker;
  const lines = b.line ? [{ line: b.line, at: 0 }, ...(b.also || [])] : [];
  if (b.line) {
    const pad = b.pad || PAD; vo = pad[0]; vdur = voices[b.line].dur; dur = 0;
    for (const l of lines) {
      const v = voices[l.line], vs = q(start + pad[0] + l.at);
      tl.voices.push({ line: l.line, file: `voices/${l.line}.wav`, start: vs, dur: v.dur, speaker: v.speaker, as: v.as });
      dur = Math.max(dur, pad[0] + l.at + v.dur + pad[1]);
      for (const w of words[l.line]) tl.captions.push({ text: w.text, startMs: Math.round((vs + w.start) * 1000), endMs: Math.round((vs + w.end) * 1000), line: l.line });
      if (l.at === 0) bw = words[l.line].map(w => ({ text: w.text, start: +(vs - start + w.start).toFixed(3) }));
      v.env.forEach((e, i) => { const f = Math.round(vs * FPS) + i; (tl.mouth[v.as] ||= [])[f] = Math.max(tl.mouth[v.as][f] || 0, e); });
    }
    speaker ||= voices[b.line].as;
    if (b.min) dur = Math.max(dur, b.min);
  } else dur = b.dur;
  const end = q(start + dur); dur = end - start;
  tl.beats.push({ id: b.id, start, end, line: b.line, speaker, vo, vdur, words: bw });
  // cuts: every 1–2 s, cycle through the authored camera setups (a repeated setup punches in)
  let n = Math.max(1, Math.min(Math.max(1, Math.floor(dur / MIN_SHOT)), Math.max(Math.ceil(dur / MAX_SHOT), Math.round(dur / TARGET))));
  if (b.cuts) n = b.cuts;
  const cuts = [0]; const wordStarts = bw.map(w => w.start);
  for (let i = 1; i < n; i++) {
    let c = dur * i / n; const prev = cuts[i - 1];
    const snap = wordStarts.filter(w => Math.abs(w - c) < 0.3 * K && w - prev >= MIN_SHOT && w - prev <= MAX_SHOT && (dur - w) / (n - i) >= MIN_SHOT && (dur - w) / (n - i) <= MAX_SHOT).sort((a, b2) => Math.abs(a - c) - Math.abs(b2 - c))[0];
    cuts.push(q(snap ?? c));
  }
  cuts.push(dur);
  for (let i = 0; i < n; i++) {
    const setup = i % b.shots.length, rep = Math.floor(i / b.shots.length);
    tl.shots.push({ i: shotIndex++, beat: b.id, setup, rep, start: q(start + cuts[i]), end: q(start + cuts[i + 1]) });
  }
  const at = a => typeof a === 'string' ? (bw.find(w => w.text.toLowerCase().replace(/[^a-z0-9]/g, '') === a.slice(2))?.start ?? 0) : a < 0 ? dur + a : a;
  for (const s of b.sfx || []) tl.cues.push({ ...s, t: +(start + at(s.at)).toFixed(3), beat: b.id });
  if (b.music) tl.music.push({ t: start, name: b.music });
  t = end;
}
tl.duration = t; tl.frames = Math.round(t * FPS);
for (const k in tl.mouth) tl.mouth[k] = Array.from({ length: tl.frames }, (_, i) => tl.mouth[k][i] || 0);
tl.captions.sort((a, b) => a.startMs - b.startMs);
tl.cues.sort((a, b) => a.t - b.t);
fs.writeFileSync(`${dir}/timeline.json`, JSON.stringify(tl));
console.log(`duration ${t.toFixed(2)}s  frames ${tl.frames}  beats ${tl.beats.length}  shots ${tl.shots.length}`);
const lens = tl.shots.map(s => s.end - s.start);
for (const s of tl.shots) { const d = s.end - s.start; console.log(String(s.i).padStart(2), s.beat.padEnd(10), `setup ${s.setup}${s.rep ? ' (punch-in x' + s.rep + ')' : ''}`.padEnd(22), `${s.start.toFixed(2)} → ${s.end.toFixed(2)}`, `${d.toFixed(2)}s`, d < MIN_SHOT - 0.01 || d > MAX_SHOT + 0.01 ? '  <-- outside the cut range' : ''); }
console.log(`shot length: min ${Math.min(...lens).toFixed(2)}  max ${Math.max(...lens).toFixed(2)}  avg ${(lens.reduce((a, b) => a + b) / lens.length).toFixed(2)}`);
