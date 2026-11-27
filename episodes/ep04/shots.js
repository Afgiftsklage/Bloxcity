// EP04 — "NEVER catch the Tooth Fairy at 3 AM"  (built in the EP01 style: toy characters, the cozy room at night, ~60 s)
// Pure data + pose functions (no three.js imports) so the same file drives the renderer and tools/retime.mjs.
// Each beat: { id, line | dur, shots:[camera setups], act(stage, ctx), sfx:[{at,name,gain}], music }
//   ctx: t (s since beat start), u (0..1), dur, vt, w('word') -> beat-local time of that word, level(name) -> voice loudness 0..1
// Stage space: x right, y up, z toward the viewer. Room is 4.8 x 4.8 m.  Facing 0 = toward +z, 90 = toward +x.
import { seg, smooth, easeOut, easeInOut, backOut, lerp, sat } from '../../web/src/engine/util.js';

export const characters = {
  bean:   { scale: 1.0,  skin: '#F7C59A' },
  dottie: { scale: 1.12, skin: '#F2B890' },
  mom:    { scale: 1.65, skin: '#EDB48C' },
};

// ---- blocking marks
const BS = [-1.78, -1.72], BH = 35, BY = 0.49 - 0.30 + 0.02;   // Bean sitting up in bed (hips on the mattress, legs under the duvet)
const DM = [-1.1, -1.62], DH = -108;                            // Dottie at the bedside, between the bed and the nightstand
const DOOR = [-1.8, 1.05], DOORWAY = [-2.0, 1.05];
const TOOTH = [-1.41, 0.505, -1.9];                             // peeking out from under the pillow's front corner
const CLOCK = [-0.92, 0.57, -2.0];
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / Math.PI;
const mix2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const along = (pts, u) => {          // position + heading along a polyline
  const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = L.reduce((a, b) => a + b, 0);
  let d = sat(u) * tot, i = 0; while (i < L.length - 1 && d > L[i]) d -= L[i++];
  return { p: mix2(pts[i], pts[i + 1], L[i] ? d / L[i] : 0), h: faceTo(pts[i], pts[i + 1]) };
};
const ENTER = [DOORWAY, [-1.45, 0.75], [-0.85, -0.35], [-0.9, -1.25], DM];
const sin = Math.sin, PI = Math.PI;
const tremble = (c, amp = 1) => sin(c.T * 38) * 1.6 * amp;

// ---- shared camera setups
const pillowCU = { pos: [-1.22, 0.74, -1.5], look: [-1.5, 0.52, -1.96], fov: 32, focus: TOOTH };
const behindDottie = { pos: [-0.5, 1.38, -0.98], look: [-1.8, 0.84, -1.74], fov: 34, focus: 'bean' };        // high over Dottie's shoulder: we only see the back of her head
const twoShot = { pos: [-1.32, 1.2, 0.9], look: [-1.38, 0.82, -1.68], fov: 40 };
const revealCU = { on: 'dottie', dist: 0.78, yaw: 58, pitch: 2 };
const footCU = { pos: [-1.56, 1.25, -1.36], look: [-1.42, 0.52, -1.9], fov: 30, focus: TOOTH };   // the pillow corner from the foot of the bed
const beanCU = (yaw = -12, dist = 0.92, pitch = 3) => ({ on: 'bean', dist, yaw, pitch });             // Bean from his right/front: Dottie stays out of the lens

// ---- props built in code (setup runs once)
export function setup(s) {
  const tooth = (parent, pos) => s.prim('box', [0.034, 0.044, 0.034], { color: '#fbfaf3', rough: 0.25, parent, pos, rot: [0.2, 0.5, 0.1] });
  s.tooth = {
    hand: s.prim('group'), pillow: tooth(s.scene, TOOTH), dottie: s.prim('group'), mom: s.prim('group'),
  };
  for (const k of ['hand', 'dottie', 'mom']) { s.tooth[k].position.set(0, -0.3, 0.035); tooth(s.tooth[k], [0, 0, 0]); s.rest.get(s.tooth[k]).p.copy(s.tooth[k].position); }
  s.rest.get(s.tooth.mom).s.setScalar(0.75); s.tooth.mom.scale.setScalar(0.75);      // Mom is 1.65x: keep the tooth tooth-sized in her hand
  // flashlight: body + lens + a real spotlight beam along the arm
  const fl = s.flashG = s.prim('group', [], { pos: [0, -0.25, 0.03] });
  s.prim('cyl', [0.024, 0.02, 0.13], { color: '#2f5fd0', rough: 0.35, parent: fl });
  s.prim('cyl', [0.03, 0.026, 0.035], { color: '#2b2b33', rough: 0.4, parent: fl, pos: [0, -0.075, 0] });
  s.flashLens = s.prim('cyl', [0.026, 0.026, 0.004], { color: '#fff8d8', emissive: '#fff4c8', ei: 0, parent: fl, pos: [0, -0.094, 0] });
  s.flashBeam = s.addLight('spot', { color: '#fff1cf', angle: 0.36, penumbra: 0.55, distance: 6, parent: fl, pos: [0, -0.1, 0], target: [0, -1.2, 0] });
  // fairy wand: stick + glowing star + a small warm glow
  const wd = s.wandG = s.prim('group', [], { pos: [0, -0.26, 0.035] });
  s.prim('cyl', [0.007, 0.007, 0.24], { color: '#ff8fc8', rough: 0.4, parent: wd, pos: [0, -0.06, 0] });
  s.prim('box', [0.065, 0.065, 0.018], { color: '#ffe07a', emissive: '#ffd34d', ei: 1.4, rough: 0.3, parent: wd, pos: [0, -0.2, 0], rot: [0, 0, PI / 4], cast: false });
  s.wandGlow = s.addLight('point', { color: '#ffcf6b', distance: 1.6, parent: wd, pos: [0, -0.22, 0.04] });
}

// state that depends on how far the story is (pure function of the beat index, so frames can render in any order)
const ORDER = ['hook', 'trap', 'sleep', 'clock', 'door', 'fairy', 'reach', 'real', 'wings', 'wait', 'click', 'assistant', 'stealing', 'dollar', 'twenty', 'rich', 'lights', 'mom', 'scream', 'outro'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
export function base(s, c) {
  const i = I[c.id];
  s.setClock(i > I.clock || (i === I.clock && c.t > 0.72) ? '3:00' : '2:59');
  s.setDoor(i > I.door ? 1 : i === I.door ? easeOut(seg(c.t, 0.25, 0.9)) : 0);
  if (i > I.lights) s.setLights(1);
  s.tooth.pillow.visible = i > I.trap && i < I.reach;
  s.dottie.hide(); s.mom.hide();
  if (i > I.fairy) dottieAtBed(s, c);
  flash(s, i > I.click && i < I.scream ? 1 : 0);
  wand(s, i >= I.door && i < I.scream ? 1 : 0);
  if (i > I.lights) momAtDoor(s);
}
function flash(s, on) { s.flashBeam.intensity = 9 * on; s.flashLens.material.emissiveIntensity = 4 * on; }
function wand(s, on) { s.wandGlow.intensity = 0.1 * on; }

// Bean in bed. lean: 0 = sitting up, -74 = lying back with his head on the pillow
function beanBed(s, lean = 0, p = {}) {
  const b = s.bean.at(BS[0], BS[1], BH, BY).sit().pose({ torso: [lean, p.twist ?? 0, p.side ?? 0], head: p.head ?? [lean < -40 ? 8 : 0, 0, 0], armL: p.armL ?? [0, 14, 0], armR: p.armR ?? [0, 14, 0], lift: p.lift ?? 0 });
  if (p.auto) b.pose({ auto: p.auto });
  return b;
}
const flashOn = b => b.hold('flash', null, true);
function dottieAtBed(s, c) {
  s.dottie.group.visible = true;
  return s.dottie.at(DM[0], DM[1], DH).hold('wand', s.wandG, true, 'L').pose({ armL: [62, 10, 0], armR: [10, 10, 0] });
}
function momAtDoor(s) {
  s.mom.group.visible = true;
  s.mom.at(DOOR[0], DOOR[1], 105).pose({ armL: [58, -42], armR: [58, -42], head: [-4, 0, 6] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'smirk' });
}
const fairyMouth = (s, c) => s.dottie.expr({ open: Math.pow(c.level('fairy'), 0.65) });

export const beats = [
  // 1 ─ HOOK: he shows the tooth to camera
  { id: 'hook', line: 'L01', music: 'sneak',
    shots: [{ on: 'bean', dist: 1.02, yaw: -6, pitch: 2 }, { on: 'bean', dist: 1.4, yaw: 32, pitch: 9 }, { on: 'bean', dist: 0.62, yaw: 12, pitch: -2, up: -0.06 }],
    sfx: [{ at: 'w:tooth', name: 'shimmer', gain: 0.7 }, { at: 'w:fairy', name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      const up = easeOut(seg(c.t, 0.05, 0.4)), ct = c.w('catching'), k = seg(c.t, ct - 0.1, ct + 0.2), wig = sin(c.t * 18) * 6 * (1 - k);
      beanBed(s, 6 * k, { armR: [lerp(10, 108, up) + wig, 8, 0], armL: [lerp(0, 40, k), lerp(14, 40, k), 0], head: [4, sin(c.t * 2.2) * 8 * (1 - k), 5] })
        .hold('tooth', s.tooth.hand, true)
        .expr({ eyes: k > 0.5 ? 'wide' : 'open', brows: k > 0.5 ? 'raised' : 'worried', mouth: k > 0.5 ? 'grin' : 'whisper', look: [0, up > 0.5 && k < 0.5 ? 0.25 : 0], blush: 0.3 });
    } },
  // 2 ─ the trap: tooth under the pillow, flashlight ready
  { id: 'trap', line: 'L02',
    shots: [beanCU(14, 0.85, 7), { on: 'bean', dist: 0.95, yaw: 18, pitch: 3 }],
    sfx: [{ at: 'w:pillow', name: 'whoosh', gain: 0.4 }, { at: 'w:flashlight', name: 'pop', gain: 0.6 }],
    act(s, c) {
      const pl = c.w('pillow'), fl = c.w('flashlight'), tucked = c.t > pl + 0.25, lift = sin(seg(c.t, pl - 0.3, pl + 0.35) * PI);
      s.obj('Pillow').rotation.x += 0.25 * lift; s.obj('Pillow').position.y += 0.035 * lift;
      s.tooth.pillow.visible = tucked;
      const f = easeOut(seg(c.t, fl - 0.1, fl + 0.25));
      const b = beanBed(s, 0, { twist: lerp(-38, 0, seg(c.t, pl + 0.2, pl + 0.6)) * (c.t > pl - 0.5 ? 1 : seg(c.t, 0, 0.4)), armR: c.t < pl + 0.3 ? [70, -30, 0] : [10, 12, 0],
        armL: [lerp(0, 72, f), lerp(14, -18, f), 0], head: [6 * f, -12 * (1 - f), 6] });
      b.hold('tooth', s.tooth.hand, !tucked).hold('flash', s.flashG, c.t > fl - 0.1, 'L')
        .expr({ eyes: f > 0.5 ? 'half' : 'open', brows: f > 0.5 ? 'angry' : 'raised', mouth: f > 0.5 ? 'smirk' : 'whisper', look: [0, 0] });
    } },
  // 3 ─ pretend to sleep
  { id: 'sleep', line: 'L03',
    shots: [{ on: 'bean', dist: 1.0, yaw: -8, pitch: 6 }, { pos: [-1.45, 1.75, -1.25], look: [-1.98, 0.58, -2.0], fov: 38, focus: 'bean' }],
    sfx: [{ at: 'w:pretend', name: 'slide', gain: 0.4 }],
    act(s, c) {
      const sh = c.w('shh'), pr = c.w('pretend'), down = easeInOut(seg(c.t, pr, pr + 0.7)), finger = 1 - seg(c.t, pr - 0.15, pr + 0.1), peek = seg(c.t, c.dur - 0.45, c.dur - 0.3);
      beanBed(s, -74 * down, { armR: [lerp(30, 150, finger * seg(c.t, sh - 0.2, sh + 0.05)), -24 * finger, 0], armL: [lerp(72, 30, down), -18, 0], head: [lerp(0, 10, down), 0, 0], auto: { idle: 0.4 } })
        .hold('flash', s.flashG, true, 'L')
        .expr(down > 0.6 ? { eyes: peek > 0.5 ? 'squint' : 'closed', brows: peek > 0.5 ? 'skeptic' : 'neutral', mouth: 'smirk', look: [0.6, 0] } : { eyes: 'half', brows: 'raised', mouth: 'whisper' });
    } },
  // 4 ─ the clock turns 3:00
  { id: 'clock', dur: 1.4, focus: CLOCK,
    shots: [{ pos: [-0.74, 0.68, -0.95], look: [-0.92, 0.58, -2.0], fov: 32, dolly: [-0.02, -0.01, -0.14] }],
    sfx: [{ at: 0.05, name: 'tick' }, { at: 0.4, name: 'tick' }, { at: 0.72, name: 'ding' }],
    act(s, c) {
      beanBed(s, -74, { armL: [30, -18, 0], head: [10, 0, 0] }).hold('flash', s.flashG, true, 'L').expr({ eyes: 'closed', mouth: 'smirk' });
      const k = seg(c.t, 0.72, 0.95), pop = 1 + 0.16 * sin(k * PI); s.obj('ClockFace').scale.set(pop, pop, 1);
    } },
  // 5 ─ the door creaks open: a small glowing silhouette
  { id: 'door', dur: 1.7, focus: [-2.0, 0.9, 1.05], music: 'stop',
    shots: [{ pos: [-1.65, 1.0, -0.25], look: [-2.25, 0.9, 1.15], fov: 50, dolly: [0, 0, 0.1] }],
    sfx: [{ at: 0.25, name: 'creak' }, { at: 1.05, name: 'sparkle', gain: 0.6 }],
    act(s, c) {
      beanBed(s, -74, { armL: [30, -18, 0], head: [10, 0, 0] }).hold('flash', s.flashG, true, 'L').expr({ eyes: 'closed', mouth: 'smirk' });
      if (c.t > 0.55) {
        s.dottie.group.visible = true; const wv = seg(c.t, 1.0, 1.6);
        s.dottie.at(-2.66, 1.18, 90).hold('wand', s.wandG, true, 'L').pose({ armL: [lerp(60, 96, wv) + sin(c.t * 14) * 12 * wv, -4, 0], armR: [0, 12, 0], head: [6, -10, 0] })
          .expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      }
    } },
  // 6 ─ "Tooth Fairy… coming throoough…" (feet and wand only — no face yet)
  { id: 'fairy', line: 'L04', speaker: 'fairy', focus: 'dottie', music: 'sneak',
    shots: [{ pos: [-0.45, 0.22, 0.05], look: [-1.55, 0.2, 0.72], fov: 44, focus: [-1.5, 0.2, 0.7] }, { on: 'bean', dist: 0.72, yaw: 28, pitch: 30, focus: 'bean' }, { pos: [-0.35, 1.05, 0.95], look: [-1.3, 0.62, -1.4], fov: 40, focus: [-1.0, 0.7, -0.9] }],
    inFrame: [],
    sfx: [0.2, 0.62, 1.04, 1.46, 1.88, 2.3, 2.72].map((at, i) => ({ at, name: 'plink', note: i % 5, gain: 0.55 })),
    act(s, c) {
      beanBed(s, -74, { armL: [30, -18, 0], head: [10, 0, 0] }).hold('flash', s.flashG, true, 'L')
        .expr({ eyes: c.u > 0.3 && c.u < 0.7 ? 'squint' : 'closed', brows: c.u > 0.3 && c.u < 0.7 ? 'skeptic' : 'neutral', mouth: 'smirk', look: [0.7, 0] });
      const u = easeInOut(seg(c.t, 0.05, c.dur - 0.1)), step = c.t * 2.4 * PI, mv = u > 0 && u < 1 ? 1 : 0, { p, h } = along(ENTER, u);
      s.dottie.group.visible = true;
      s.dottie.at(p[0], p[1], lerp(h, DH, seg(u, 0.85, 1))).hold('wand', s.wandG, true, 'L')
        .pose({ torso: [12, 0, sin(step) * 4], legL: sin(step) * 40 * mv, legR: -sin(step) * 40 * mv, lift: Math.abs(sin(step)) * 0.03 * mv + 0.012,
          armL: [70 + sin(c.t * 5) * 18, 18, 0], armR: [55, 26, 0], head: [4, sin(c.t * 3) * 12, 0] })
        .expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      fairyMouth(s, c);
    } },
  // 7 ─ the hand slides under the pillow… and the tooth is gone
  { id: 'reach', dur: 1.3, focus: TOOTH,
    shots: [{ pos: [-0.45, 1.3, -1.0], look: [-1.55, 0.6, -1.88], fov: 34, focus: TOOTH, dolly: [-0.05, -0.02, -0.05] }],
    sfx: [{ at: 0.75, name: 'sparkle' }],
    act(s, c) {
      beanBed(s, -74, { armL: [30, -18, 0], head: [10, 0, 0] }).hold('flash', s.flashG, true, 'L').expr({ eyes: 'closed', mouth: 'smirk' });
      const r = sin(seg(c.t, 0.1, 1.2) * PI), got = c.t > 0.75;
      s.tooth.pillow.visible = !got;
      s.obj('Pillow').rotation.x += 0.12 * r; s.obj('Pillow').position.y += 0.02 * r;
      dottieAtBed(s, c).pose({ torso: [lerp(0, 34, r), -10 * r, 0], armR: [lerp(10, 88, r), lerp(10, -14, r), 0], head: [-14 * r, 0, 0] })
        .hold('tooth', s.tooth.dottie, got).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
    } },
  // 8 ─ "She's REAL! … can I see your wings?"
  { id: 'real', line: 'L05',
    shots: [beanCU(-14, 0.95, 4), behindDottie, beanCU(4, 0.72, 2)],
    sfx: [{ at: 0.05, name: 'boing', gain: 0.7 }, { at: 'w:wings', name: 'shimmer', gain: 0.5 }],
    act(s, c) {
      const up = backOut(seg(c.t, 0, 0.3)), w = c.w('wings'), k = seg(c.t, w - 0.3, w);
      beanBed(s, lerp(-74, -6, up), { armL: [lerp(30, 40, up), -10, 0], armR: [lerp(0, 60, k), lerp(14, 40, k), 0], head: [lerp(10, 4, up), 34 * up, 6], lift: 0.02 * sin(seg(c.t, 0, 0.3) * PI) })
        .hold('flash', s.flashG, true, 'L').expr({ eyes: 'wide', brows: 'raised', mouth: k > 0 ? 'smile' : 'o', look: [0.6, 0.1], blush: 0.6 });
      const fr = easeOut(seg(c.t, 0, 0.15));
      dottieAtBed(s, c).pose({ torso: [lerp(34, 4, fr), 0, tremble(c, 0.3)], armR: [lerp(88, 20, fr), 10, 0], armL: [lerp(62, 100, fr), 10, 0], head: [6, 0, 0], squash: 1 - 0.06 * sin(fr * PI) })
        .hold('tooth', s.tooth.dottie, true).expr({ eyes: 'shock', brows: 'raised', mouth: 'o' });
    } },
  // 9 ─ "Uh… they're invisible wings. Very rare."
  { id: 'wings', line: 'L06', speaker: 'fairy', focus: 'bean',
    shots: [behindDottie, beanCU(-8, 0.9, 3), { ...behindDottie, pos: [-0.62, 1.3, -0.82], fov: 30 }],
    sfx: [{ at: 'w:invisible', name: 'shimmer', gain: 0.5 }],
    act(s, c) {
      const inv = c.w('invisible'), flap = c.t > inv ? sin((c.t - inv) * 16) * 22 : 0;
      beanBed(s, -6, { armL: [40, -10, 0], head: [4, 34, 6 + sin(c.t * 2) * 4] }).hold('flash', s.flashG, true, 'L')
        .expr({ eyes: 'wide', brows: 'raised', mouth: 'smile', look: [0.6, 0.1], blush: 0.6 });
      dottieAtBed(s, c).pose({ torso: [4, 0, 0], armR: [20 + flap, 60 + flap, 0], armL: [100, 30 - flap, 0], head: [2, 0, -8] }).hold('tooth', s.tooth.dottie, true)
        .expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth', sweat: true });
      fairyMouth(s, c);
    } },
  // 10 ─ "Wait… why is the fairy wearing DOTTIE'S pajamas?"  (the flashlight comes up)
  { id: 'wait', line: 'L07',
    shots: [beanCU(0, 0.95, 2), beanCU(-26, 0.74, -2)],
    sfx: [{ at: 0.05, name: 'pop', gain: 0.5 }],
    act(s, c) {
      const d = c.w('dotties'), r = easeOut(seg(c.t, d - 0.4, d + 0.2));
      beanBed(s, lerp(-6, 4, r), { twist: 22 * r, armL: [lerp(40, 92, r), lerp(-10, -26, r), 0], head: [0, lerp(34, 22, r), 0] }).hold('flash', s.flashG, true, 'L')
        .expr({ eyes: r > 0.3 ? 'squint' : 'half', brows: 'skeptic', mouth: 'flat', look: [0.5, 0] });
      dottieAtBed(s, c).pose({ armR: [20, 14, 0], armL: [100, 10, 0], head: [2, 0, 0] }).hold('tooth', s.tooth.dottie, true).expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', sweat: true });
    } },
  // 11 ─ CLICK. The flashlight hits her face.
  { id: 'click', dur: 1.3, inFrame: [],
    shots: [{ ...revealCU, dolly: [0.04, 0, 0.06] }],
    sfx: [{ at: 0.3, name: 'click' }, { at: 0.36, name: 'sting', gain: 0.6 }, { at: 0.55, name: 'wah', gain: 0.8 }],
    act(s, c) {
      const on = c.t >= 0.3; flash(s, on ? 1 : 0);
      beanBed(s, 4, { twist: 22, armL: [92, -26, 0], head: [0, 22, 0] }).hold('flash', s.flashG, true, 'L').expr({ eyes: 'squint', brows: 'angry', mouth: 'flat', look: [0.5, 0] });
      const k = seg(c.t, 0.3, 0.5);
      dottieAtBed(s, c).pose({ armR: [lerp(20, 70, k), 14, 0], armL: [100, 10, 0], head: [lerp(2, -6, k), 0, 0], squash: 1 - 0.08 * sin(k * PI), auto: { blink: false } })
        .hold('tooth', s.tooth.dottie, true).expr(on ? { eyes: 'shock', brows: 'raised', mouth: 'o', sweat: true } : { eyes: 'wide', brows: 'worried', mouth: 'flat' });
    } },
  // 12 ─ "Uh… hi! I'm the fairy's… assistant?"
  { id: 'assistant', line: 'L08', music: 'comedy',
    shots: [{ on: 'dottie', dist: 0.8, yaw: 66, pitch: 4 }, beanCU(-12, 0.9, 3), { on: 'dottie', dist: 0.85, yaw: 76, pitch: -3 }],
    sfx: [{ at: 'w:hi', name: 'plink', note: 2 }, { at: 'w:assistant', name: 'squeak' }],
    act(s, c) {
      const hi = c.w('hi'), as = c.w('assistant'), wave = c.t > hi && c.t < hi + 0.8 ? sin((c.t - hi) * 24) * 16 : 0, w1 = seg(c.t, hi - 0.1, hi + 0.1) * (1 - seg(c.t, hi + 0.8, hi + 1)), k = seg(c.t, as - 0.2, as + 0.1);
      dottieAtBed(s, c).pose({ armR: [20 * w1 + 40 * k, 96 * w1 + wave + 10, 0], armL: [lerp(100, 60, k), 10, 0], head: [2, 0, c.t < hi ? -8 : 8], torso: [0, 0, c.t < hi ? -3 : 3] })
        .hold('tooth', s.tooth.dottie, true).expr({ eyes: c.t < hi ? 'wide' : 'open', brows: k > 0.5 ? 'worried' : 'raised', mouth: 'teeth', sweat: true, blush: 0.4, look: [c.t < hi ? sin(c.t * 9) * 0.8 : 0, 0] });
      beanBed(s, 4, { twist: 22, armL: [92, -26, 0], head: [0, 22, 0] }).hold('flash', s.flashG, true, 'L').expr({ eyes: 'half', brows: 'angry', mouth: 'flat', look: [0.5, 0] });
    } },
  // 13 ─ "DOTTIE! You're stealing my TOOTH!"
  { id: 'stealing', line: 'L09',
    shots: [{ ...beanCU(-6, 0.9, 3), shake: 0.4 }, { on: 'dottie', dist: 0.66, yaw: 64, pitch: 3 }],
    sfx: [{ at: 'w:tooth', name: 'thud' }, { at: 'w:tooth', name: 'sting', gain: 0.5 }],
    act(s, c) {
      const y = c.w('youre'), pt = seg(c.t, y, y + 0.2);
      beanBed(s, lerp(4, 14, pt), { twist: 22, armL: [92, -26, 0], armR: [lerp(30, 84, pt), lerp(14, -30, pt), 0], head: [4, 20, 0], lift: 0.05 * sin(seg(c.t, 0, 0.25) * PI) })
        .hold('flash', s.flashG, true, 'L').expr({ eyes: 'angry', brows: 'angry', mouth: c.t < y ? 'scream' : 'frown', look: [0.5, 0] });
      dottieAtBed(s, c).pose({ squash: 0.94, head: [-10, 0, 0], armR: [64, 12, 0], armL: [60, 10, 0] }).hold('tooth', s.tooth.dottie, true).expr({ eyes: 'wince', brows: 'worried', mouth: 'teeth' });
    } },
  // 14 ─ "Shh! Mom pays me a dollar for every tooth."
  { id: 'dollar', line: 'L10',
    shots: [{ on: 'dottie', dist: 0.82, yaw: 64, pitch: 3 }, twoShot, { on: 'dottie', dist: 0.8, yaw: 76, pitch: 8 }],
    sfx: [{ at: 'w:dollar', name: 'kaching', gain: 0.8 }],
    act(s, c) {
      const m = c.w('mom'), d = c.w('dollar'), sh = 1 - seg(c.t, m - 0.15, m + 0.05), k = smooth(seg(c.t, d - 0.3, d + 0.1));
      dottieAtBed(s, c).pose({ torso: [12 * sh + 8 * k, 0, 0], head: [4, 0, -6 * sh], armL: [lerp(120, 60, 1 - sh), -34 * sh, 0], armR: [lerp(30, 104, k), lerp(14, 4, k), 0] })
        .hold('tooth', s.tooth.dottie, true).expr({ eyes: sh > 0.5 ? 'wide' : 'half', brows: sh > 0.5 ? 'worried' : 'raised', mouth: sh > 0.5 ? 'whisper' : 'smirk', look: [k > 0.5 ? 0 : -0.5, k > 0.5 ? 0.3 : 0] });
      beanBed(s, 4, { twist: 22, armL: [70, -26, 0], head: [k > 0.5 ? 6 : 0, 22, 8 * k] }).hold('flash', s.flashG, true, 'L')
        .expr(k > 0.5 ? { eyes: 'wide', brows: 'raised', mouth: 'o', look: [0.5, 0.2] } : { eyes: 'half', brows: 'angry', mouth: 'flat', look: [0.5, 0] });
    } },
  // 15 ─ "A dollar? I have TWENTY teeth!"
  { id: 'twenty', line: 'L11',
    shots: [beanCU(-6, 0.88, 3), { on: 'bean', dist: 0.78, yaw: 10, pitch: 2, up: -0.02 }],
    sfx: [{ at: 'w:twenty', name: 'kaching' }, { at: 'w:teeth', name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      const tw = c.w('twenty'), g = seg(c.t, tw - 0.15, tw + 0.1), gasp = seg(c.t, 0, 0.2) * (1 - g);
      beanBed(s, lerp(-8 * gasp, 6, g), { twist: lerp(22, 0, g), armL: [lerp(70, 40, g), -14, 0], armR: [lerp(20 + 60 * gasp, 140, g), lerp(14, -26, g), 0], head: [lerp(10 * gasp, -4, g), lerp(22, 0, g), 6 * g], lift: 0.06 * sin(g * PI) })
        .hold('flash', s.flashG, true, 'L').expr(g > 0.5 ? { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.7 } : { eyes: 'shock', brows: 'raised', mouth: 'o', look: [0.4, 0] });
      dottieAtBed(s, c).pose({ armR: [104, 4, 0], armL: [60, 10, 0], head: [4, 0, 6] }).hold('tooth', s.tooth.dottie, true).expr({ eyes: 'happy', brows: 'raised', mouth: 'smirk' });
    } },
  // 16 ─ "We're gonna be RICH!"
  { id: 'rich', line: 'L12', pad: [0.08, 0.3],
    shots: [twoShot],
    sfx: [{ at: 'w:rich', name: 'kaching' }, { at: 'w:rich', name: 'sparkle', gain: 0.8 }],
    act(s, c) {
      const k = backOut(seg(c.t, 0.1, 0.4)), hop = Math.abs(sin(c.t * 9)) * 0.05 * seg(c.t, 0.1, 0.3);
      dottieAtBed(s, c).pose({ armR: [lerp(104, 170, k), 20, 0], armL: [lerp(60, 170, k), 20, 0], lift: hop, head: [12 * k, 0, 0] }).hold('tooth', s.tooth.dottie, true).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      beanBed(s, 6, { armL: [lerp(40, 160, k), 30, 0], armR: [lerp(140, 165, k), 30, 0], head: [10 * k, 10, 0], lift: hop * 0.6 }).hold('flash', s.flashG, true, 'L').expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.7 });
    } },
  // 17 ─ click. Ceiling light on.
  { id: 'lights', dur: 1.3, inFrame: [], music: 'stop',
    shots: [{ ...twoShot, dolly: [0.05, 0, 0.08], focus: 'dottie' }],
    sfx: [{ at: 0.3, name: 'click' }, { at: 0.32, name: 'scratch' }],
    act(s, c) {
      const on = c.t >= 0.3; s.setLights(on ? 1 : 0); const fr = on ? 1 : 0;
      dottieAtBed(s, c).pose({ armR: [170, 20, 0], armL: [170, 20, 0], head: [0, -60 * fr, 0], auto: { blink: !on, idle: on ? 0 : 1 } }).hold('tooth', s.tooth.dottie, true)
        .expr(on ? { eyes: 'shock', brows: 'raised', mouth: 'flat', look: [0.8, 0] } : { eyes: 'happy', brows: 'raised', mouth: 'grin' });
      beanBed(s, 6, { armL: [160, 30, 0], armR: [165, 30, 0], head: [0, 50 * fr, 0], auto: { blink: !on, idle: on ? 0 : 1 } }).hold('flash', s.flashG, true, 'L')
        .expr(on ? { eyes: 'shock', brows: 'raised', mouth: 'flat', look: [0.8, 0] } : { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.7 });
      if (on) momAtDoor(s);
    } },
  // 18 ─ "Rich from… WHAT?"
  { id: 'mom', line: 'L13',
    shots: [{ pos: [-1.0, 0.55, -0.55], look: [-1.8, 1.12, 1.03], fov: 40, dolly: [0.06, 0, 0.1], focus: 'mom' }, { on: 'mom', dist: 1.25, yaw: -12, pitch: -4 }],
    sfx: [{ at: 'w:what', name: 'boom' }],
    act(s, c) {
      const wh = c.w('what'), k = seg(c.t, wh - 0.05, wh + 0.15);
      s.mom.pose({ torso: [8 * k, 0, 0], head: [-6 - 6 * k, 0, 8] }).expr({ eyes: k > 0.5 ? 'wide' : 'half', brows: k > 0.5 ? 'angry' : 'skeptic', mouth: 'smirk' });
      dottieAtBed(s, c).pose({ armR: [170, 20, 0], armL: [170, 20, 0], head: [0, -60, 0], torso: [0, 0, tremble(c, 0.4)], auto: { blink: false, idle: 0 } }).hold('tooth', s.tooth.dottie, true)
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', look: [0.8, 0], sweat: true });
      beanBed(s, 6, { armL: [160, 30, 0], armR: [165, 30, 0], head: [0, 50, 0], side: tremble(c, 0.4), auto: { blink: false, idle: 0 } }).hold('flash', s.flashG, true, 'L')
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', look: [0.8, 0], sweat: true });
    } },
  // 19 ─ AAAH! RUN!
  { id: 'scream', line: 'L14', also: [{ line: 'L15', at: 0.12 }], inFrame: [], music: 'panic',
    shots: [{ pos: [0.2, 1.3, 0.3], look: [-1.3, 0.7, -1.4], fov: 44, shake: 1, focus: 'bean', dolly: [0, 0, 0] }, { pos: [0.9, 1.25, 1.6], look: 'bean', track: true, fov: 44, focus: 'bean', dolly: [0, 0, 0] }],
    sfx: [{ at: 0.95, name: 'boing', gain: 0.7 }, { at: 1.1, name: 'whoosh' }, { at: 1.35, name: 'whoosh', gain: 0.8 }],
    act(s, c) {
      const run = seg(c.t, 0.95, c.dur), step = c.t * 10 * PI, flail = sin(c.t * 30) * 25, jump = seg(c.t, 0.95, 1.35);
      const bp = along([BS, [-0.95, -1.15], [0.1, -0.35], [1.3, 0.55]], easeInOut(run));
      s.bean.at(bp.p[0], bp.p[1], run > 0 ? bp.h : BH, lerp(BY, 0, easeIn2(jump)) + sin(jump * PI) * 0.25).hold('flash', s.flashG, true, 'L')
        .pose({ legL: run > 0.02 ? sin(step) * 48 : 88, legR: run > 0.02 ? -sin(step) * 48 : 88, armL: [168 + flail, 14, 0], armR: [168 - flail, 14, 0], torso: [run * 14, 0, 0], lift: run > 0.1 ? Math.abs(sin(step)) * 0.05 : 0, auto: { blink: false } })
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      const drun = seg(c.t, 0.85, c.dur), dp = along([DM, [-0.35, -1.25], [0.85, -0.85], [1.75, 0.15]], easeInOut(drun));
      s.dottie.at(dp.p[0], dp.p[1], drun > 0 ? dp.h : DH).hold('wand', s.wandG, true, 'L').hold('tooth', s.tooth.dottie, c.t < 1.0)
        .pose({ armL: [168 - flail, 14, 0], armR: [168 + flail, 14, 0], legL: drun > 0 ? sin(step) * 48 : 0, legR: drun > 0 ? -sin(step) * 48 : 0, lift: drun > 0 ? Math.abs(sin(step)) * 0.05 : sin(sat(c.t / 0.4) * PI) * 0.18, head: [10, 0, 0], auto: { blink: false } })
        .expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      s.mom.pose({ head: [-4, 0, 0] });
    } },
  // 20 ─ button: Mom picks up the tooth, smirks, pockets it
  { id: 'outro', dur: 1.7, focus: 'mom', inFrame: ['mom'], music: 'button',
    shots: [{ on: 'mom', dist: 1.3, yaw: 6, pitch: -2, up: -0.16 }],
    sfx: [{ at: 0.35, name: 'shimmer', gain: 0.6 }, { at: 1.05, name: 'kaching', gain: 0.8 }],
    act(s, c) {
      const k = easeOut(seg(c.t, 0.05, 0.4)), pocket = seg(c.t, 0.85, 1.05), gone = c.t > 1.0;
      s.bean.hide(); s.dottie.hide();
      s.mom.at(-0.55, -0.85, 18).hold('tooth', s.tooth.mom, !gone)
        .pose({ armR: [lerp(lerp(30, 100, k), 10, pocket), lerp(-22, 18, pocket), 0], armL: [0, 10, 0], head: [gone ? 2 : -10, gone ? 0 : 0, gone ? 10 : 0], torso: [0, 0, 0] })
        .expr(gone ? { eyes: 'half', brows: 'skeptic', mouth: 'smirk', look: [0, 0] } : { eyes: 'half', brows: 'raised', mouth: 'smile', look: [0.25, 0.45] });
    } },
];
function easeIn2(t) { t = sat(t); return t * t; }
