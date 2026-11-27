// EP04 — "In this city, your shadow is alive"   (1.5x episode, cuts every 0.67–1.33 s)
// STREET set with living shadows: every character's shadow is cast by an invisible twin (set.shadowTwins), so a shadow can copy its
// owner, act on its own (s.shadow(name)) or be missing (ch.noShadow). Dottie never has a shadow — the twist at the end; rewatchers can check.
// Acts: the house front (the rules) → candy shop (the lies) → Bean's shadow walks out → golden hour in the park (the apology) → Dottie.
// All times in this file are final (on-screen) seconds.
import { seg, smooth, easeOut, easeInOut, backOut, lerp, sat } from '../../web/src/engine/util.js';

const HEAD = { type: 'box', w: 0.25, h: 0.22, d: 0.22 };
const C2 = (model, scale, skin) => ({ model, scale, skin, head: HEAD });
export const characters = {
  bean: C2('char2_bean', 1.0, '#F7C59A'), dottie: C2('char2_dottie', 1.1, '#F2B890'), pickle: C2('char2_pickle', 1.5, '#EDB48C'),
  max: C2('char2_max', 1.2, '#C98A5E'), ana: C2('char2_ana', 1.15, '#F2C6A0'), leo: C2('char2_leo', 1.25, '#8D5B3F'),
};
// a low side sun from the left: shadows fall to the right (+x), long and dark enough to act in
const DAY = { offset: [-6, 5.2, 6], color: '#fff0d4', intensity: 4.2, env: 0.38, background: 0.85, hemi: 0.3, exposure: 1.0, warmth: 0.06, fill: 0.5, fillOffset: [4, 3, 6] };
const GOLD = { offset: [-7.5, 3.0, 6.5], color: '#ffad62', intensity: 3.8, env: 0.27, background: 0.5, hemi: 0.22, exposure: 1.02, warmth: 0.17, fill: 0.45, fillOffset: [4, 3, 6] };
export const set = {
  model: 'street.glb', lighting: 'day', shadowTwins: true, sun: DAY,
  noCast: /^(Hill|Fan(Back|Side|Floor)|ShopGlass|GumGlobe|HWinGlass|ShopLight|LampHead|Road|Grass|Sidewalk|Curb|Far|Shard|ShopCamLed)/,
  bounds: { x: [-14, 40], y: [0.12, 6], z: [-6.2, 6.5] },
  lights: [{ color: '#ffe2b8', intensity: 34, pos: [8.4, 2.7, -4.3], distance: 9 }, { color: '#ffd9a8', intensity: 14, pos: [9.6, 2.2, -5.2], distance: 6 }],
  materials(m) { for (const [k, o] of [['shopglass', 0.16], ['gumglobe', 0.38]]) if (m[k]) { m[k].transparent = true; m[k].opacity = o; m[k].depthWrite = false; } },
};

const sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs;
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / PI;
const show = ch => { ch.group.visible = true; return ch; };
const idle = [0, 8, 0];
const hex = (a, b, t) => '#' + [0, 2, 4].map(i => Math.round(lerp(parseInt(a.substr(1 + i, 2), 16), parseInt(b.substr(1 + i, 2), 16), t)).toString(16).padStart(2, '0')).join('');
const skyMix = t => Object.fromEntries(Object.keys(DAY).map(k => [k, k === 'color' ? hex(DAY.color, GOLD.color, t) : Array.isArray(DAY[k]) ? DAY[k].map((v, i) => lerp(v, GOLD[k][i], t)) : lerp(DAY[k], GOLD[k], t)]));
// walk / run cycle on a straight line
const walk = (ch, a, b, u, t, rate = 8, swing = 34) => { const mv = u > 0.001 && u < 0.999 ? 1 : 0, st = t * rate * PI;
  return show(ch).at(lerp(a[0], b[0], sat(u)), lerp(a[1], b[1], sat(u)), faceTo(a, b)).pose({ legL: sin(st) * swing * mv, legR: -sin(st) * swing * mv, armL: [-sin(st) * swing * mv, 8, 0], armR: [sin(st) * swing * mv, 8, 0], lift: abs(sin(st)) * 0.03 * mv }); };
// a shadow twin copying its owner's spot (so the shadow stays attached at the feet) but with its own pose
const own = (s, n, facing) => { const o = s.chars[n], t = s.shadow(n); t.group.visible = true; t.group.position.copy(o.group.position); t.group.rotation.y = facing == null ? o.group.rotation.y : facing * PI / 180; return t; };

// ---- marks
const HB = [0.15, 0.1];                                                     // house front: Bean
const SB = [8.35, -0.45], SP = [9.0, -1.75], SD = [7.55, -0.2];            // shop front: Bean, Mr. Pickle at the door, Dottie
const PB = [-4.55, -0.15], PM = [-5.45, 0.0];                                // park sidewalk: Bean + Max
const KIDS = [[-8.6, 0.2], [-7.9, 0.45], [-7.2, 0.25]];                     // golden hour: Max, Ana, Leo
const BENCH = [-6.3, -1.25], FB = [-5.45, -0.55], FD = [-4.75, 0.3];         // the bench; Bean in front of it; Dottie (on his right, in front)
// looking down from front-right at a character and the shadow stretching back-right of them; k > 1 for the long golden-hour shadows
const ground = (x, z, k = 1) => ({ pos: [x + 0.35 * k, 2.2 + 0.3 * k, z + 1.3 + 0.3 * k], look: [x + 0.35 * k, 0.15, z - 0.35 * k], fov: 54 + 4 * (k - 1), focus: [x + 0.2, 0.3, z - 0.1] });
const houseWide = { pos: [0.75, 1.75, 2.9], look: [0.75, 0.4, -0.1], fov: 50, focus: 'bean' };
const shopTwo = { pos: [8.75, 1.15, 2.5], look: [8.75, 0.65, -1.0], fov: 44, focus: 'bean' };
const shopWide = { pos: [9.3, 1.9, 2.9], look: [9.1, 0.35, -0.7], fov: 54, focus: 'bean' };
const parkTwo = { pos: [-5.0, 1.1, 2.7], look: [-5.0, 0.68, -0.1], fov: 50, focus: 'bean' };
const playWide = { pos: [-5.7, 3.1, 3.4], look: [-6.4, 0.0, -0.45], fov: 60, focus: [-6.6, 0.3, -0.1] };
const benchWide = { pos: [-4.3, 1.35, 1.9], look: [-5.6, 0.35, -1.0], fov: 50, focus: [-6.0, 0.4, -1.1] };
const benchGround = { pos: [-4.9, 1.9, 0.9], look: [-5.2, 0.05, -1.3], fov: 52, focus: [-5.2, 0.1, -1.3] };
const reveal = { pos: [-4.4, 2.1, 2.5], look: [-4.75, 0.25, -0.5], fov: 54, focus: 'dottie' };
const streetWide = { pos: [2.2, 1.45, 3.4], look: 'bean', track: true, fov: 46, focus: 'bean' };

export function setup(s) {
  s.label('ShopSignFace', "MR. PICKLE'S CANDY", { w: 4.4, h: 0.62, color: '#FFF4D0', font: 'bold 168px "DejaVu Sans", sans-serif', px: 2048, emissive: 0.25 });
  s.label('MailboxFace', 'BEAN', { w: 0.38, h: 0.14, color: '#fff', font: 'bold 150px "DejaVu Sans", sans-serif', px: 512 });
  const grip = (name, pos, rot = [0, 0, 0], sc = 1) => { const o = s.clone(name); o.position.set(...pos); o.rotation.set(...rot); o.scale.setScalar(sc); const r = s.rest.get(o); r.p.copy(o.position); r.q.copy(o.quaternion); r.s.copy(o.scale); r.v = false; o.visible = false; return o; };
  s.items = { pickleP: grip('PickleProp', [0, -0.3, 0.07], [-1.2, 0, 0], 1.3), pickleB: grip('PickleProp', [0, -0.3, 0.07], [-1.2, 0, 0], 1.1) };
  // an armful of pickle candy: a little pile held between both hands (parented to the right hand, pushed toward the body's middle)
  const pile = s.items.pile = grip('PickleProp', [0.13, -0.3, 0.12], [0, 0, 0], 1.0);
  for (let i = 0; i < 7; i++) { const p = s.obj('PickleProp').clone(true); p.position.set(((i % 4) - 1.5) * 0.06, Math.floor(i / 4) * 0.05, (i % 2) * 0.03); p.rotation.set(1.57 + (i % 3) * 0.3, i * 0.7, 0.2 * i); pile.add(p); }
}

const ORDER = ['hook', 'copies', 'feel', 'rule', 'liealot', 'offer', 'yum', 'gag', 'throwup', 'dancing', 'uhhuh', 'choc', 'never', 'licking', 'owe', 'goaway', 'leave', 'hedid', 'nosnitch', 'spree', 'fly', 'cool', 'teach', 'secret', 'best', 'all',
  'sundown', 'play', 'exceptmine', 'notfun', 'looked', 'look2', 'look3', 'found', 'sorry', 'promise', 'return', 'cameback', 'proud', 'noticed', 'noshadow', 'stare', 'where', 'whatshadow', 'button'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
export function base(s, c) {
  const i = I[c.id];
  for (const n of ['pickle', 'max', 'ana', 'leo', 'dottie']) s[n].hide();
  s.obj('LemonStand').visible = false;
  s.dottie.noShadow = true;                                                                   // the twist: she never had one
  if ((i > I.leave || (i === I.leave && c.u > 0.82)) && i < I.return) s.bean.noShadow = true;    // Bean's shadow is gone from the walk-out to the apology
  if (i >= I.sundown) s.sky(skyMix(i === I.sundown ? smooth(c.u * 1.2) : 1));
}
const atHouse = s => s.bean.at(...HB, 0).pose({ armL: idle, armR: idle });
const atShop = (s, b = faceTo(SB, SP) + 40) => { s.bean.at(...SB, b).pose({ armL: idle, armR: idle }); show(s.pickle).at(...SP, faceTo(SP, SB) - 10).pose({ armL: idle, armR: idle, head: [-12, 0, 0] }); };
const dottieIn = (s, c, k = 1) => show(s.dottie).at(lerp(SD[0] - 1.6, SD[0], k), SD[1], faceTo(SD, SB) + 20).pose({ armL: idle, armR: idle });
const atPark = s => { s.bean.at(...PB, faceTo(PB, PM) + 35).pose({ armL: idle, armR: idle }); show(s.max).at(...PM, faceTo(PM, PB) - 35).pose({ armL: idle, armR: idle, head: [-8, 0, 0] }); };
const atBench = s => s.bean.at(...FB, faceTo(FB, BENCH)).pose({ armL: idle, armR: idle });
const benchShadow = (s, t) => { const sh = s.shadow('bean'); sh.group.visible = true;              // the lonely shadow sitting on the bench (its owner is elsewhere)
  return sh.at(BENCH[0] + 0.15, BENCH[1] + 0.12, 0, 0.165).sit().pose({ torso: [16, 0, 0], head: [-26, 0, 0], armL: [40, 4, 0], armR: [40, 4, 0], legL: 88 + sin(t * 3) * 6, legR: 88 - sin(t * 3) * 6 }); };

export const beats = [
  // ═════════ ACT 1 — the rules (house front)
  { id: 'hook', line: 'L01',
    shots: [ground(...HB), { on: 'bean', dist: 1.0, yaw: 8, pitch: 4 }, houseWide],
    sfx: [{ at: 0.05, name: 'sting', gain: 0.4 }, { at: 'w:alive', name: 'boing', gain: 0.5 }],
    act(s, c) {
      atHouse(s); const look = seg(c.t, c.w('alive') - 0.3, c.w('alive'));
      s.bean.pose({ head: [-22 * look, -18 * look, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile', look: [0.4 * look, 0.5 * look] });
      own(s, 'bean').pose({ armL: idle, armR: [160 + sin(c.t * 10) * 8, 28 + sin(c.t * 9) * 26, 0], head: [0, 0, sin(c.t * 9) * 10] });      // the shadow waves
    } },
  { id: 'copies', line: 'L02',
    shots: [houseWide, { on: 'bean', dist: 1.15, yaw: -14, pitch: 6 }, ground(...HB)],
    sfx: [{ at: 'w:well', name: 'record', sfx: 'scratch', gain: 0.6 }, { at: 'w:almost', name: 'boing', gain: 0.45 }],
    act(s, c) {
      atHouse(s); const w = c.w('well'), up = seg(c.t, 0.15, 0.4) * (1 - seg(c.t, w - 0.1, w + 0.05));
      s.bean.pose({ armR: [150 * up, 20, 0], armL: [150 * up, 20, 0], lift: sin(sat(c.t / 0.5) * PI) * 0.05 }).expr(c.t > w ? { eyes: 'half', brows: 'skeptic', mouth: 'flat', look: [0.6, 0.5] } : { eyes: 'happy', brows: 'raised', mouth: 'grin' });
      if (c.t > w) { const d = c.t * 9; own(s, 'bean').pose({ armL: [150 + sin(d) * 25, 40, 0], armR: [150 - sin(d) * 25, 40, 0], torso: [0, sin(d * 0.5) * 25, sin(d) * 12], legL: sin(d) * 25, legR: -sin(d) * 25, lift: abs(sin(d)) * 0.05 }); }
    } },
  { id: 'feel', line: 'L02b',
    shots: [{ on: 'bean', dist: 0.95, yaw: 10, pitch: 4 }, ground(...HB), ground(...HB)],
    sfx: [{ at: 'w:shakes', name: 'rumble', gain: 0.5 }, { at: 'w:dances', name: 'boing', gain: 0.5 }],
    act(s, c) {
      atHouse(s); const sc = c.t > c.w('scared') && c.t < c.w('happy'), hp = c.t >= c.w('happy');
      s.bean.pose({ armL: sc ? [70, -30, 0] : idle, armR: sc ? [70, -30, 0] : idle, torso: [0, 0, sc ? sin(c.t * 50) * 2 : 0] })
        .expr(sc ? { eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true } : hp ? { eyes: 'happy', brows: 'raised', mouth: 'grin' } : { eyes: 'open', brows: 'raised', mouth: 'smile' });
      const sh = own(s, 'bean'), d = c.t * 10;
      if (sc) sh.pose({ armL: [130, 20, 0], armR: [130, 20, 0], torso: [-8, 0, sin(c.t * 60) * 6], head: [0, sin(c.t * 70) * 10, 0], legL: sin(c.t * 60) * 6 });
      else if (hp) sh.pose({ armL: [150 + sin(d) * 25, 40, 0], armR: [150 - sin(d) * 25, 40, 0], torso: [0, 0, sin(d) * 12], legL: sin(d) * 25, legR: -sin(d) * 25, lift: abs(sin(d)) * 0.05 });
      else sh.pose({ armL: idle, armR: idle });
    } },
  { id: 'rule', line: 'L03',
    shots: [{ on: 'bean', dist: 0.85, yaw: -6, pitch: 2 }, ground(...HB), { on: 'bean', dist: 0.7, yaw: 12, pitch: 1 }],
    sfx: [{ at: 'w:never', name: 'thud', gain: 0.7 }],
    act(s, c) {
      atHouse(s); const n = seg(c.t, c.w('never') - 0.1, c.w('never') + 0.1);
      s.bean.pose({ armR: [60 + 60 * n, -10, 0], head: [0, 0, 0] }).expr({ eyes: 'open', brows: n > 0.5 ? 'angry' : 'neutral', mouth: n > 0.5 ? 'teeth' : 'flat' });
      own(s, 'bean').pose({ armL: [80, -42, 0], armR: [80, -42, 0], head: [sin(c.t * 7) * 14 * n, 0, 0] });                     // arms crossed, nodding
    } },
  { id: 'liealot', line: 'L04',
    shots: [{ on: 'bean', dist: 0.8, yaw: 16, pitch: 3 }, houseWide],
    sfx: [{ at: 'w:lie', name: 'wah', gain: 0.6 }],
    act(s, c) {
      atHouse(s); const l = seg(c.t, c.w('because') - 0.1, c.w('because') + 0.1);
      s.bean.pose({ armR: [70 * l, -20, 0], head: [0, 0, 10 * l], torso: [0, 0, 4 * l] }).expr(l > 0.5 ? { eyes: 'happy', brows: 'worried', mouth: 'teeth', sweat: true, blush: 0.5 } : { eyes: 'half', brows: 'sad', mouth: 'frown' });
      own(s, 'bean').pose({ armR: [150, -40, 0], armL: idle, head: [-25, 0, 0], torso: [10, 0, 0] });                            // facepalm
    } },
  // ═════════ the lies (candy shop)
  { id: 'offer', line: 'L05',
    shots: [{ on: 'pickle', dist: 1.0, yaw: -12, pitch: -3 }, shopTwo, { on: 'pickle', dist: 1.0, yaw: 10, pitch: -4 }],
    sfx: [{ at: 0.02, name: 'ding', gain: 0.5 }, { at: 'w:pickle', name: 'boing', gain: 0.45 }],
    act(s, c) {
      atShop(s); const k = easeOut(seg(c.t, 0.1, 0.5));
      s.pickle.hold('p', s.items.pickleP, true).pose({ armR: [80 * k, 6, 0], torso: [8 * k, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      s.bean.pose({ head: [18, 0, 0] }).expr({ eyes: c.t > c.w('pickle') ? 'wide' : 'open', brows: c.t > c.w('pickle') ? 'worried' : 'raised', mouth: c.t > c.w('pickle') ? 'flat' : 'smile' });
    } },
  { id: 'yum', line: 'L06',
    shots: [{ on: 'bean', dist: 0.85, yaw: -10, pitch: 3 }, shopWide, { on: 'bean', dist: 0.7, yaw: 14, pitch: 2 }],
    sfx: [{ at: 0.03, name: 'chomp' }, { at: 'w:delicious', name: 'gurgle', gain: 0.6 }],
    act(s, c) {
      atShop(s); s.pickle.expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      const th = seg(c.t, c.w('wow') - 0.1, c.w('wow') + 0.1);
      s.bean.hold('p', s.items.pickleB, c.t < 0.35).pose({ armR: [c.t < 0.35 ? 120 : 110 * th, c.t < 0.35 ? -20 : 10, 0], head: [16, 0, 0] })
        .expr({ eyes: 'happy', brows: 'raised', mouth: c.t < 0.35 ? 'o' : 'grin', blush: 0.4, sweat: c.t > 0.8 });
      const g = sin(c.t * 34) * 4;                                                                                               // the shadow gags
      own(s, 'bean').pose({ torso: [48, 0, g], head: [-30, 0, 0], armL: [55, -24, 0], armR: [140, -30, 0], legL: -8, legR: 8 });
    } },
  { id: 'gag', dur: 1.0, focus: [9.0, 0.2, -0.9],
    shots: [{ ...ground(...SB), dolly: [0, -0.15, -0.1] }],
    sfx: [{ at: 0.1, name: 'gurgle', gain: 0.7 }, { at: 0.55, name: 'gurgle', gain: 0.5 }],
    act(s, c) {
      atShop(s); s.pickle.expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' }); s.bean.pose({ armR: [110, 10, 0], head: [16, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      const h = abs(sin(c.t * 6)); own(s, 'bean').pose({ torso: [35 + 30 * h, 0, sin(c.t * 34) * 4], head: [-40 * h, 0, 0], armL: [55, -24, 0], armR: [60 + 80 * h, -30, 0], lift: 0.02 * h });
    } },
  { id: 'throwup', line: 'L07',
    shots: [ground(...SB), { on: 'pickle', dist: 0.95, yaw: -16, pitch: -2 }],
    sfx: [{ at: 0.05, name: 'gurgle', gain: 0.55 }],
    act(s, c) {
      atShop(s); s.pickle.pose({ head: [-38, 12, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'flat', look: [0.4, 0.8] });
      s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'grin', sweat: true });
      own(s, 'bean').pose({ torso: [55 + sin(c.t * 9) * 8, 0, sin(c.t * 30) * 4], head: [-35, 0, 0], armL: [50, -30, 0], armR: [60, -30, 0] });
    } },
  { id: 'dancing', line: 'L08',
    shots: [shopWide, { on: 'bean', dist: 0.85, yaw: 8, pitch: 3 }],
    sfx: [{ at: 'w:dancing', name: 'boing', gain: 0.55 }],
    act(s, c) {
      atShop(s); s.pickle.pose({ head: [-20, 0, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      const d = seg(c.t, c.w('dancing') - 0.1, c.w('dancing')), st = c.t * 12;
      s.bean.pose({ armL: [150 * d + sin(st) * 20 * d, 30, 0], armR: [150 * d - sin(st) * 20 * d, 30, 0], torso: [0, 0, sin(st) * 10 * d], legL: sin(st) * 20 * d, lift: abs(sin(st)) * 0.04 * d })
        .expr({ eyes: 'happy', brows: 'worried', mouth: 'teeth', sweat: true });
      own(s, 'bean').pose({ torso: [52, 0, sin(c.t * 30) * 4], head: [-32, 0, 0], armL: [50, -30, 0], armR: [140, -30, 0] });     // …still gagging
    } },
  { id: 'uhhuh', line: 'L08b', min: 0.8,
    shots: [{ on: 'pickle', dist: 0.9, yaw: 14, pitch: -3 }],
    act(s, c) {
      atShop(s); s.pickle.pose({ armL: [48, -24, 0], armR: [48, -24, 0], head: [-14, 0, 8] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      s.bean.pose({ armL: [150, 30, 0], armR: [150, 30, 0] }).expr({ eyes: 'happy', brows: 'worried', mouth: 'teeth', sweat: true });
      own(s, 'bean').pose({ torso: [52, 0, sin(c.t * 30) * 4], head: [-32, 0, 0], armL: [50, -30, 0], armR: [140, -30, 0] });
    } },
  { id: 'choc', line: 'L09',
    shots: [{ on: 'dottie', dist: 1.1, yaw: 10, pitch: 2, anchor: 0.6 }, shopTwo, { on: 'dottie', dist: 0.78, yaw: -8, pitch: 1 }],
    sfx: [{ at: 0.02, name: 'step', gain: 0.5 }, { at: 0.2, name: 'step', gain: 0.5 }, { at: 'w:chocolate', name: 'sting', gain: 0.35 }],
    act(s, c) {
      atShop(s, faceTo(SB, SD)); s.pickle.hide(); dottieIn(s, c, easeOut(seg(c.t, 0, 0.35)));
      s.dottie.pose({ armL: [48, -24, 0], armR: [48, -24, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' });
      s.bean.expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  { id: 'never', line: 'L10',
    shots: [{ on: 'bean', dist: 0.85, yaw: 45, pitch: 3 }, ground(...SB), { on: 'bean', dist: 0.72, yaw: 60, pitch: 3 }],
    sfx: [{ at: 'w:never', name: 'chomp', gain: 0.5 }],
    act(s, c) {
      atShop(s, faceTo(SB, SD)); s.pickle.hide(); dottieIn(s, c); s.dottie.pose({ armL: [48, -24, 0], armR: [48, -24, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' });
      s.bean.pose({ armL: [110, 30, 0], armR: [110, 30, 0], head: [6, 0, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile', blush: 0.5 });
      own(s, 'bean').pose({ armR: [128 + sin(c.t * 15) * 16, -26, 0], armL: [52, -26 + sin(c.t * 6) * 10, 0], head: [6, 0, 0] });     // the shadow mimes stuffing its face
    } },
  { id: 'licking', line: 'L11',
    shots: [{ on: 'dottie', dist: 0.9, yaw: 14, pitch: 4 }, ground(...SB), { on: 'dottie', dist: 0.75, yaw: -6, pitch: 3 }],
    sfx: [{ at: 'w:licking', name: 'squeak', gain: 0.6 }],
    act(s, c) {
      atShop(s, faceTo(SB, SD)); s.pickle.hide(); dottieIn(s, c); const p = seg(c.t, c.w('shadow') - 0.1, c.w('shadow') + 0.1);
      s.dottie.pose({ armR: [50 * p, 0, 0], armL: [48, -24, 0], head: [-14 * p, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'teeth' });
      s.bean.pose({ head: [-26, 20, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true, look: [0.5, 0.8] });
      own(s, 'bean').pose({ armR: [152, -32, sin(c.t * 10) * 20], armL: idle, head: [-10, 0, 14] });
    } },
  { id: 'owe', line: 'L11b',
    shots: [{ on: 'dottie', dist: 0.85, yaw: 4, pitch: 2, shake: 0.4 }, shopTwo],
    sfx: [{ at: 'w:knew', name: 'thud', gain: 0.6 }, { at: -0.5, name: 'step', gain: 0.5 }, { at: -0.3, name: 'step', gain: 0.5 }],
    act(s, c) {
      atShop(s, faceTo(SB, SD)); s.pickle.hide(); const out = seg(c.t, c.dur - 0.7, c.dur);
      if (out <= 0) dottieIn(s, c).pose({ armR: [90, 0, 0], armL: [48, -24, 0], lift: abs(sin(c.t * 8)) * 0.02 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      else walk(s.dottie, SD, [SD[0] - 2.2, SD[1] + 0.2], out, c.t, 9, 36).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' });
      s.bean.pose({ head: [0, 0, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'wobble', sweat: true });
      own(s, 'bean').pose({ armL: [150, 20, 0], armR: [150, 20, 0], head: [-20, 0, 0] });                                         // the shadow: guilty, hands up
    } },
  { id: 'goaway', line: 'L12',
    shots: [{ on: 'bean', dist: 0.85, yaw: 30, pitch: 3, shake: 0.4 }, shopWide, { on: 'bean', dist: 0.7, yaw: 50, pitch: 2, shake: 0.5 }],
    sfx: [{ at: 'w:away', name: 'thud' }],
    act(s, c) {
      s.bean.at(...SB, 90).pose({ armL: idle, armR: [90, 0, 0], head: [-26, 0, 0], torso: [8, 0, 0], lift: abs(sin(c.t * 9)) * 0.02 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      own(s, 'bean', 90).pose({ torso: [-14, 0, 0], armL: [130, 30, 0], armR: [130, 30, 0], head: [10, 0, 0] });                  // the shadow cowers
    } },
  { id: 'leave', dur: 2.3, focus: [9.6, 0.1, -0.6], music: 'sad',
    shots: [{ ...ground(...SB, 1.3), dolly: [0.4, 0, 0] }, { pos: [8.2, 1.2, 1.6], look: 'bean', fov: 42, focus: 'bean' }],
    sfx: [{ at: 0.15, name: 'slide', gain: 0.5 }],
    act(s, c) {
      s.bean.at(...SB, 90).pose({ armL: idle, armR: [90 * (1 - seg(c.t, 0.2, 0.6)), 0, 0], head: [-26, 0, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'flat', look: [0.6, 0.7] });
      const u = seg(c.t, 0.4, 2.3), sh = walk(s.shadow('bean'), SB, [SB[0] + 2.4, SB[1] + 0.25], u, c.t, 5, 24);
      sh.pose({ head: [-24, 0, 0], torso: [10, 0, 0] }); if (c.u > 0.82) sh.hide();
    } },
  { id: 'hedid', line: 'L13',
    shots: [ground(...SB), { on: 'bean', dist: 0.8, yaw: -10, pitch: 6 }],
    act(s, c) { s.bean.at(...SB, 60).pose({ armL: idle, armR: idle, head: [-28, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0.5, 0.8] }); } },
  // ═════════ ACT 2 — no shadow, no snitch
  { id: 'nosnitch', line: 'L14', music: 'bright',
    shots: [{ on: 'bean', dist: 0.9, yaw: 4, pitch: 4 }, ground(...SB), { on: 'bean', dist: 0.75, yaw: -20, pitch: 6 }],
    sfx: [{ at: 'w:snitch', name: 'ding' }, { at: 'w:anything', name: 'sparkle' }],
    act(s, c) {
      const j = sin(sat((c.t - c.w('anything')) / 0.4) * PI);
      s.bean.at(...SB, 0).pose({ armL: [150 * (j > 0 ? 1 : 0.2), 30, 0], armR: [150 * (j > 0 ? 1 : 0.2), 30, 0], lift: j * 0.12 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
    } },
  { id: 'spree', line: 'L14b',
    shots: [{ on: 'bean', dist: 0.8, yaw: -18, pitch: 3 }],
    sfx: [{ at: 'w:spree', name: 'sparkle', gain: 0.5 }],
    act(s, c) {
      s.bean.at(...SB, 10).pose({ armL: [80, -38 + sin(c.t * 14) * 8, 0], armR: [80, -38 - sin(c.t * 14) * 8, 0], head: [-6, 0, 8] }).expr({ eyes: 'half', brows: 'angry', mouth: 'smirk' });
    } },
  { id: 'fly', line: 'L15',
    shots: [{ on: 'bean', dist: 0.9, yaw: -16, pitch: 4 }, parkTwo, { on: 'bean', dist: 0.75, yaw: 8, pitch: 4 }],
    sfx: [{ at: 'w:fly', name: 'whoosh', gain: 0.5 }],
    act(s, c) {
      atPark(s); const f = seg(c.t, c.w('i', 1) - 0.1, c.w('i', 1) + 0.1);
      s.bean.pose({ armL: [80 * (1 - f) + 70 * f, f > 0.5 ? -40 : 60, 0], armR: [80 * (1 - f) + 70 * f, f > 0.5 ? -40 : 60, 0], head: [10, 0, f * 8] }).expr({ eyes: f > 0.5 ? 'half' : 'open', brows: 'raised', mouth: 'smirk' });
      s.max.expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  { id: 'cool', line: 'L16',
    shots: [{ on: 'max', dist: 0.95, yaw: 12, pitch: 2 }, parkTwo],
    sfx: [{ at: 0.05, name: 'sparkle', gain: 0.6 }],
    act(s, c) {
      atPark(s); s.max.pose({ armL: [150, 30, 0], armR: [150, 30, 0], lift: abs(sin(c.t * 8)) * 0.05 }).expr({ eyes: 'shock', brows: 'raised', mouth: 'grin' });
      s.bean.pose({ armL: [80, -40, 0], armR: [80, -40, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
    } },
  { id: 'teach', line: 'L16b',
    shots: [{ on: 'max', dist: 0.9, yaw: -10, pitch: 2 }],
    act(s, c) {
      atPark(s); s.max.pose({ armL: [70, -20, 0], armR: [70, -20, 0], lift: abs(sin(c.t * 8)) * 0.03 }).expr({ eyes: 'wide', brows: 'raised', mouth: 'grin' });
      s.bean.pose({ armL: [80, -40, 0], armR: [80, -40, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
    } },
  { id: 'secret', line: 'L16c',
    shots: [{ on: 'bean', dist: 0.8, yaw: 14, pitch: 3 }, parkTwo],
    sfx: [{ at: 'w:secret', name: 'pop', gain: 0.5 }],
    act(s, c) {
      atPark(s); s.max.expr({ eyes: 'sad', brows: 'sad', mouth: 'frown' });
      s.bean.pose({ armL: [80, -40, 0], armR: [80, -40, 0], head: [10, 0, -8] }).expr({ eyes: c.t > c.w('secret') ? 'closed' : 'half', brows: 'raised', mouth: 'smirk' });
    } },
  { id: 'best', line: 'L17',
    shots: [{ on: 'bean', dist: 0.9, yaw: -14, pitch: 3 }, shopTwo, { on: 'pickle', dist: 0.95, yaw: -10, pitch: -2, focus: 'pickle' }],
    sfx: [{ at: 'w:best', name: 'ding', gain: 0.5 }],
    act(s, c) {
      atShop(s); s.bean.pose({ armR: [100, 10, 0], head: [16, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.3 });
      s.pickle.expr(c.t > c.w('best') ? { eyes: 'wide', brows: 'raised', mouth: 'o', blush: 0.6 } : { eyes: 'open', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'all', line: 'L18',
    shots: [{ on: 'pickle', dist: 1.0, yaw: -8, pitch: -3 }, shopWide, { on: 'bean', dist: 0.8, yaw: 10, pitch: 4 }],
    sfx: [{ at: 'w:all', name: 'pop' }, { at: 'w:of', name: 'thud', gain: 0.5 }],
    act(s, c) {
      atShop(s); const a = seg(c.t, c.w('all') - 0.05, c.w('all') + 0.15);
      s.pickle.pose({ armL: [60 * (1 - a) + 90 * a, -10, 0], armR: [60 * (1 - a) + 90 * a, -10, 0], torso: [10 * a, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.6 });
      s.bean.hold('pile', s.items.pile, a > 0.5).pose({ armL: [76 * a, -14 * a + 8 * (1 - a), 0], armR: [76 * a, -14 * a + 8 * (1 - a), 0], head: [16, 0, 0], squash: 1 - 0.04 * a })
        .expr(a > 0.5 ? { eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true } : { eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  // ═════════ ACT 3 — golden hour
  { id: 'sundown', line: 'L19', music: 'sad',
    shots: [streetWide, { on: 'bean', dist: 1.0, yaw: 20, pitch: 4, track: true }, { ...streetWide, pos: [0.4, 1.2, 2.6] }],
    act(s, c) {
      const u = c.u, p = [lerp(3.4, 0.6, u), 0.15];
      walk(s.bean, [3.4, 0.15], [0.6, 0.15], u, c.t, 5, 18).hold('pile', s.items.pile, true).pose({ armL: [70, -14, 0], armR: [70, -14, 0], head: [-14, 0, 0] })
        .expr({ eyes: 'sad', brows: 'worried', mouth: 'frown' });
      void p;
    } },
  { id: 'play', line: 'L20',
    shots: [playWide, { on: 'ana', dist: 1.1, yaw: 10, pitch: 6, focus: 'ana' }, { ...playWide, pos: [-4.2, 2.2, 2.6] }],
    sfx: [{ at: 0.1, name: 'sparkle', gain: 0.5 }, { at: 'w:play', name: 'plink', note: 2 }],
    act(s, c) {
      ['max', 'ana', 'leo'].forEach((n, i) => {
        const [x, z] = KIDS[i]; show(s[n]).at(x, z, 0).pose({ armL: idle, armR: [40 + 20 * sin(c.T * 3 + i), 10, 0], lift: abs(sin(c.T * 6 + i)) * 0.02 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
        const a = c.T * 2.6 + i * 2.1, r = 0.62, cx = -6.9, cz = 0.4;                                                      // their shadows play tag in a circle on the sidewalk
        const sh = s.shadow(n); sh.group.visible = true; const st = c.T * 9 + i;
        sh.at(cx + cos(a) * r * 1.5, cz + sin(a) * r, (-(a * 180 / PI)) + 180).pose({ legL: sin(st) * 40, legR: -sin(st) * 40, armL: [-sin(st) * 40, 8, 0], armR: [sin(st) * 40, 8, 0], torso: [14, 0, 0], lift: abs(sin(st)) * 0.04 });
      });
    } },
  { id: 'exceptmine', line: 'L21',
    shots: [{ on: 'bean', dist: 0.85, yaw: -12, pitch: 4 }, { ...playWide, pos: [-3.6, 2.4, 2.8], look: [-4.3, 0.15, -0.2], focus: 'bean' }],
    sfx: [{ at: 0.1, name: 'wah', gain: 0.45 }],
    act(s, c) {
      s.bean.at(-4.35, 0.55, -40).pose({ armL: idle, armR: idle, head: [-12, 0, 0] }).expr({ eyes: 'sad', brows: 'sad', mouth: 'frown', look: [-0.4, 0.4] });
      ['max', 'ana', 'leo'].forEach((n, i) => { const [x, z] = KIDS[i]; show(s[n]).at(x, z, 0).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
        const a = c.T * 2.6 + i * 2.1, sh = s.shadow(n), st = c.T * 9 + i; sh.group.visible = true;
        sh.at(-6.9 + cos(a) * 0.93, 0.4 + sin(a) * 0.62, (-(a * 180 / PI)) + 180).pose({ legL: sin(st) * 40, legR: -sin(st) * 40, armL: [-sin(st) * 40, 8, 0], armR: [sin(st) * 40, 8, 0], torso: [14, 0, 0] }); });
    } },
  { id: 'notfun', line: 'L21b',
    shots: [{ on: 'bean', dist: 0.8, yaw: 20, pitch: 3 }, ground(-4.35, 0.55, 1.4), { on: 'bean', dist: 0.65, yaw: -8, pitch: 2 }],
    act(s, c) {
      s.bean.at(-4.35, 0.55, -30).pose({ armL: idle, armR: idle, head: [-18, 0, 0], torso: [6, 0, 0] }).expr({ eyes: 'sad', brows: 'sad', mouth: 'frown', look: [0, 0.6] });
      ['max', 'ana', 'leo'].forEach((n, i) => { const [x, z] = KIDS[i]; show(s[n]).at(x, z, 0).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
        const a = c.T * 2.6 + i * 2.1, sh = s.shadow(n), st = c.T * 9 + i; sh.group.visible = true;
        sh.at(-6.9 + cos(a) * 0.93, 0.4 + sin(a) * 0.62, (-(a * 180 / PI)) + 180).pose({ legL: sin(st) * 40, legR: -sin(st) * 40, armL: [-sin(st) * 40, 8, 0], armR: [sin(st) * 40, 8, 0], torso: [14, 0, 0] }); });
    } },
  { id: 'looked', line: 'L22',
    shots: [{ pos: [12.6, 1.0, 1.4], look: 'bean', fov: 44, focus: 'bean' }],
    sfx: [{ at: 0.05, name: 'whoosh', gain: 0.4 }],
    act(s, c) { s.bean.at(11.9, -0.45, -130).pose({ armL: [60, 10, 0], armR: idle, torso: [20, 0, 0], head: [-10, 20, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', look: [-0.6, 0.2] }); } },
  { id: 'look2', dur: 0.8,
    shots: [{ pos: [3.0, 1.15, 1.0], look: 'bean', fov: 46, focus: 'bean' }],
    sfx: [{ at: 0.05, name: 'whoosh', gain: 0.4 }, { at: 0.3, name: 'creak', gain: 0.5 }],
    act(s, c) { s.bean.at(2.3, -0.7, 180).pose({ armR: [130, 0, 0], armL: idle, head: [6, 0, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'o' }); s.obj('MailFlag') && (s.obj('MailFlag').rotation.z = 1.2 * seg(c.t, 0.2, 0.4)); } },
  { id: 'look3', dur: 0.8,
    shots: [{ pos: [-7.4, 1.1, 1.0], look: 'bean', fov: 46, focus: 'bean' }],
    sfx: [{ at: 0.05, name: 'whoosh', gain: 0.4 }, { at: 0.35, name: 'knock', gain: 0.5 }],
    act(s, c) { s.bean.at(-8.25, -0.55, 200).pose({ armL: [100, 10, 0], armR: [100, -10, 0], torso: [24, 0, 0], head: [-14, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown' }); } },
  { id: 'found', line: 'L23', music: 'tender',
    shots: [benchWide, benchGround, { on: 'bean', dist: 0.9, yaw: 30, pitch: 4 }],
    sfx: [{ at: 'w:alone', name: 'plink', note: 0 }],
    act(s, c) {
      const u = seg(c.t, 0, c.w('at') + 0.2); walk(s.bean, [-3.6, 0.2], FB, u, c.t, 5, 18).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' }); if (u >= 1) s.bean.at(...FB, faceTo(FB, BENCH));
      benchShadow(s, c.T);
    } },
  { id: 'sorry', line: 'L24',
    shots: [{ on: 'bean', dist: 0.85, yaw: 55, pitch: 2 }, benchGround, { on: 'bean', dist: 0.7, yaw: -60, pitch: 1 }],
    act(s, c) {
      atBench(s); s.bean.pose({ torso: [14, 0, 0], head: [-10, 0, 0], armL: [30, 0, 0], armR: [30, 0, 0] }).expr({ eyes: 'sad', brows: 'sad', mouth: 'frown' });
      benchShadow(s, c.T).pose({ head: [-26 + 22 * seg(c.t, c.w('truth') - 0.2, c.w('truth') + 0.2), 30 * seg(c.t, c.w('truth') - 0.2, c.w('truth') + 0.2), 0] });
    } },
  { id: 'promise', line: 'L25',
    shots: [{ on: 'bean', dist: 0.8, yaw: -62, pitch: 2 }, benchWide],
    sfx: [{ at: 'w:promise', name: 'shimmer', gain: 0.6 }],
    act(s, c) {
      atBench(s); const h = easeOut(seg(c.t, 0.1, 0.5));
      s.bean.pose({ armR: [80 * h, 6, 0], torso: [8, 0, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'smile' });
      benchShadow(s, c.T).pose({ head: [-4, 30, 0], legL: 88, legR: 88 });
    } },
  { id: 'return', dur: 1.8,
    shots: [benchGround, benchWide], focus: [-5.4, 0.2, -0.9],
    sfx: [{ at: 0.2, name: 'whoosh', gain: 0.6 }, { at: 1.4, name: 'pop' }, { at: 1.45, name: 'sparkle' }],
    act(s, c) {
      atBench(s); s.bean.pose({ armR: [80, 6, 0] }).expr({ eyes: c.t > 1.4 ? 'happy' : 'wide', brows: 'raised', mouth: c.t > 1.4 ? 'grin' : 'o' });
      if (c.t < 0.3) { benchShadow(s, c.T).pose({ legL: 40, legR: 40 }); return; }
      const u = easeInOut(seg(c.t, 0.3, 1.4)), sh = walk(s.shadow('bean'), [BENCH[0] + 0.15, BENCH[1] + 0.35], FB, u, c.t, 11, 44);
      if (u >= 1) { s.shadow('bean').free = false; }                                                                  // home: back to copying Bean
    } },
  { id: 'cameback', line: 'L26', music: 'bright',
    shots: [ground(...FB, 1.6), { on: 'bean', dist: 0.9, yaw: 10, pitch: 4 }],
    sfx: [{ at: 'w:back', name: 'ding' }],
    act(s, c) {
      const j = sin(sat((c.t - 0.05) / 0.45) * PI);
      s.bean.at(...FB, 20).pose({ armL: [150, 30, 0], armR: [150, 30, 0], lift: j * 0.14, legL: 30 * j, legR: 30 * j }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
    } },
  // ═════════ the twist
  { id: 'proud', line: 'L27',
    shots: [{ on: 'dottie', dist: 0.9, yaw: -55, pitch: 2 }, { on: 'bean', dist: 1.1, yaw: -60, pitch: 2 }],
    sfx: [{ at: 0.02, name: 'step', gain: 0.4 }],
    act(s, c) {
      s.bean.at(...FB, faceTo(FB, FD) - 20).pose({ armL: idle, armR: idle }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      show(s.dottie).at(...FD, faceTo(FD, FB) + 20).pose({ armL: [20, -20, 0], armR: [20, -20, 0], head: [0, 0, -8] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'noticed', line: 'L28', music: 'stop',
    shots: [{ on: 'bean', dist: 0.75, yaw: -55, pitch: 2 }, { on: 'bean', dist: 0.75, yaw: -45, pitch: 1, up: -0.03 }],
    sfx: [{ at: 0.1, name: 'rumble', gain: 0.6 }],
    act(s, c) {
      const d = seg(c.t, 0.3, 1.0);
      s.bean.at(...FB, faceTo(FB, FD) - 20).pose({ armL: idle, armR: idle, head: [-24 * d, 18 * d, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'flat', look: [0.5 * d, 0.7 * d] });
      show(s.dottie).at(...FD, faceTo(FD, FB) + 20).pose({ armL: [20, -20, 0], armR: [20, -20, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'noshadow', line: 'L29',
    shots: [reveal, ground(-5.1, 0.0, 1.6), { ...reveal, pos: [-3.9, 1.8, 2.0] }],
    sfx: [{ at: 'w:shadow', name: 'sting', gain: 0.8 }],
    act(s, c) {
      s.bean.at(...FB, faceTo(FB, FD) - 10).pose({ armL: idle, armR: idle, head: [-18, 20, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'o', look: [0.6, 0.6] });
      show(s.dottie).at(...FD, faceTo(FD, FB) + 20).pose({ armL: [20, -20, 0], armR: [20, -20, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'stare', dur: 1.0, focus: 'dottie',
    shots: [{ on: 'dottie', dist: 1.3, yaw: -30, pitch: 10, dolly: [0.15, -0.05, -0.2] }],
    sfx: [{ at: 0.05, name: 'rumble', gain: 0.6 }],
    act(s, c) {
      s.bean.at(...FB, faceTo(FB, FD) - 10).pose({ armL: idle, armR: idle }).expr({ eyes: 'shock', brows: 'worried', mouth: 'o' });
      show(s.dottie).at(...FD, faceTo(FD, FB) + 20).pose({ armL: [20, -20, 0], armR: [20, -20, 0], head: [0, 0, -6] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'where', line: 'L30',
    shots: [{ on: 'bean', dist: 0.75, yaw: -50, pitch: 2, shake: 0.4 }, { on: 'dottie', dist: 0.9, yaw: -40, pitch: 0, focus: 'dottie' }],
    act(s, c) {
      s.bean.at(...FB, faceTo(FB, FD) - 10).pose({ armL: [30, 10, 0], armR: [30, 10, 0], torso: [-6, 0, sin(c.t * 40) * 1.5] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true });
      show(s.dottie).at(...FD, faceTo(FD, FB) + 20).pose({ armL: [20, -20, 0], armR: [20, -20, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'whatshadow', line: 'L31',
    shots: [{ on: 'dottie', dist: 0.85, yaw: -40, pitch: 0 }, { on: 'dottie', dist: 0.7, yaw: -10, pitch: -2 }],
    sfx: [{ at: 'w:dont', name: 'sting', gain: 0.5 }],
    act(s, c) {
      const wsp = seg(c.t, c.w('dont') - 0.15, c.w('dont') + 0.05);
      s.bean.at(...FB, faceTo(FB, FD) - 10).pose({ armL: [30, 10, 0], armR: [30, 10, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble' });
      show(s.dottie).at(...FD, lerp(faceTo(FD, FB) + 20, 0, wsp)).pose({ armL: [20, -20, 0], armR: [lerp(20, 120, wsp), lerp(-20, -30, wsp), 0], torso: [12 * wsp, 0, 0], head: [-8 * wsp, 0, 6 * wsp] })
        .expr(wsp > 0.5 ? { eyes: 'half', brows: 'angry', mouth: 'smirk', look: [0, 0] } : { eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'button', dur: 0.9, focus: 'dottie',
    shots: [{ on: 'dottie', dist: 0.64, yaw: 0, pitch: -2 }],
    sfx: [{ at: 0.05, name: 'boom', gain: 0.6 }],
    act(s, c) {
      s.bean.at(...FB, faceTo(FB, FD) - 10);
      show(s.dottie).at(...FD, 0).pose({ armL: [20, -20, 0], armR: [120, -30, 0], torso: [12, 0, 0], head: [-8, 0, 6] }).expr({ eyes: 'half', brows: 'angry', mouth: 'smirk' });
    } },
];
