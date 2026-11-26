// EP01 — "NEVER touch the cake at 3 AM"
// Pure data + pose functions (no three.js imports) so the same file drives the renderer and tools/retime.mjs.
// Each beat: { id, line | dur, shots:[camera setups], act(stage, ctx), sfx:[{at,name,gain}], music }
//   ctx: t (s since beat start), u (0..1), dur, vt (s since the voice started), w('word') -> beat-local time of that word, level(name) -> voice loudness 0..1
// Stage space: x right, y up, z toward the viewer. Room is 4.8 x 4.8 m.  Facing 0 = toward +z, 90 = toward +x.
import { seg, smooth, easeOut, easeInOut, backOut, lerp, clamp, sat } from '../../web/src/engine/util.js';

export const characters = {
  bean:   { scale: 1.0,  skin: '#F7C59A' },
  dottie: { scale: 1.12, skin: '#F2B890' },
  mom:    { scale: 1.65, skin: '#EDB48C' },
};

// ---- blocking marks
const A = [-0.45, -0.1];            // Bean talks to camera
const B = [0.25, -0.2];             // Bean at the table, reaching for the cake
const C = [-0.55, 0.1];             // Bean backs away / begs
const W = [-0.5, -1.15];            // waypoint around the table
const D = [0.5, -1.22];             // Bean next to the couch
const CAKE = [0.3, 0.5, -0.7], LUMP = [0.96, 0.95, -1.85];
const SEAT = [0.96, -1.85], SEAT_Y = 0.5 - 0.30 * 1.12 + 0.03;
const DOOR = [-1.8, 1.05];
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / Math.PI;
const mix2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const along = (pts, u) => {          // position + heading along a polyline
  const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = L.reduce((a, b) => a + b, 0);
  let d = sat(u) * tot, i = 0; while (i < L.length - 1 && d > L[i]) d -= L[i++];
  return { p: mix2(pts[i], pts[i + 1], L[i] ? d / L[i] : 0), h: faceTo(pts[i], pts[i + 1]) };
};
const sin = Math.sin, PI = Math.PI;

// ---- shared camera setups
const cakeHero = { pos: [-0.45, 0.55, 0.45], look: [0.36, 0.6, -0.85], fov: 34, focus: CAKE };
const lumpLow = { pos: [0.5, 0.5, -0.1], look: [0.95, 0.98, -1.85], fov: 36, focus: LUMP };
const wideL = { pos: [-1.35, 0.7, 1.9], look: [0.15, 0.68, -0.55], fov: 40 };
const twoShot = { pos: [0.75, 0.85, 0.35], look: [0.74, 0.74, -1.55], fov: 40 };
const beanCU2 = { on: 'bean', dist: 0.75, yaw: -40, pitch: 2, focus: 'bean' };      // Bean seen from the couch

export function setup(s) {
  s.obj('Crumbs').rotation.y = PI;                    // crumbs sit where the missing slices were (back half)
  s.slices = { dottie: s.makeSlice(), bean: s.makeSlice(), mom: s.makeSlice() };
}

// state that depends on how far the story is (pure function of the beat index, so frames can render in any order)
const ORDER = ['hook', 'guards', 'clock', 'hungry', 'tiptoe', 'bite', 'eyes', 'who', 'alive', 'please', 'bed', 'wait', 'pull', 'inspector', 'half', 'deal', 'dealyes', 'lights', 'mom', 'scream', 'outro'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
export function base(s, c) {
  const i = I[c.id];
  s.setCake([4, 5, 6, 7], true);                       // Dottie already ate the back half… nobody has noticed yet
  s.setClock(i > I.clock || (i === I.clock && c.t > 0.72) ? '3:00' : '2:59');
  s.obj('LumpEyes').visible = i >= I.eyes && i <= I.pull;
  s.obj('BlanketPile').visible = false;
  s.dottie.hide(); s.mom.hide();
  if (i > I.pull) revealed(s);
  if (i > I.lights) { s.setLights(1); s.setDoor(1); momAtDoor(s); }
}
function revealed(s) {
  s.obj('BlanketLump').visible = false; s.obj('BlanketPile').visible = true;
  s.dottie.group.visible = true;
  s.dottie.at(SEAT[0], SEAT[1], -22, SEAT_Y).sit().expr({ frosting: true }).hold('slice', s.slices.dottie, true);
}
function momAtDoor(s) {
  s.mom.group.visible = true;
  s.mom.at(DOOR[0], DOOR[1], 100).pose({ armL: [58, -42], armR: [58, -42], head: [-4, 0, 6] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'smirk' });
}
const lumpTalk = (s, c, amp = 1) => {                  // the blanket "monster" wobbles with its voice
  const l = c.level('monster'), o = s.obj('BlanketLump');
  o.scale.set(1 + 0.05 * l * amp, 1 + 0.16 * l * amp, 1 + 0.05 * l * amp);
  o.rotation.z = sin(c.T * 9) * 0.05 * l * amp; o.rotation.x = sin(c.T * 7) * 0.04 * l * amp;
};
const tremble = (c, amp = 1) => sin(c.T * 38) * 1.6 * amp;

export const beats = [
  // 1 ─ HOOK
  { id: 'hook', line: 'L01', music: 'sneak',
    shots: [{ on: 'bean', dist: 1.12, yaw: -7, pitch: 2 }, { on: 'bean', dist: 1.5, yaw: 30, pitch: 7 }, cakeHero],
    sfx: [{ at: 'w:cake', name: 'shimmer', gain: 0.7 }],
    act(s, c) {
      const never = c.w('never'), k = seg(c.t, never - 0.1, never + 0.15), wag = c.t > never && c.t < never + 1 ? sin((c.t - never) * 22) * 14 : 0;
      s.bean.at(...A, 0).pose({ torso: [10 + 4 * k, 0, 0], head: [2, sin(c.t * 2.2) * 10 * (1 - k), 4],
        armR: [lerp(0, 62, k), lerp(8, 28, k) + wag, 0], armL: [0, 8] })
        .expr({ eyes: k > 0.5 ? 'wide' : 'half', brows: k > 0.5 ? 'angry' : 'worried', mouth: 'whisper', look: [k > 0.5 ? 0 : sin(c.t * 2.2) * 0.7, 0] });
    } },
  // 2
  { id: 'guards', line: 'L02',
    shots: [{ on: 'bean', dist: 1.2, yaw: -24, pitch: 3 }, { pos: [-0.2, 0.62, 0.3], look: [0.9, 0.86, -1.8], fov: 36, focus: LUMP }],
    act(s, c) {
      const m = c.w('monster'), k = easeOut(seg(c.t, m - 0.05, m + 0.2));
      s.bean.at(...A, 0).pose({ torso: [8, 0, 0], head: [0, -6, -5], armL: [70 * k, 30 * k, 0], armR: [70 * k, 30 * k, 0], lift: 0.02 * k })
        .expr({ eyes: k > 0.4 ? 'wide' : 'open', brows: 'worried', mouth: 'whisper', look: [0, k > 0.4 ? 0 : 0.2] });
    } },
  // 3 ─ the clock turns 3:00
  { id: 'clock', dur: 1.4, focus: [-0.92, 0.57, -2.0],
    shots: [{ pos: [-0.74, 0.68, -0.95], look: [-0.92, 0.58, -2.0], fov: 32, dolly: [-0.02, -0.01, -0.14] }],
    sfx: [{ at: 0.05, name: 'tick' }, { at: 0.4, name: 'tick' }, { at: 0.72, name: 'ding' }],
    act(s, c) {
      s.bean.at(...A, 0);
      const k = seg(c.t, 0.72, 0.95), pop = 1 + 0.16 * sin(k * PI); s.obj('ClockFace').scale.set(pop, pop, 1);    // the digits pop when it flips to 3:00
    } },
  // 4
  { id: 'hungry', line: 'L03',
    shots: [{ on: 'bean', dist: 1.0, yaw: 9, pitch: 1 }, { on: 'bean', dist: 1.45, yaw: -32, pitch: -7, up: -0.22 }],
    sfx: [{ at: 0.1, name: 'gurgle', gain: 0.8 }],
    act(s, c) {
      const so = c.w('so'), k = seg(c.t, so, so + 0.25), end = seg(c.t, c.dur - 0.5, c.dur - 0.2);
      s.bean.at(...A, 0).pose({ torso: [-6 * k, 0, 0], head: [8 * k, 14 * end, 5], armR: [38 + sin(c.t * 9) * 8, -22 + Math.cos(c.t * 9) * 8, 0], armL: [34 - sin(c.t * 9) * 8, -22 - Math.cos(c.t * 9) * 8, 0] })
        .expr({ eyes: end > 0.5 ? 'half' : k > 0.5 ? 'closed' : 'open', brows: end > 0.5 ? 'angry' : 'worried', mouth: end > 0.5 ? 'smirk' : 'smile', look: [end * 0.8, 0], blush: 0.5 });
    } },
  // 5 ─ tiptoe to the table
  { id: 'tiptoe', dur: 1.7, focus: 'bean',
    shots: [{ pos: [1.25, 0.6, 1.25], look: 'bean', track: true, fov: 40, dolly: [-0.12, 0, -0.1] }],
    sfx: [0.12, 0.5, 0.88, 1.26].map((at, i) => ({ at, name: 'plink', note: i })),
    act(s, c) {
      const u = easeInOut(seg(c.t, 0.05, 1.55)), step = c.t * 2.65 * PI, { p, h } = along([A, [-0.05, 0.1], B], u), moving = u > 0 && u < 1 ? 1 : 0;
      s.bean.at(p[0], p[1], lerp(h, 180, seg(u, 0.75, 1))).pose({ torso: [14, 0, sin(step) * 4], head: [6, sin(c.t * 4) * 22, 0], legL: sin(step) * 42 * moving, legR: -sin(step) * 42 * moving,
        armL: [62, 18, 0], armR: [62, 18, 0], lift: Math.abs(sin(step)) * 0.035 * moving + 0.015 })
        .expr({ eyes: 'wide', brows: 'raised', mouth: 'flat', look: [sin(c.t * 4) * 0.8, 0] });
    } },
  // 6 ─ just one tiny bite
  { id: 'bite', line: 'L04',
    shots: [{ on: 'bean', dist: 1.12, yaw: 47, pitch: 2 }, { pos: [-0.55, 0.5, 0.1], look: [0.4, 0.58, -0.85], fov: 34, focus: CAKE }],
    sfx: [{ at: 'w:bite', name: 'shimmer', gain: 0.6 }],
    act(s, c) {
      const r = smooth(seg(c.t, 0.1, c.dur - 0.3));
      s.bean.at(...B, 180).pose({ torso: [10 + 16 * r, 0, 0], head: [-6 - 6 * r, 0, 0], armR: [52 + 30 * r, 6, 0], armL: [-12, 10, 0] })
        .expr({ eyes: 'wide', brows: 'raised', mouth: 'grin', look: [0, 0.35], blush: 0.4 });
    } },
  // 7 ─ the blanket opens its eyes
  { id: 'eyes', dur: 1.0, focus: LUMP, music: 'tension',
    shots: [{ pos: [0.62, 0.62, 0.3], look: [0.93, 0.88, -1.8], fov: 30, dolly: [0.05, 0.03, -0.32] }],
    sfx: [{ at: 0.22, name: 'sting' }, { at: 0.2, name: 'rumble', gain: 0.8 }],
    act(s, c) {
      s.bean.at(...B, 180).pose({ torso: [26, 0, 0], head: [-12, 0, 0], armR: [82, 6, 0], armL: [-12, 10, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'grin', look: [0, 0.35] });
      const k = backOut(seg(c.t, 0.22, 0.42)); s.obj('LumpEyes').scale.set(1, 1, Math.max(0.001, k));
      s.obj('BlanketLump').scale.setScalar(1 + 0.04 * sin(seg(c.t, 0.22, 0.6) * PI));
    } },
  // 8 ─ WHO DARES touch my cake?
  { id: 'who', line: 'L05', speaker: 'monster', focus: LUMP,
    shots: [{ ...lumpLow, pos: [0.88, 0.5, -0.3] }, { on: 'bean', dist: 1.1, yaw: 40, pitch: 0, focus: 'bean' }, { pos: [-0.75, 0.7, 1.3], look: [0.7, 0.8, -1.5], fov: 38, focus: LUMP }],
    sfx: [{ at: 0, name: 'rumble' }, { at: 'w:dares', name: 'boom', gain: 0.6 }],
    act(s, c) {
      lumpTalk(s, c, 1.3);
      const k = easeOut(seg(c.t, 0, 0.5));
      s.bean.at(...B, 180).pose({ torso: [lerp(26, -8, k), 0, tremble(c, 0.5)], head: [-12 + 22 * k, tremble(c), 0], armR: [lerp(82, 20, k), 16, 0], armL: [lerp(-12, 20, k), 16, 0], auto: { blink: false } })
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'o', sweat: true });
    } },
  // 9 ─ AAAH! The blanket is ALIVE!
  { id: 'alive', line: 'L06', inFrame: ['bean'],
    shots: [{ on: 'bean', dist: 1.15, yaw: 40, pitch: -3, shake: 1, anchor: 0.9 }, wideL, { on: 'bean', dist: 1.0, yaw: 162, pitch: 8, anchor: 2.4, focus: LUMP }],
    sfx: [{ at: 0.05, name: 'boing' }, { at: 1.15, name: 'slide' }, { at: 'w:alive', name: 'sting', gain: 0.6 }],
    act(s, c) {
      lumpTalk(s, c, 0); const lump = s.obj('BlanketLump'); lump.rotation.z = sin(c.T * 3) * 0.03;
      const j = seg(c.t, 0.02, 0.62), back = easeInOut(seg(c.t, 1.0, 1.8)), pt = seg(c.t, c.w('blanket') - 0.1, c.w('blanket') + 0.15);
      const p = mix2(B, C, back), step = c.t * 9 * PI;
      s.bean.at(p[0], p[1], lerp(180, faceTo(C, SEAT), back)).pose({ lift: sin(j * PI) * 0.28, torso: [-10 + 6 * pt, 0, tremble(c, 0.6)], head: [10 - 8 * pt, 0, 0],
        armL: [lerp(172, 30, pt), 14, 0], armR: [lerp(172, 88, pt), 14, 0], legL: back > 0 && back < 1 ? -sin(step) * 30 : j < 1 ? 22 : 0, legR: back > 0 && back < 1 ? sin(step) * 30 : j < 1 ? -22 : 0, auto: { blink: false } })
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
    } },
  // 10 ─ please mister monster
  { id: 'please', line: 'L07',
    shots: [{ on: 'bean', dist: 1.15, yaw: -28, pitch: 24, up: -0.05 }, { on: 'bean', dist: 1.0, yaw: 32, pitch: 4 }],
    sfx: [{ at: 0.08, name: 'thud', gain: 0.7 }],
    act(s, c) {
      lumpTalk(s, c, 0);
      const k = easeOut(seg(c.t, 0, 0.22));
      s.bean.at(...C, faceTo(C, SEAT)).pose({ lift: -0.2 * k, legL: -86 * k, legR: -86 * k, torso: [6, 0, tremble(c, 0.7)], head: [14, 0, tremble(c)],
        armL: [118 + sin(c.t * 7) * 8, -14, 0], armR: [118 + sin(c.t * 7) * 8, -14, 0], auto: { idle: 0.3 } })
        .expr({ eyes: 'sad', brows: 'worried', mouth: 'wobble', look: [0, -0.5], sweat: true });
    } },
  // 11 ─ leave the cake and go to BED (giggle)
  { id: 'bed', line: 'L08', speaker: 'monster', focus: LUMP,
    shots: [lumpLow, { pos: [0.0, 0.62, 1.5], look: [0.6, 0.8, -1.2], fov: 36, focus: LUMP }, { on: 'bean', dist: 1.0, yaw: 28, pitch: 3, focus: 'bean' }],
    sfx: [{ at: 0, name: 'rumble', gain: 0.7 }],
    act(s, c) {
      const gig = c.w('bed') + 0.55, g = seg(c.t, gig, gig + 0.2);
      lumpTalk(s, c, 1.2); const lump = s.obj('BlanketLump');
      if (g > 0) { lump.position.y += Math.abs(sin((c.t - gig) * 16)) * 0.035; s.obj('LumpEyes').scale.set(1, 1, 0.45); }
      s.bean.at(...C, faceTo(C, SEAT)).pose({ lift: -0.2, legL: -86, legR: -86, torso: [6 - 10 * g, 0, tremble(c, 0.7 * (1 - g))], head: [14 - 4 * g, 0, 12 * g],
        armL: [lerp(118, 20, g), -14 + 26 * g, 0], armR: [lerp(118, 20, g), -14 + 26 * g, 0], auto: { idle: 0.3 } })
        .expr(g > 0.5 ? { eyes: 'half', brows: 'skeptic', mouth: 'flat', look: [0, -0.3] } : { eyes: 'sad', brows: 'worried', mouth: 'wobble', look: [0, -0.5], sweat: true });
    } },
  // 12 ─ wait… why does the monster sound like DOTTIE?
  { id: 'wait', line: 'L09',
    shots: [{ on: 'bean', dist: 1.05, yaw: 26, pitch: 3 }, { pos: [-1.6, 0.8, 1.7], look: 'bean', fov: 38, track: true, focus: 'bean' }],
    sfx: [{ at: 0.05, name: 'pop', gain: 0.6 }, ...[0, 1, 2, 3, 4, 5].map(i => ({ at: -1.45 + i * 0.22, name: 'step', gain: 0.6 }))],
    act(s, c) {
      lumpTalk(s, c, 0); s.obj('BlanketLump').rotation.z = sin(c.T * 5) * 0.012;
      const up = easeOut(seg(c.t, 0, 0.35)), go = easeInOut(seg(c.t, c.dur - 1.5, c.dur + 0.35)), { p, h } = along([C, W, D], go), step = c.t * 7.5 * PI, mv = go > 0.01 ? 1 : 0;
      s.bean.at(p[0], p[1], mv ? h : faceTo(C, SEAT)).pose({ lift: -0.2 * (1 - up) + Math.abs(sin(step)) * 0.02 * mv, legL: mv ? sin(step) * 34 : -86 * (1 - up), legR: mv ? -sin(step) * 34 : -86 * (1 - up),
        torso: [mv * 10, 0, 0], head: [4, 0, mv ? 0 : 10], armL: mv ? [-sin(step) * 30, 10, 0] : [0, 12, 0], armR: mv ? [sin(step) * 30, 10, 0] : [0, 12, 0] })
        .expr({ eyes: 'half', brows: mv ? 'angry' : 'skeptic', mouth: 'flat', look: [0, -0.2] });
    } },
  // 13 ─ the reveal
  { id: 'pull', dur: 1.2, inFrame: [],
    shots: [{ ...twoShot, dolly: [0.1, 0, -0.12], focus: LUMP }],
    sfx: [{ at: 0.3, name: 'whoosh' }, { at: 0.5, name: 'pop' }, { at: 0.62, name: 'wah' }],
    act(s, c) {
      const go = seg(c.t, 0, 0.3), { p } = along([C, W, D], lerp(0.9, 1, go)), yank = seg(c.t, 0.28, 0.5), off = c.t >= 0.5;
      s.bean.at(p[0], p[1], faceTo(D, SEAT)).pose({ torso: [lerp(14, -14, yank), 0, 0], armL: [lerp(86, 150, yank), 10, 0], armR: [lerp(86, 150, yank), 10, 0], head: [6, 0, 0] })
        .expr(off ? { eyes: 'wide', brows: 'raised', mouth: 'o' } : { eyes: 'angry', brows: 'angry', mouth: 'flat' });
      const lump = s.obj('BlanketLump');
      if (!off) { lump.scale.set(1 + 0.35 * yank, 1 - 0.15 * yank, 1 + 0.2 * yank); lump.position.x -= 0.14 * yank; lump.position.z += 0.16 * yank; lump.rotation.z = 0.25 * yank; }
      else {
        revealed(s); const k = seg(c.t, 0.5, 0.75), pile = s.obj('BlanketPile');
        pile.position.y += sin(k * PI) * 0.35; pile.position.x = lerp(pile.position.x - 0.7, pile.position.x, easeOut(k)); pile.rotation.z = (1 - k) * 2.5;
        s.dottie.pose({ armR: [70, 10, 0], armL: [0, 14, 0], head: [0, 0, 0], squash: 1 - 0.1 * sin(seg(c.t, 0.5, 0.8) * PI), auto: { blink: false } }).expr({ eyes: 'shock', brows: 'raised', mouth: 'o', frosting: true });
      }
    } },
  // 14 ─ cake inspector
  { id: 'inspector', line: 'L10', music: 'comedy',
    shots: [{ on: 'dottie', dist: 1.12, yaw: 14, pitch: 4 }, beanCU2, { on: 'dottie', dist: 0.95, yaw: 28, pitch: -3 }],
    sfx: [{ at: 'w:hi', name: 'plink', note: 2 }, { at: 'w:inspector', name: 'squeak' }],
    act(s, c) {
      const hi = c.w('hi'), insp = c.w('cake'), wave = c.t > hi && c.t < hi + 0.8 ? sin((c.t - hi) * 24) * 16 : 0, k = seg(c.t, insp - 0.1, insp + 0.2), w1 = seg(c.t, hi - 0.1, hi + 0.1) * (1 - seg(c.t, hi + 0.8, hi + 1));
      s.dottie.pose({ armL: [20 * w1, 96 * w1 + wave, 0], armR: [lerp(50, 96, k), 8, 0], head: [2, 0, c.t < hi ? -8 : 8], torso: [0, 0, c.t < hi ? -3 : 3] })
        .expr({ eyes: c.t < hi ? 'wide' : 'open', brows: k > 0.5 ? 'worried' : 'raised', mouth: 'teeth', look: [c.t < hi ? sin(c.t * 9) * 0.8 : 0, 0], frosting: true, sweat: true, blush: 0.4 });
      beanAtCouch(s, c).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' });
    } },
  // 15 ─ you ate HALF the cake
  { id: 'half', line: 'L11',
    shots: [{ ...beanCU2, shake: 0.4 }, { pos: [0.3, 1.52, -0.42], look: [0.3, 0.45, -0.72], fov: 28, focus: CAKE, dolly: [0, -0.12, 0] }],
    sfx: [{ at: 'w:half', name: 'thud' }, { at: 'w:half', name: 'sting', gain: 0.5 }],
    act(s, c) {
      const d0 = seg(c.t, 0, 0.2), you = c.w('you'), pt = seg(c.t, you, you + 0.2);
      beanAtCouch(s, c).pose({ lift: sin(d0 * PI) * 0.08, torso: [-6 + 10 * pt, 0, 0], armL: [lerp(150, 30, pt), 16, 0], armR: [lerp(150, 84, pt), 30 * pt, 0], head: [4, 0, 0] })
        .expr({ eyes: 'angry', brows: 'angry', mouth: c.t < you ? 'scream' : 'frown' });
      s.dottie.pose({ squash: 0.93, head: [-10, 0, 0], armR: [40, 8, 0] }).expr({ eyes: 'wince', brows: 'worried', mouth: 'teeth', frosting: true });
    } },
  // 16 ─ the bribe
  { id: 'deal', line: 'L12',
    shots: [{ on: 'dottie', dist: 1.05, yaw: 16, pitch: 3 }, twoShot, { on: 'dottie', dist: 1.0, yaw: 36, pitch: 9 }, beanCU2],
    sfx: [{ at: 'w:slice', name: 'sparkle' }],
    act(s, c) {
      const ok = c.w('okay'), sl = c.w('slice'), mom = c.w('mom'), k = smooth(seg(c.t, sl - 0.35, sl + 0.1)), sh = 1 - seg(c.t, ok - 0.1, ok + 0.1);
      s.dottie.pose({ torso: [14 * sh + 8 * k, 0, 0], head: [4, 0, -6 * sh], armL: [70 * sh + 10, 20, 0], armR: [lerp(48, 78, k), -6, 0] })
        .expr({ eyes: sh > 0.5 ? 'wide' : c.t > mom - 0.2 ? 'half' : 'open', brows: sh > 0.5 ? 'worried' : 'raised', mouth: sh > 0.5 ? 'o' : 'smile', look: [c.t > mom - 0.3 ? -0.7 : 0, 0], frosting: true });
      beanAtCouch(s, c).pose({ head: [k > 0.5 ? -4 : 4, 0, 8 * k], armL: [0, 10, 0], armR: [20 * k, 10, 0] })
        .expr(k > 0.5 ? { eyes: 'wide', brows: 'raised', mouth: 'smile', look: [0.3, 0.3], blush: 0.6 } : { eyes: 'half', brows: 'angry', mouth: 'flat' });
    } },
  // 17 ─ Deal!
  { id: 'dealyes', line: 'L13', pad: [0.08, 0.34],
    shots: [{ ...beanCU2, dist: 0.62 }],
    sfx: [{ at: 0.05, name: 'pop' }, { at: 0.1, name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      const k = backOut(seg(c.t, 0, 0.25));
      s.dottie.hold('slice', null, false).pose({ armR: [60, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', frosting: true });
      beanAtCouch(s, c).hold('slice', s.slices.bean, true).pose({ lift: sin(sat(c.t / 0.3) * PI) * 0.06, armR: [50 + 30 * k, 24, 0], armL: [30 * k, 30 * k, 0], head: [8, 0, 6] })
        .expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.7 });
    } },
  // 18 ─ click. lights on.
  { id: 'lights', dur: 1.3, inFrame: [], music: 'stop',
    shots: [{ pos: [0.78, 1.0, 0.6], look: [0.72, 0.72, -1.5], fov: 42, dolly: [0, 0, -0.14], focus: 'dottie' }],
    sfx: [{ at: 0.3, name: 'click' }, { at: 0.32, name: 'scratch' }, { at: 0.42, name: 'creak' }],
    act(s, c) {
      const on = c.t >= 0.3, door = easeOut(seg(c.t, 0.42, 0.95));
      s.setLights(on ? 1 : 0); s.setDoor(door);
      const fr = on ? 1 : 0, look = [-0.8 * fr, 0];
      s.dottie.hold('slice', null, false).pose({ armR: [60, 0, 0], head: [0, -30 * fr, 0], auto: { blink: !on, idle: on ? 0 : 1 } }).expr(on ? { eyes: 'shock', brows: 'raised', mouth: 'flat', look, frosting: true } : { eyes: 'happy', brows: 'raised', mouth: 'grin', frosting: true });
      beanAtCouch(s, c).hold('slice', s.slices.bean, true).pose({ armR: [110, 6, 0], armL: [0, 12, 0], head: [8 * (1 - fr), 0, 0], auto: { blink: !on, idle: on ? 0 : 1 } })
        .expr(on ? { eyes: 'shock', brows: 'raised', mouth: 'flat', look: [0.8, 0] } : { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.7 });
    } },
  // 19 ─ Tell Mom… WHAT?
  { id: 'mom', line: 'L14',
    shots: [{ pos: [-0.55, 0.5, 0.42], look: [-1.78, 1.12, 1.03], fov: 40, dolly: [-0.1, 0, 0.05], focus: 'mom' }, { on: 'mom', dist: 1.25, yaw: -14, pitch: -4 }],
    sfx: [{ at: 'w:what', name: 'boom' }],
    act(s, c) {
      const wh = c.w('what'), k = seg(c.t, wh - 0.05, wh + 0.15);
      s.mom.pose({ torso: [8 * k, 0, 0], head: [-6 - 6 * k, 0, 8] }).expr({ eyes: k > 0.5 ? 'wide' : 'half', brows: k > 0.5 ? 'angry' : 'skeptic', mouth: 'smirk' });
      frozenKids(s, c);
    } },
  // 20 ─ AAAH! RUN!
  { id: 'scream', line: 'L15', also: [{ line: 'L16', at: 0.12 }], inFrame: [], music: 'panic',
    shots: [{ ...twoShot, shake: 1, focus: 'dottie', dolly: [0, 0, 0] }, { pos: [0.9, 1.3, 1.9], look: 'bean', track: true, fov: 42, focus: 'bean', dolly: [0, 0, 0] }],
    sfx: [{ at: 1.1, name: 'whoosh' }, { at: 1.35, name: 'whoosh', gain: 0.8 }, { at: 1.2, name: 'slide' }],
    act(s, c) {
      const run = seg(c.t, 1.1, c.dur), step = c.t * 10 * PI, flail = sin(c.t * 30) * 25;
      const bp = along([D, W, [-1.0, -0.4], [-1.3, 0.6]], easeInOut(run));
      s.bean.at(bp.p[0], bp.p[1], run > 0 ? bp.h : faceTo(D, DOOR)).hold('slice', s.slices.bean, true).pose({ lift: run > 0 ? Math.abs(sin(step)) * 0.05 : sin(sat(c.t / 0.4) * PI) * 0.2, armL: [168 + flail, 14, 0], armR: [168 - flail, 14, 0],
        legL: run > 0 ? sin(step) * 48 : 20, legR: run > 0 ? -sin(step) * 48 : -20, torso: [run * 14, 0, 0], auto: { blink: false } }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      const hop = seg(c.t, 1.1, 1.5), dp = mix2(SEAT, [1.75, -1.75], easeOut(hop));
      s.dottie.at(dp[0], dp[1], lerp(-22, 60, hop), SEAT_Y + sin(hop * PI) * 0.3).hold('slice', null, false).pose({ armL: [168 - flail, 14, 0], armR: [168 + flail, 14, 0], legL: 88 - 60 * hop + flail * hop, legR: 88 - 60 * hop - flail * hop, head: [10, -20, 0], auto: { blink: false } })
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', frosting: true, sweat: true });
      s.mom.pose({ head: [-4, 0, 0] });
    } },
  // 21 ─ button: Mom takes a slice for herself
  { id: 'outro', dur: 1.5, focus: 'mom', inFrame: ['mom'], music: 'button',
    shots: [{ on: 'mom', dist: 1.3, yaw: 6, pitch: -2, up: -0.16 }],
    sfx: [{ at: 0.55, name: 'chomp' }, { at: 0.95, name: 'ding', gain: 0.7 }],
    act(s, c) {
      const k = easeOut(seg(c.t, 0.1, 0.55)), ate = c.t > 0.6;
      s.setCake([4, 5, 7], true);
      s.bean.hide(); s.dottie.hide();
      s.mom.at(-0.35, 0.15, 12).hold('slice', s.slices.mom, !ate).pose({ armR: [lerp(40, 100, k), 4, 0], armL: [0, 10, 0], head: [ate ? 6 : -4, 0, ate ? 8 : 0], torso: [0, 0, 0] })
        .expr(ate ? { eyes: 'happy', brows: 'raised', mouth: 'smile', frosting: true, blush: 0.6 } : { eyes: 'half', brows: 'raised', mouth: 'o', look: [-0.3, 0.3] });
    } },
];

function beanAtCouch(s, c) { return s.bean.at(...D, faceTo(D, SEAT)).pose({ armL: [0, 26, 0], armR: [0, 26, 0], head: [6, 0, 0] }); }
function frozenKids(s, c) {
  s.dottie.hold('slice', null, false).pose({ armR: [60, 0, 0], head: [0, -30, 0], torso: [0, 0, tremble(c, 0.4)], auto: { blink: false, idle: 0 } }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', look: [-0.8, 0], frosting: true, sweat: true });
  s.bean.at(...D, faceTo(D, SEAT)).hold('slice', s.slices.bean, true).pose({ armR: [110, 6, 0], armL: [0, 12, 0], head: [0, 60, 0], torso: [0, 0, tremble(c, 0.4)], auto: { blink: false, idle: 0 } })
    .expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', look: [0.5, 0], sweat: true });
}
