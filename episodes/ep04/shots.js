// EP04 — "My first day in Blox City"  (open-world city, 1.5x, original cast: Dash the courier, Mama Lu, Chief Brick, Slick)
// Pure data + pose functions (no three.js imports) so the same file drives the renderer and tools/retime.mjs.
// World: the avenue runs along x, z = 0 is the centre line; Dash rides toward +x in the near lane (z = 1.5). Facing 90 = toward +x.
// Times are on-screen seconds (the episode is authored at its final 1.5x pace).
import { seg, smooth, easeOut, easeInOut, backOut, lerp, clamp, sat } from '../../web/src/engine/util.js';
export { characters, set } from './cast.js';

const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, R = d => d * PI / 180;
const Y = 0.12;                                           // sidewalk / pier height
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / PI;
const mix2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const hash = n => { const x = sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const shakeHead = (c, a = 16, f = 22) => sin(c.T * f) * a;

// ---------------------------------------------------------------- vehicles and props
function veh(s, name, x, z, f = 90, y = 0, o = {}) { const v = s.obj(name); v.visible = true; v.position.set(x, y, z); v.rotation.set(o.roll || 0, R(f - 90), o.pitch || 0); return v; }
function rider(s, n, vname, x, z, f = 90, y = 0, o = {}) {
  veh(s, vname, x, z, f, y, o); const ch = s[n], r = R(f), sx = -0.2;
  ch.group.visible = true;
  ch.at(x + sin(r) * sx, z + cos(r) * sx, f, y + 0.76 + sx * sin(o.pitch || 0) - 0.30 * ch.scale + 0.03).pose({ legL: 64, legR: 64, armL: [70, 4, 0], armR: [70, 4, 0], torso: [10, 0, 0], auto: { idle: 0.4 } });
  if (o.pitch) ch.group.rotateX(-o.pitch); if (o.roll) ch.group.rotateZ(o.roll * 0.6);
  return ch;
}
function onRack(s, vname = 'Scooter') { const v = s.obj(vname), p = s.obj('Package'); v.updateMatrixWorld(true); p.visible = true; p.position.copy(v.localToWorld(new s.THREE.Vector3(-0.62, 0.74, 0))); p.rotation.copy(v.rotation); }
function carry(s, ch, name, fwd = 0.3, h = 0.42, side = 0) {
  const o = typeof name === 'string' ? s.obj(name) : name, r = ch.group.rotation.y, sc = ch.scale; o.visible = true;
  o.position.set(ch.group.position.x + (sin(r) * fwd + cos(r) * side) * sc, ch.group.position.y + h * sc, ch.group.position.z + (cos(r) * fwd - sin(r) * side) * sc); o.rotation.set(0, r, 0); return o;
}
const stand = (ch, p, f, y = Y) => { ch.group.visible = true; return ch.at(p[0], p[1], f, y); };
function walkPose(ch, c, mv = 1, rate = 8, amp = 38) { const st = c.T * rate; return ch.pose({ legL: sin(st) * amp * mv, legR: -sin(st) * amp * mv, armL: [-sin(st) * amp * 0.8 * mv, 8, 0], armR: [sin(st) * amp * 0.8 * mv, 8, 0], torso: [7 * mv, 0, 0], lift: abs(sin(st)) * 0.04 * mv }); }
function sirens(s, c, on) { s.copLights.forEach((l, i) => { const a = on && on.includes(i), ph = sin(c.T * 20 + i * 2) > 0; l.r.emissiveIntensity = a ? (ph ? 5 : 0.4) : 0.25; l.b.emissiveIntensity = a ? (ph ? 0.4 : 5) : 0.25; }); }
function lights(s, red) { s.tl.Red.emissiveIntensity = red ? 3.2 : 0.08; s.tl.Green.emissiveIntensity = red ? 0.08 : 2.6; s.tl.Yellow.emissiveIntensity = 0.08; }
// the Chief rides standing through the roof of patrol car 0
function chiefCar(s, c, x, z = 1.5) { veh(s, 'Cop0', x, z); s.cop.group.visible = true; return s.cop.at(x - 0.15, z, 90, 0.52).pose({ armR: [98, 6, 0], armL: [30, 30, 0], torso: [8, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' }); }
function convoy(s, c, x, gaps = [6, 10, 14], chief = true) {
  if (chief) chiefCar(s, c, x - gaps[0], 1.5); else veh(s, 'Cop0', x - gaps[0], 1.5);
  veh(s, 'Cop1', x - gaps[1], -1.3); veh(s, 'Cop2', x - gaps[2], 1.5 + sin(c.T * 3) * 0.3); sirens(s, c, [0, 1, 2]);
}
function chase(s, c, x, z = 1.5, o = {}) {              // Dash at speed: little weave + bounce, the box strapped on the rack
  const d = rider(s, 'dash', 'Scooter', x, z + sin(c.T * 4.2) * 0.12, 90, abs(sin(c.T * 17)) * 0.015, { roll: sin(c.T * 4.2) * 0.06, ...o });
  onRack(s); return d.pose({ torso: [18, 0, 0], head: [8, 0, 0] });
}

// ---------------------------------------------------------------- story state (pure function of the beat index, so frames render in any order)
const ORDER = ['hook', 'morning', 'city', 'ring', 'newkid', 'takebox', 'whats', 'questions', 'easy', 'cruise', 'nicebox', 'nottoday', 'getback', 'weave', 'market', 'hotdogs', 'crashbeat', 'lost', 'redlight', 'hey', 'copstart', 'cops', 'traffic', 'beach', 'allunits', 'bridge', 'jump', 'land', 'topier',
  'late', 'chased', 'see', 'open', 'cake', 'sirens', 'freeze', 'hbd', 'party', 'best', 'pay', 'nine', 'tomorrow', 'dayone'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
const NO_TRAFFIC = new Set(['market', 'hotdogs', 'crashbeat', 'bridge', 'jump', 'land', 'hook', 'traffic', 'allunits', 'cops', 'nicebox', 'nottoday', 'getback', 'weave', 'beach', 'copstart', 'topier', 'ring', 'newkid', 'takebox', 'whats', 'questions', 'easy']);
// diner marks
const SC0 = [4.0, -2.2], LU0 = [6.3, -3.7], LU1 = [3.45, -3.3];
// pier marks
const D1 = [72.7, 8.4], L1 = [71.1, 8.4], C1 = [74.3, 8.5], PARK = [75.0, 6.2];
const GUESTS = [['jog', 69.9, 12.0], ['ped1', 72.1, 12.35], ['ped2', 74.3, 12.0]];
const CAKEP = [72.19, 0.85, 8.4];
const TWO = { pos: [71.9, 1.45, 4.3], look: [71.9, 1.15, 8.4], fov: 56, focus: 'dash' }, THREE = { pos: [73.5, 1.5, 4.3], look: [73.5, 1.2, 8.45], fov: 56, focus: 'cop' }, WIDE = { pos: [71.7, 2.2, 3.7], look: [71.9, 2.0, 12], fov: 52, focus: [72, 1.5, 9] };

export function base(s, c) {
  const i = I[c.id], T = c.T, pier = i >= I.late;
  // ambient city life -----------------------------------------------------------------
  { const L = 26, u = (T * 2.6 + 9) % (2 * L), fw = u < L, st = T * 10;
    stand(s.jog, [3 + (fw ? u : 2 * L - u), 4.1], fw ? 90 : -90).pose({ legL: sin(st) * 48, legR: -sin(st) * 48, armL: [-sin(st) * 50 + 25, 6, 0], armR: [sin(st) * 50 + 25, 6, 0], torso: [10, 0, 0], lift: abs(sin(st)) * 0.06 }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile' }); }
  { const L = 20, u = (T * 1.2 + 4) % (2 * L), fw = u < L; walkPose(stand(s.ped1, [12 + (fw ? u : 2 * L - u), -4.2], fw ? 90 : -90), c, 1, 6.5, 30).expr({ eyes: 'half', mouth: 'smile' }); }
  stand(s.ped2, [-1.2, -3.95], 12).pose({ armR: [70, 20, 0], head: [-14, 0, 0] }).expr({ eyes: 'half', mouth: 'flat', look: [0, -0.6] });
  stand(s.vendorF, [22, 3.5], 180).pose({ armL: [35, 20, 0], armR: [35 + sin(T * 2) * 8, 20, 0] }).expr({ eyes: 'happy', mouth: 'smile' });
  stand(s.vendorH, [30, -3.45], 0).pose({ armR: [60 + sin(T * 3) * 10, 10, 0] }).expr({ eyes: 'open', mouth: 'smile' });
  stand(s.cop, [35.4, -3.6], 0).pose({ armR: [112, 14, 0], head: [-6, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' }); carry(s, s.cop, 'Donut', 0.19, 0.6, -0.1);
  stand(s.lu, LU0, 0).pose({ armL: [58, -42, 0], armR: [58, -42, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
  s.dash.hide(); s.slick.hide();
  for (const n of ['Scooter', 'Bike', 'Cop1', 'Cop2', 'Package', 'BirthdayCake', 'Phone', 'Ticket', 'Cash']) s.obj(n).visible = false;
  veh(s, 'Cop0', 35.2, -2.15); veh(s, 'CarMint', -9, -2.2); veh(s, 'CarBlue', 45.4, -2.2, -90);
  const tr = !NO_TRAFFIC.has(c.id) && !pier;
  veh(s, 'Taxi', tr ? 46 - ((T * 6.5 + 20) % 84) : -30, tr ? -1.5 : -2.2, -90); veh(s, 'CarRed', tr ? 46 - ((T * 6.5 + 62) % 84) : 15.5, tr ? -1.5 : -2.2, -90);
  sirens(s, c, null); lights(s, false);
  s.obj('GateArm').rotation.x = -1.35;
  s.palms.forEach((p, k) => { p.rotation.z = sin(T * 1.3 + k) * 0.035; p.rotation.x = sin(T * 0.9 + k * 2) * 0.03; });
  s.gulls.forEach((g, k) => { const a = T * (0.7 + k * 0.13) + k * 1.7, cx = pier ? 74 : [8, 24, 60, 40][k], cz = pier ? 16 : 11; g.position.set(cx + cos(a) * (3 + k), 5 + k * 0.7 + sin(a * 2) * 0.3, cz + sin(a) * (2.5 + k * 0.5)); g.rotation.y = -a; g.children[1].rotation.x = sin(T * 9 + k) * 0.5; g.children[2].rotation.x = -sin(T * 9 + k) * 0.5; });
  // the surprise party stays hidden until "Happy birthday, Chief"
  const partyOn = i > I.hbd;
  s.obj('Banner').scale.y = partyOn ? 1 : 0.001; s.obj('Banner').visible = partyOn;
  s.balloons.forEach((b, k) => { b.visible = partyOn; b.position.y += sin(T * 1.6 + k) * 0.09; b.rotation.z = sin(T * 1.1 + k) * 0.08; });
  if (pier) pierScene(s, c, i);
}
function dinerScene(s, c) {                              // Dash waits on the scooter outside Mama Lu's
  return rider(s, 'dash', 'Scooter', SC0[0], SC0[1]).pose({ torso: [4, 0, 0], legL: 40, legR: 64 });
}
function pierScene(s, c, i) {
  veh(s, 'Scooter', PARK[0], PARK[1], 20, Y);
  stand(s.lu, L1, 90).pose({ armL: [58, -42, 0], armR: [58, -42, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
  stand(s.dash, D1, -90).pose({ armL: [50, 4, 0], armR: [50, 4, 0] });
  const pkg = carry(s, s.dash, 'Package', 0.34, 0.22);
  if (i > I.open) { s.obj('PkgLid').visible = false; const ck = s.obj('BirthdayCake'); ck.visible = true; ck.position.set(pkg.position.x, pkg.position.y + 0.12, pkg.position.z); }
  s.cop.hide(); s.obj('Donut').visible = false; s.obj('Cop0').visible = false;
  if (i > I.sirens) { veh(s, 'Cop0', 70.2, 1.9, 78); veh(s, 'Cop1', 66.6, 1.6, 96); sirens(s, c, [0, 1]); }
  if (i > I.freeze) stand(s.cop, C1, -90).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.6 });
  for (const [n, x, z] of GUESTS) { if (i > I.hbd) { const k = n.length, hop = abs(sin(c.T * 6 + k)) * 0.12; stand(s[n], [x, z], 180).pose({ armL: [165, 14 + sin(c.T * 8 + k) * 12, 0], armR: [165, 14 - sin(c.T * 8 + k) * 12, 0], lift: hop }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); } else s[n].hide(); }
  s.vendorF.hide(); s.vendorH.hide();
}
function cakeTo(s, ch, fwd = 0.36, h = 0.26) { const ck = s.obj('BirthdayCake'); carry(s, ch, ck, fwd, h); return ck; }

// ---------------------------------------------------------------- beats
export const beats = [
  // 1 ─ HOOK (flash-forward): the whole police force is on his tail
  { id: 'hook', line: 'L01', music: 'chase',
    shots: [{ on: 'dash', dist: 1.25, yaw: 18, pitch: 3, track: true, shake: 0.3 }, { on: 'dash', dist: 3.3, yaw: 26, pitch: 13, track: true }, { pos: [86, 0.55, 3.4], look: 'dash', track: true, fov: 50 }, { on: 'dash', dist: 1.1, yaw: -12, pitch: 2, track: true, shake: 0.3 }],
    sfx: [{ at: 0, name: 'siren', gain: 0.5 }, { at: 1.6, name: 'siren', gain: 0.5 }, { at: 0, name: 'scoot', gain: 0.5 }, { at: 1.2, name: 'scoot', gain: 0.5 }, { at: 2.4, name: 'scoot', gain: 0.5 }],
    act(s, c) {
      const x = 64 + 9 * c.t, cam = c.t > c.w('chasing') - 0.1 && c.w('chasing') > 0;
      chase(s, c, x).pose({ head: [6, cam ? -18 : sin(c.t * 3) * 14, 0] }).expr({ eyes: cam ? 'half' : 'wide', brows: cam ? 'skeptic' : 'worried', mouth: cam ? 'flat' : 'teeth', sweat: true });
      convoy(s, c, x, [6.5, 10.5, 15]);
    } },
  // 2 ─ record scratch: this morning
  { id: 'morning', line: 'L02', music: 'cruise', min: 1.5,
    shots: [{ pos: [-7.6, 1.2, 2.6], look: [-5.2, 4.5, -6.4], fov: 52 }, { on: 'dash', dist: 2.6, yaw: 62, pitch: 10, track: true }],
    sfx: [{ at: 0, name: 'scratch' }, { at: 0.12, name: 'radio', gain: 0.7 }, { at: 0.7, name: 'gull', gain: 0.6 }],
    act(s, c) { rider(s, 'dash', 'Scooter', -3 + 4.5 * c.t, 1.5).pose({ head: [6, sin(c.t * 2) * 30, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile' }); } },
  // 2b ─ the city going about its day
  { id: 'city', dur: 2.1, cuts: 3,
    shots: [{ on: 'jog', dist: 2.3, yaw: 36, pitch: 4, track: true, focus: 'jog' }, { pos: [26.9, 1.6, 0.7], look: [30, 1.4, -3.0], fov: 46, focus: 'vendorH' }, { pos: [38.6, 2.0, 4.3], look: [34.6, 3.4, -6], fov: 54, focus: 'cop' }],
    sfx: [{ at: 0.1, name: 'gull', gain: 0.7 }, { at: 0.75, name: 'honk', gain: 0.5 }, { at: 1.5, name: 'chomp', gain: 0.7 }, { at: 1.1, name: 'hey', gain: 0.35 }],
    act(s, c) { s.cop.pose({ armR: [112 + sin(c.T * 9) * 6, 14, 0] }); } },
  // 3 ─ the phone rings outside Mama Lu's
  { id: 'ring', dur: 0.95, focus: 'dash',
    shots: [{ on: 'dash', dist: 1.5, yaw: -38, pitch: 5 }],
    sfx: [{ at: 0.05, name: 'ring' }, { at: 0.5, name: 'ring' }],
    act(s, c) {
      const k = easeOut(seg(c.t, 0.35, 0.7)), buzz = sin(c.T * 60) * 0.006 * (1 - k);
      dinerScene(s, c).pose({ armR: [lerp(20, 150, k), 12, 0], head: [-10 * (1 - k), 0, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o', look: [0, k ? 0 : -0.6] });
      const ph = carry(s, s.dash, 'Phone', lerp(0.2, 0.03, k), lerp(0.44, 0.74, k), lerp(-0.14, -0.17, k)); ph.position.x += buzz;
      stand(s.lu, LU0, faceTo(LU0, SC0)).pose({ armR: [150, 12, 0], armL: [20, 10, 0] }); carry(s, s.lu, 'Package', 0.06, 0.03, 0.3);
    } },
  // 4 ─ "New kid. I got a job for you."  (she is calling from two metres away)
  { id: 'newkid', line: 'L03',
    shots: [{ on: 'lu', dist: 1.15, yaw: 14, pitch: 2 }, { pos: [1.7, 1.7, 0.5], look: [5.4, 1.2, -3.2], fov: 42, focus: 'lu' }, { on: 'dash', dist: 1.15, yaw: 44, pitch: 3 }],
    act(s, c) {
      const job = c.w('job'), turn = easeOut(seg(c.t, job - 0.3, job));
      dinerScene(s, c).pose({ armR: [150, 12, 0], head: [0, 62 * turn, 0], torso: [4, 14 * turn, 0] }).expr({ eyes: turn > 0.5 ? 'half' : 'open', brows: turn > 0.5 ? 'skeptic' : 'raised', mouth: 'flat', look: [turn > 0.5 ? 0.6 : 0, 0] });
      carry(s, s.dash, 'Phone', 0.03, 0.74, -0.17);
      stand(s.lu, LU0, faceTo(LU0, SC0)).pose({ armR: [150, 12, 0], armL: [20, 10, 0], head: [0, 0, 4] }).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' }); carry(s, s.lu, 'Package', 0.06, 0.03, 0.3);
    } },
  // 5 ─ the box
  { id: 'takebox', line: 'L04',
    shots: [{ on: 'lu', dist: 1.25, yaw: -30, pitch: 2, track: true }, { pos: [1.9, 1.25, -0.5], look: [3.45, 0.9, -2.35], fov: 38, focus: [3.38, 0.9, -2.2] }, { pos: [5.9, 1.45, 0.3], look: [3.7, 1.15, -2.7], fov: 44, focus: 'lu' }, { on: 'lu', dist: 1.0, yaw: 24, pitch: -2, track: true }],
    act(s, c) {
      const pier = c.w('pier'), open = c.w('open'), late = c.w('late'), go = easeInOut(seg(c.t, 0.05, Math.max(0.5, pier - 0.1))), p = mix2(LU0, LU1, go), mv = go > 0.01 && go < 0.99 ? 1 : 0;
      const wag = c.t > open - 0.2 && c.t < late - 0.25 ? sin(c.t * 22) * 16 : 0, tap = c.t > late - 0.2;
      dinerScene(s, c).pose({ head: [0, 70, 0], torso: [4, 20, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'flat', look: [0.5, -0.2] });
      const lu = walkPose(stand(s.lu, p, mv ? faceTo(LU0, LU1) : faceTo(LU1, [3.5, -2.2])), c, mv, 9, 30);
      if (go < 1) { lu.pose({ armL: [48, 4, 0], armR: [48, 4, 0] }); carry(s, s.lu, 'Package', 0.34, 0.22); } else onRack(s);
      if (go >= 1) lu.pose({ armR: [wag ? 78 : tap ? 60 : 30, wag ? 12 + wag : tap ? -40 : 10, 0], armL: [tap ? 70 : 10, tap ? -30 : 10, 0], torso: [6, 0, 0] });
      lu.expr({ eyes: wag ? 'angry' : 'half', brows: 'angry', mouth: 'flat' });
    } },
  // 6
  { id: 'whats', line: 'L05',
    shots: [{ on: 'dash', dist: 1.15, yaw: 72, pitch: 3 }, { pos: [1.9, 1.25, -0.5], look: [3.45, 0.9, -2.3], fov: 36, focus: [3.38, 0.9, -2.2] }],
    sfx: [{ at: 'w:box', name: 'shimmer', gain: 0.6 }],
    act(s, c) {
      dinerScene(s, c).pose({ head: [-8, 78, 6], torso: [4, 26, 0], armL: [40, 50, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o', look: [0.4, -0.5] }); onRack(s);
      stand(s.lu, LU1, faceTo(LU1, SC0)).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' });
      const k = sin(seg(c.t, c.w('box'), c.w('box') + 0.5) * PI); s.obj('Package').scale.setScalar(1 + 0.08 * k);
    } },
  // 7
  { id: 'questions', line: 'L06',
    shots: [{ on: 'lu', dist: 1.2, yaw: -76, pitch: 1 }, { on: 'dash', dist: 1.1, yaw: 48, pitch: 3 }],
    sfx: [{ at: 'w:questions', name: 'boom', gain: 0.5 }],
    act(s, c) {
      const q = c.w('questions'), k = seg(c.t, q - 0.1, q + 0.1);
      dinerScene(s, c).pose({ head: [0, 60, 0], torso: [4 - 8 * k, 20, 0], lift: 0 }).expr(k > 0.5 ? { eyes: 'wide', brows: 'worried', mouth: 'teeth', sweat: true } : { eyes: 'open', brows: 'raised', mouth: 'flat' }); onRack(s);
      stand(s.lu, LU1, faceTo(LU1, SC0)).pose({ armL: [58, -42, 0], armR: [58, -42, 0], torso: [10 * k, 0, 0], head: [-6 * k, 0, 6] }).expr({ eyes: k > 0.5 ? 'angry' : 'half', brows: 'angry', mouth: 'flat' });
    } },
  // 8 ─ off he goes
  { id: 'easy', line: 'L07',
    shots: [{ on: 'dash', dist: 1.25, yaw: 24, pitch: 3, track: true }, { on: 'dash', dist: 2.6, yaw: 150, pitch: 8, track: true }],
    sfx: [{ at: 0.05, name: 'scoot' }, { at: 0.9, name: 'scoot' }],
    act(s, c) {
      const x = SC0[0] + Math.min(2.6 * c.t * c.t, 6.5 * c.t - 2), z = lerp(SC0[1], 1.5, smooth(seg(c.t, 0.1, 1.5)));
      rider(s, 'dash', 'Scooter', x, z, 90 - 40 * sin(seg(c.t, 0.1, 1.5) * PI) * -1 * 0 + lerp(0, 0, 0)).pose({ torso: [12, 0, 0], head: [8, sin(c.t * 2.5) * 12, 4] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); onRack(s);
      stand(s.lu, LU1, 90).expr({ eyes: 'half', brows: 'skeptic', mouth: 'smirk' });
    } },
  // 9 ─ cruising the open city
  { id: 'cruise', dur: 2.5, focus: 'dash', cuts: 3,
    shots: [{ pos: [3, 9.5, 13], look: [17, 0.6, -1], fov: 42 }, { on: 'dash', dist: 2.7, yaw: 72, pitch: 2, track: true, fov: 44 }, { on: 'dash', dist: 1.9, yaw: -9, pitch: -3, up: -0.55, track: true, fov: 46 }],
    sfx: [{ at: 0, name: 'scoot', gain: 0.7 }, { at: 0.9, name: 'scoot', gain: 0.7 }, { at: 1.8, name: 'scoot', gain: 0.7 }, { at: 0.3, name: 'gull', gain: 0.7 }, { at: 1.5, name: 'honk', gain: 0.5 }],
    act(s, c) { rider(s, 'dash', 'Scooter', 7 + 5.5 * c.t, 1.5 + sin(c.t * 2) * 0.15, 90, 0, { roll: sin(c.t * 2) * 0.04 }).pose({ head: [8, sin(c.t * 2.2) * 26, 0], armL: [70 + (c.t > 1.7 ? 60 * sin(seg(c.t, 1.7, 2.4) * PI) : 0), 20, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' }); onRack(s); } },
  // 10 ─ Slick pulls alongside
  { id: 'nicebox', line: 'L08', music: 'chase',
    shots: [{ on: 'slick', dist: 1.2, yaw: -28, pitch: 3, track: true }, { on: 'dash', dist: 2.5, yaw: -16, pitch: 7, track: true }, { on: 'slick', dist: 1.05, yaw: 18, pitch: 0, track: true }],
    sfx: [{ at: 0, name: 'rev' }, { at: 0.2, name: 'sting', gain: 0.5 }],
    act(s, c) {
      const x = -28 + 6 * c.t, take = c.w('take'), k = easeOut(seg(c.t, take - 0.2, take + 0.2)), near = easeOut(seg(c.t, 0, 0.7));
      rider(s, 'dash', 'Scooter', x, 1.6).pose({ head: [4, 70, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'o', look: [0.6, 0] }); onRack(s);
      rider(s, 'slick', 'Bike', x - lerp(5, 0.75, near), 0.25, 90, 0, { roll: 0.05 }).pose({ head: [0, -52, 6], armR: [lerp(70, 34, k), lerp(4, 74, k), 0], torso: [8, -10, -6 * k] }).expr({ mouth: 'smirk', brows: 'skeptic' });
    } },
  // 11
  { id: 'nottoday', line: 'L09',
    shots: [{ on: 'dash', dist: 1.15, yaw: 20, pitch: 2, track: true, shake: 0.4 }, { on: 'dash', dist: 2.8, yaw: 28, pitch: 10, track: true }],
    sfx: [{ at: 0.05, name: 'scoot' }, { at: 0.1, name: 'whoosh' }],
    act(s, c) {
      const x = -16 + 9 * c.t + 2 * c.t * c.t;
      chase(s, c, x).pose({ torso: [24, 0, 0], head: [12, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'teeth' });
      rider(s, 'slick', 'Bike', x - 1.2 - 3.2 * c.t, 0.3).pose({ armR: [40, 60, 0], head: [0, -20, 0] }).expr({ mouth: 'o', brows: 'raised' });
    } },
  // 12
  { id: 'getback', line: 'L10',
    shots: [{ on: 'slick', dist: 1.25, yaw: 12, pitch: 2, track: true, shake: 0.4 }, { on: 'dash', dist: 3.1, yaw: 22, pitch: 12, track: true }],
    sfx: [{ at: 0, name: 'rev' }],
    act(s, c) {
      const x = -4 + 9.5 * c.t;
      chase(s, c, x + 4.5).pose({ head: [6, sin(c.t * 5) * 30, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth', sweat: true });
      rider(s, 'slick', 'Bike', x, 0.9 + sin(c.T * 3) * 0.2, 90, abs(sin(c.T * 15)) * 0.02).pose({ torso: [22, 0, 0], armR: [110 + sin(c.T * 20) * 10, 20, 0], head: [10, 0, 0] }).expr({ mouth: 'scream', brows: 'angry' });
    } },
  // 12b ─ weaving through traffic
  { id: 'weave', dur: 2.0, cuts: 2, focus: 'dash',
    shots: [{ on: 'dash', dist: 2.7, yaw: 12, pitch: 10, track: true }, { on: 'dash', dist: 1.2, yaw: -20, pitch: 2, track: true, shake: 0.4 }],
    sfx: [{ at: 0.35, name: 'honk' }, { at: 1.1, name: 'honk', gain: 0.8 }, { at: 0, name: 'scoot' }, { at: 1.0, name: 'scoot' }, { at: 0.5, name: 'whoosh', gain: 0.7 }, { at: 1.25, name: 'whoosh', gain: 0.7 }, { at: 0.2, name: 'rev', gain: 0.7 }],
    act(s, c) {
      const x = -30 + 9.5 * c.t, tx = -24 + 3 * c.t, rx = -17 + 3 * c.t, dz = -1.5 * sin(seg(x, tx - 4, tx + 3.5) * PI) + 1.4 * 0 - 1.6 * sin(seg(x, rx - 4, rx + 3.5) * PI) * -0.0;
      veh(s, 'Taxi', tx, 1.5); veh(s, 'CarRed', rx, 0.0);
      const z = 1.5 - 1.5 * sin(seg(x, tx - 4, tx + 3.5) * PI) + 1.5 * sin(seg(x, rx - 3, rx + 3.5) * PI) * (x > tx + 3.5 ? 1 : 0);
      chase(s, c, x, z, { roll: 0 }).pose({ head: [6, sin(c.t * 6) * 24, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth', sweat: true });
      rider(s, 'slick', 'Bike', x - 5.5, 0.9 - 0.9 * sin(seg(x - 5.5, tx - 4, tx + 3.5) * PI)).pose({ torso: [22, 0, 0] }).expr({ mouth: 'teeth', brows: 'angry' });
    } },
  // 13 ─ through the street market
  { id: 'market', line: 'L11',
    shots: [{ on: 'dash', dist: 1.35, yaw: 22, pitch: 3, track: true, shake: 0.4 }, { pos: [26.2, 1.15, -0.7], look: [22.2, 1.0, 2.2], fov: 46, focus: [22, 1, 2.3] }, { on: 'vendorF', dist: 1.3, yaw: -24, pitch: 2 }],
    sfx: [{ at: 0, name: 'scoot' }, { at: 1.0, name: 'crash', gain: 0.8 }, { at: 1.1, name: 'boing', gain: 0.6 }, { at: 1.35, name: 'hey' }, { at: 1.25, name: 'plink', note: 1 }, { at: 1.4, name: 'plink', note: 3 }],
    act(s, c) {
      const x = 13 + 8 * c.t, hit = (21.1 - 13) / 8, k = c.t - hit, sw = sin(seg(x, 18.5, 24.5) * PI);
      chase(s, c, x, 1.5 + sw * 0.75, { roll: -sw * 0.14 }).pose({ head: [6, sin(c.t * 9) * 26, 0], armL: [70 + (k > 0 && k < 0.6 ? 80 : 0), 20, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      rider(s, 'slick', 'Bike', x - 7, 0.5).expr({ mouth: 'teeth', brows: 'angry' });
      market(s, c, k);
    } },
  // 14 ─ Slick meets the hot dog cart
  { id: 'hotdogs', line: 'L12', pad: [0.05, 0.3],
    shots: [{ on: 'slick', dist: 1.15, yaw: 15, pitch: 2, track: true, shake: 0.5, anchor: 0.1 }, { pos: [33.4, 1.25, 0.9], look: [30.2, 1.2, -2.2], fov: 48, focus: [30, 1.1, -2.3] }],
    sfx: [{ at: 0, name: 'skid' }, { at: 0.82, name: 'crash' }, { at: 0.9, name: 'splat', gain: 0.8 }, { at: 1.1, name: 'splat', gain: 0.6 }, { at: 1.25, name: 'hey', gain: 0.8 }],
    act(s, c) {
      market(s, c, 9);
      const hit = 0.82, k = c.t - hit, x = Math.min(29.0, 23 + 7.3 * c.t), z = lerp(0.5, -2.2, smooth(seg(c.t, 0, hit)));
      if (k < 0) rider(s, 'slick', 'Bike', x, z, 90 + 24 * sin(seg(c.t, 0, hit) * PI), 0, { roll: -0.12 }).pose({ torso: [-6, 0, 0], armL: [150, 20, 0], armR: [150, 20, 0], head: [0, 0, 0], auto: { blink: false } }).expr({ mouth: 'scream', brows: 'worried' });
      else { veh(s, 'Bike', 29.0, -2.2, 90, 0, { pitch: -0.5 * easeOut(seg(k, 0, 0.25)) }); const u = seg(k, 0, 0.55);
        s.slick.group.visible = true; s.slick.at(lerp(29.0, 31.9, u), lerp(-2.2, -2.3, u), 90, 0.5 + sin(u * PI) * 1.7 * (1 - u * 0.2) - 0.5 * u).pose({ armL: [170, 20, 0], armR: [170, 20, 0], legL: -30, legR: 40, auto: { blink: false } }).expr({ mouth: 'scream', brows: 'worried' }); s.slick.group.rotateX(u * PI * 1.9); }
      cartCrash(s, c, k);
    } },
  // 15 ─ aftermath
  { id: 'crashbeat', dur: 1.3, focus: 'slick', music: 'stop',
    shots: [{ pos: [33.3, 1.2, 0.5], look: [31.9, 0.8, -2.3], fov: 44 }],
    sfx: [{ at: 0.05, name: 'wah' }, { at: 0.5, name: 'splat', gain: 0.5 }],
    act(s, c) {
      market(s, c, 9); cartCrash(s, c, 9); veh(s, 'Bike', 29.0, -2.2, 90, 0, { pitch: -0.5 });
      s.slick.group.visible = true; s.slick.at(31.9, -2.3, 20, -0.30 * s.slick.scale + 0.1).pose({ legL: 86, legR: 86, armL: [20, 30, 0], armR: [20, 30, 0], head: [-6, sin(c.t * 5) * 8, 10], torso: [-6, 0, sin(c.t * 5) * 3] }).expr({ mouth: 'wobble', brows: 'sad' });
      const hd = s.obj('Hotdog0'); hd.position.copy(s.slick.headPos(new s.THREE.Vector3())); hd.position.y += 0.22; hd.rotation.set(0, 0.5, 0.1); hd.scale.setScalar(1.6);
      stand(s.vendorH, [30.6, -3.5], faceTo([30.6, -3.5], [31.9, -2.3])).pose({ armL: [58, -42, 0], armR: [58, -42, 0], head: [-14, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' });
    } },
  // 16
  { id: 'lost', line: 'L13', music: 'cruise',
    shots: [{ on: 'dash', dist: 1.3, yaw: 78, pitch: 3, track: true }, { pos: [38.8, 3.15, 2.9], look: [36.6, 3.87, 0.9], fov: 30, focus: [36.6, 3.87, 0.9] }],
    sfx: [{ at: 0, name: 'scoot', gain: 0.8 }, { at: -0.5, name: 'sting', gain: 0.45 }],
    act(s, c) { lights(s, true); chase(s, c, 4 + 7.5 * c.t).pose({ head: [6, 80, 8], torso: [10, 30, 0], armL: [150, 30 + sin(c.t * 14) * 14, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); } },
  // 17 ─ …straight through a red light, right past the Chief and his donut
  { id: 'redlight', dur: 1.25, focus: 'cop', music: 'stop',
    shots: [{ pos: [40.6, 1.25, 3.5], look: [36.2, 2.2, -1.3], fov: 52 }],
    sfx: [{ at: 0.42, name: 'whoosh' }, { at: 0.4, name: 'scoot' }, { at: 0.8, name: 'thud', gain: 0.5 }, { at: 0.05, name: 'chomp', gain: 0.7 }],
    act(s, c) {
      lights(s, true); const x = 31 + 10 * c.t, pass = 0.47, k = seg(c.t, pass, pass + 0.18);
      chase(s, c, x).expr({ eyes: 'happy', mouth: 'grin' });
      const cp = stand(s.cop, [35.4, -3.6], 0).pose({ armR: [lerp(112, 40, k), 14, 0], head: [-6 + 6 * k, lerp(0, -60, easeOut(seg(c.t, pass, pass + 0.4))), 0], auto: { blink: k < 0.5 } }).expr(k > 0.5 ? { eyes: 'shock', brows: 'raised', mouth: 'o' } : { eyes: 'happy', brows: 'raised', mouth: 'smile' });
      const d = s.obj('Donut'); if (k > 0) { const f = seg(c.t, pass + 0.1, pass + 0.42); d.position.y = lerp(d.position.y, Y + 0.05, f * f); d.rotation.x = f * 5; }
    } },
  // 18
  { id: 'hey', line: 'L14', music: 'chase',
    shots: [{ on: 'cop', dist: 1.15, yaw: -14, pitch: -2, shake: 0.3 }, { on: 'cop', dist: 2.0, yaw: 28, pitch: -8 }],
    sfx: [{ at: 0, name: 'whistle' }, { at: 'w:red', name: 'siren', gain: 0.6 }],
    act(s, c) {
      lights(s, true); const hey = seg(c.t, 0, 0.2), red = c.w('red');
      stand(s.cop, [35.6, -3.2], 62).pose({ armR: [lerp(40, 96, hey), 4 + sin(c.t * 18) * 6, 0], armL: [30, 34, 0], torso: [12, 0, 0], head: [4, 0, 0], lift: sin(seg(c.t, 0, 0.25) * PI) * 0.1 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      const d = s.obj('Donut'); d.visible = true; d.position.set(35.55, Y + 0.05, -3.25); d.rotation.set(1.5, 0, 0);
      if (c.t > red) sirens(s, c, [0]);
    } },
  // 18b ─ the Chief takes it personally
  { id: 'copstart', dur: 1.3, focus: 'cop',
    shots: [{ pos: [41.2, 0.8, 3.4], look: [37, 1.2, -1.2], fov: 48 }],
    sfx: [{ at: 0, name: 'siren', gain: 0.7 }, { at: 0.25, name: 'skid' }, { at: 0.3, name: 'rev' }],
    act(s, c) {
      lights(s, true); const k = seg(c.t, 0.2, 1.3), x = 35.2 + 8.5 * k * k, z = lerp(-2.15, 1.5, smooth(k)), pop = backOut(seg(c.t, 0, 0.25));
      veh(s, 'Cop0', x, z, 90 - 34 * sin(k * PI)); sirens(s, c, [0]);
      s.cop.group.visible = true; s.cop.at(x - 0.15, z, 90 - 34 * sin(k * PI), lerp(-0.4, 0.52, pop)).pose({ armR: [98, 6, 0], armL: [30, 30, 0], torso: [8, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'teeth' });
      const d = s.obj('Donut'); d.visible = true; d.position.set(35.55, Y + 0.05, -3.25); d.rotation.set(1.5, 0, 0);
    } },
  // 19
  { id: 'cops', line: 'L15',
    shots: [{ on: 'dash', dist: 1.2, yaw: 34, pitch: 3, track: true, shake: 0.3 }, { on: 'dash', dist: 3.2, yaw: 24, pitch: 12, track: true }],
    sfx: [{ at: 0, name: 'siren', gain: 0.55 }, { at: 0, name: 'scoot', gain: 0.6 }],
    act(s, c) {
      const x = 62 + 8.5 * c.t, now = c.w('now');
      chase(s, c, x).pose({ head: [6, c.t < now ? 55 : 0, 0], torso: [14, c.t < now ? 20 : 0, 0] }).expr(c.t < now ? { eyes: 'shock', brows: 'worried', mouth: 'o' } : { eyes: 'sad', brows: 'worried', mouth: 'wobble', sweat: true });
      chiefCar(s, c, x - 7.5 + c.t * 0.6); sirens(s, c, [0]);
    } },
  // 20 ─ the radio keeps the city informed
  { id: 'traffic', line: 'L16',
    shots: [{ pos: [-10, 9, 10], look: 'dash', track: true, fov: 36 }, { on: 'dash', dist: 2.9, yaw: -74, pitch: 1, track: true, fov: 44 }, { pos: [9, 0.5, 2.9], look: 'dash', track: true, fov: 52 }, { on: 'dash', dist: 1.3, yaw: 14, pitch: 3, track: true, shake: 0.3 }],
    sfx: [{ at: 0, name: 'radio', gain: 0.7 }, { at: 0.2, name: 'siren', gain: 0.45 }, { at: 1.8, name: 'siren', gain: 0.45 }, { at: 1.0, name: 'honk', gain: 0.5 }, { at: 0, name: 'scoot', gain: 0.5 }, { at: 1.5, name: 'scoot', gain: 0.5 }],
    act(s, c) {
      const x = -26 + 9 * c.t, bad = c.w('bad');
      chase(s, c, x).pose({ head: [6, c.t > bad - 0.2 ? -24 : sin(c.t * 4) * 20, 0] }).expr(c.t > bad - 0.2 && bad > 0 ? { eyes: 'half', brows: 'sad', mouth: 'flat', sweat: true } : { eyes: 'wide', brows: 'worried', mouth: 'teeth', sweat: true });
      convoy(s, c, x, [6.5, 10.5, 15]);
      const lookAt = n => { const p = s[n].group.position; s[n].pose({ head: [0, clamp(faceTo([p.x, p.z], [x, 1.5]) - s[n].group.rotation.y * 180 / PI, -80, 80), 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' }); };
      lookAt('ped2'); lookAt('jog');
    } },
  // 20b ─ along the beach with the whole force behind him
  { id: 'beach', dur: 2.2, cuts: 2, focus: 'dash',
    shots: [{ pos: [13.5, 0.6, 5.7], look: 'dash', track: true, fov: 52 }, { on: 'dash', dist: 3.6, yaw: -42, pitch: 16, track: true }],
    sfx: [{ at: 0, name: 'siren', gain: 0.5 }, { at: 1.3, name: 'siren', gain: 0.5 }, { at: 0, name: 'scoot', gain: 0.7 }, { at: 1.0, name: 'scoot', gain: 0.7 }, { at: 0.9, name: 'whoosh' }, { at: 0.6, name: 'gull', gain: 0.6 }],
    act(s, c) {
      const x = 8 + 9 * c.t; chase(s, c, x).pose({ head: [6, sin(c.t * 5) * 30, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      convoy(s, c, x, [6.5, 10.5, 15]);
    } },
  // 21
  { id: 'allunits', line: 'L17',
    shots: [{ on: 'cop', dist: 1.3, yaw: 20, pitch: 0, track: true, shake: 0.4 }, { on: 'cop', dist: 3.3, yaw: 30, pitch: 10, track: true }],
    sfx: [{ at: 0, name: 'siren', gain: 0.6 }, { at: 0.05, name: 'radio', gain: 0.5 }],
    act(s, c) {
      const x = 4 + 9 * c.t; convoy(s, c, x + 6.5, [6.5, 11, 15.5]);
      s.cop.pose({ armR: [100 + sin(c.T * 16) * 8, 4, 0], armL: [150, 20, 0], torso: [14, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      chase(s, c, x + 9);
    } },
  // 22 ─ the drawbridge
  { id: 'bridge', line: 'L18',
    shots: [{ pos: [44.2, 1.7, 0.2], look: [52.5, 1.9, 0], fov: 46, focus: [50, 1, 0] }, { on: 'dash', dist: 1.15, yaw: 14, pitch: 2, track: true, shake: 0.5 }, { on: 'dash', dist: 2.6, yaw: 168, pitch: 12, track: true, focus: [50, 1, 0] }],
    sfx: [{ at: 0, name: 'creak' }, { at: 0.1, name: 'ding' }, { at: 0.45, name: 'ding' }, { at: 0.8, name: 'ding' }, { at: 0.3, name: 'rumble' }, { at: 0.9, name: 'siren', gain: 0.4 }],
    act(s, c) {
      const x = 28 + 7.2 * c.t, no = c.w('no');
      bridgeOpen(s, c, 0.5 * smooth(seg(c.t, 0, 1.9)), 1);
      chase(s, c, Math.min(x, 48.4)).pose({ head: [4, c.t > no && no > 0 ? shakeHead(c, 34) : 0, 0], torso: [c.t > no ? -4 : 14, 0, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      convoy(s, c, Math.min(x, 48.4), [8, 12.5, 17], false);
    } },
  // 23 ─ the jump
  { id: 'jump', line: 'L19', min: 1.9, cuts: 2,
    shots: [{ pos: [55.5, 0.5, 11.5], look: 'dash', track: true, fov: 50, focus: 'dash' }, { on: 'dash', dist: 1.3, yaw: 26, pitch: -12, track: true }],
    sfx: [{ at: 0, name: 'crash', gain: 0.5 }, { at: 0.3, name: 'whoosh' }, { at: 0.35, name: 'slide' }, { at: 0.7, name: 'shimmer' }],
    act(s, c) {
      bridgeOpen(s, c, 0.5, 1, true);
      const u = seg(c.t, 0, c.dur + 0.05), a = 0.5, tipX = 50 + 4 * cos(a) - 0.3, tipY = 4 * sin(a) - 0.1;
      let x, y, pitch;
      if (u < 0.2) { const k = u / 0.2; x = lerp(49.2, tipX, k); y = Math.max(0, (x - 50) * Math.tan(a)); pitch = x > 50.2 ? a : 0; }
      else { const k = (u - 0.2) / 0.8; x = lerp(tipX, 61.6, k); y = lerp(tipY, 0.9, k) + sin(k * PI) * 2.3; pitch = lerp(a, -0.32, smooth(k)); }
      const air = u > 0.2 ? 1 : 0;
      rider(s, 'dash', 'Scooter', x, 1.5, 90, y, { pitch }).pose({ armL: [air ? 168 : 70, 24, 0], armR: [air ? 168 : 70, 24, 0], legL: air ? 30 : 64, legR: air ? 50 : 64, torso: [air ? -8 : 20, 0, 0], head: [air ? 14 : 4, 0, 0], auto: { blink: false } })
        .expr(air ? { eyes: 'happy', brows: 'raised', mouth: 'grin' } : { eyes: 'closed', brows: 'worried', mouth: 'teeth' });
      onRack(s);
      const stop = easeOut(seg(c.t, 0, 0.7)); veh(s, 'Cop0', lerp(41, 47.2, stop), 1.5, 90, 0, { pitch: -0.05 * sin(stop * PI) }); veh(s, 'Cop1', lerp(36.5, 46.2, stop), -1.3, 82); veh(s, 'Cop2', lerp(32, 43.2, stop), 1.6, 99); sirens(s, c, [0, 1, 2]);
    } },
  // 24 ─ landing; the patrol cars are stuck on the wrong side
  { id: 'land', dur: 1.6, focus: 'dash', cuts: 2,
    shots: [{ pos: [66.5, 0.5, 3.3], look: 'dash', track: true, fov: 50 }, { pos: [52.3, 3.3, 6.2], look: [47.6, 1.0, 0.8], fov: 46, focus: [47, 1, 1] }],
    sfx: [{ at: 0.02, name: 'thud' }, { at: 0.1, name: 'skid', gain: 0.7 }, { at: 0.25, name: 'boing', gain: 0.5 }, { at: 0.85, name: 'honk', gain: 0.6 }, { at: 1.05, name: 'wah', gain: 0.7 }],
    act(s, c) {
      bridgeOpen(s, c, 0.5, 1, true);
      const x = 61.6 + 6.5 * c.t, b = abs(sin(seg(c.t, 0, 0.6) * PI * 2)) * 0.28 * (1 - seg(c.t, 0, 0.6));
      rider(s, 'dash', 'Scooter', x, 1.5 + sin(c.t * 9) * 0.3 * (1 - seg(c.t, 0, 0.8)), 90, b, { roll: sin(c.t * 9) * 0.12 * (1 - seg(c.t, 0, 0.8)) }).pose({ head: [6, c.t > 0.5 ? 100 : 0, 0], torso: [12, c.t > 0.5 ? 30 : 0, 0], armL: [c.t > 0.5 ? 160 : 70, 20, 0] }).expr(c.t > 0.5 ? { eyes: 'happy', brows: 'raised', mouth: 'grin' } : { eyes: 'wince', brows: 'worried', mouth: 'teeth' });
      onRack(s);
      veh(s, 'Cop0', 47.2, 1.5); veh(s, 'Cop1', 46.2, -1.3, 82); veh(s, 'Cop2', 43.2, 1.6, 99); sirens(s, c, [0, 1, 2]);
      s.cop.group.visible = true; s.cop.at(47.05, 1.5, 90, 0.52).pose({ armL: [165, 20 + sin(c.T * 14) * 10, 0], armR: [165, 20 - sin(c.T * 14) * 10, 0], torso: [10, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
    } },
  // 24b ─ the turn onto the pier
  { id: 'topier', dur: 1.2, focus: 'dash',
    shots: [{ pos: [74.8, 1.7, 7.4], look: 'dash', track: true, fov: 50 }],
    sfx: [{ at: 0, name: 'scoot' }, { at: 0.5, name: 'skid', gain: 0.6 }],
    act(s, c) {
      const u = seg(c.t, 0, 1.2), a = u * PI / 2, x = 67.4 + 4.8 * sin(a), z = 1.5 + 2.0 * (1 - cos(a));
      rider(s, 'dash', 'Scooter', x, z, 90 - 90 * u, z > 3 ? Y : 0, { roll: 0 }).pose({ torso: [16, 0, 0], head: [4, -20, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); onRack(s);
    } },
  // 25 ─ the pier
  { id: 'late', line: 'L20', music: 'cruise',
    shots: [{ on: 'lu', dist: 1.2, yaw: 42, pitch: -2 }, { pos: [74.9, 1.5, 10.6], look: [73.2, 1.15, 7.4], fov: 48, focus: 'dash' }],
    sfx: [{ at: 0, name: 'skid' }, { at: 0.2, name: 'gull', gain: 0.5 }],
    act(s, c) {
      const u = easeOut(seg(c.t, 0, 0.75)), p = mix2([73.6, 3.2], PARK, u);
      rider(s, 'dash', 'Scooter', p[0], p[1], lerp(0, 20, u), Y, { roll: 0.2 * (1 - u) }).pose({ torso: [lerp(-10, 6, u), 0, 0], head: [4, 0, 0] }).expr({ eyes: 'wince', brows: 'worried', mouth: 'teeth', sweat: true }); onRack(s);
      stand(s.lu, L1, 150).pose({ head: [0, 0, 6], legR: sin(c.T * 10) > 0 ? 8 : 0 });
    } },
  // 26
  { id: 'chased', line: 'L21',
    shots: [{ on: 'dash', dist: 1.2, yaw: -48, pitch: 2 }, TWO, { on: 'dash', dist: 1.05, yaw: -30, pitch: -3 }],
    act(s, c) {
      const what = c.w('what'), k = seg(c.t, what - 0.1, what + 0.1);
      s.dash.pose({ armL: [k ? 50 : 120 + sin(c.T * 12) * 30, k ? 4 : 40, 0], torso: [8, 0, sin(c.T * 6) * 3], head: [k ? -10 : 4, 0, 0], lift: k ? 0 : abs(sin(c.T * 9)) * 0.03 })
        .expr(k > 0.5 ? { eyes: 'angry', brows: 'angry', mouth: 'frown', look: [0, -0.5] } : { eyes: 'wide', brows: 'worried', mouth: 'scream', sweat: true });
    } },
  // 27
  { id: 'see', line: 'L22',
    shots: [{ on: 'lu', dist: 1.1, yaw: 46, pitch: -2 }, TWO],
    act(s, c) {
      const k = easeOut(seg(c.t, c.dur - 0.5, c.dur));
      s.lu.pose({ armR: [70 * k + 20, 6, 0], armL: [20, 10, 0], torso: [8 * k, 0, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
      s.dash.expr({ eyes: 'open', brows: 'worried', mouth: 'flat', look: [0, -0.4] });
    } },
  // 28 ─ the lid comes off
  { id: 'open', dur: 1.15, focus: CAKEP, music: 'stop',
    shots: [{ pos: [72.45, 1.5, 6.5], look: CAKEP, fov: 36, dolly: [-0.04, -0.02, 0.16] }],
    sfx: [{ at: 0, name: 'drum' }, { at: 0.5, name: 'pop' }, { at: 0.55, name: 'sparkle' }, { at: 0.6, name: 'shimmer' }],
    act(s, c) {
      const up = easeOut(seg(c.t, 0.4, 0.7)), lid = s.obj('PkgLid'), pk = s.obj('Package'), rise = backOut(seg(c.t, 0.5, 0.95));
      lid.visible = true; lid.position.y += up * 0.7; lid.position.x -= up * 0.45; lid.rotation.z = up * 1.2;
      s.lu.pose({ armR: [80 + up * 50, 6, 0], armL: [20, 10, 0], torso: [8, 0, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
      s.dash.pose({ head: [-16, 0, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o', look: [0, -0.7] });
      if (c.t > 0.5) { const ck = s.obj('BirthdayCake'); ck.visible = true; ck.position.set(pk.position.x, pk.position.y + 0.12 * rise, pk.position.z); ck.scale.setScalar(Math.max(0.01, rise)); }
    } },
  // 29
  { id: 'cake', line: 'L23', music: 'cruise',
    shots: [{ on: 'dash', dist: 1.2, yaw: -46, pitch: 5 }, { pos: [72.45, 1.5, 6.6], look: CAKEP, fov: 32, focus: CAKEP }],
    act(s, c) {
      s.dash.pose({ head: [c.t < c.dur * 0.5 ? -16 : 2, 0, 8] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'o', look: [0, c.t < c.dur * 0.5 ? -0.7 : 0] });
      s.lu.expr({ eyes: 'happy', brows: 'raised', mouth: 'smirk' });
    } },
  // 30 ─ the cavalry
  { id: 'sirens', dur: 0.95, focus: [69.5, 1, 1.8], music: 'chase',
    shots: [{ pos: [74.2, 0.75, 4.3], look: [69.3, 0.95, 1.8], fov: 48 }],
    sfx: [{ at: 0, name: 'siren', gain: 0.7 }, { at: 0.25, name: 'skid' }, { at: 0.5, name: 'skid', gain: 0.7 }],
    act(s, c) {
      const u = easeOut(seg(c.t, 0, 0.6)), u2 = easeOut(seg(c.t, 0.15, 0.85));
      veh(s, 'Cop0', lerp(61, 70.2, u), 1.9, lerp(90, 78, u), 0, { roll: 0.08 * sin(u * PI) }); veh(s, 'Cop1', lerp(55, 66.6, u2), 1.6, lerp(90, 96, u2)); sirens(s, c, [0, 1]);
    } },
  // 31
  { id: 'freeze', line: 'L24', music: 'stop',
    shots: [{ on: 'cop', dist: 1.3, yaw: -46, pitch: 0, track: true, shake: 0.3 }, { pos: [72.5, 1.5, 6.6], look: CAKEP, fov: 32, focus: CAKEP }, { on: 'cop', dist: 1.1, yaw: -40, pitch: -2, track: true }],
    sfx: [{ at: 0, name: 'whistle', gain: 0.7 }, { at: 'w:wait', name: 'scratch' }, { at: 'w:cake', name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      const wait = c.w('wait') || c.dur * 0.4, run = easeOut(seg(c.t, 0, wait - 0.05)), p = mix2([75.4, 5.0], C1, run), mv = run < 0.98 ? 1 : 0, soft = seg(c.t, wait + 0.15, wait + 0.5);
      const cp = walkPose(stand(s.cop, p, -90), c, mv, 12, 40).pose({ armR: [lerp(96, 30, soft), 6, 0], armL: [lerp(20, 30, soft), 10, 0], head: [lerp(4, -8, soft), 0, 6 * soft] });
      cp.expr(soft > 0.5 ? { eyes: 'wide', brows: 'raised', mouth: 'o', look: [0, -0.4], blush: 0.5 } : { eyes: 'angry', brows: 'angry', mouth: 'scream' });
      s.dash.pose({ head: [4, -110 * (1 - soft * 0.6), 0], torso: [0, -30, 0], lift: sin(seg(c.t, 0, 0.25) * PI) * 0.1 }).expr({ eyes: 'shock', brows: 'worried', mouth: 'teeth', sweat: true });
      s.lu.expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
    } },
  // 32 ─ SURPRISE
  { id: 'hbd', line: 'L25', min: 2.1, music: 'cruise',
    shots: [{ on: 'lu', dist: 1.15, yaw: 46, pitch: -2 }, WIDE],
    sfx: [{ at: -1.0, name: 'horn' }, { at: -0.95, name: 'cheer' }, { at: -0.9, name: 'pop' }, { at: -0.75, name: 'pop', gain: 0.8 }, { at: -0.5, name: 'sparkle' }],
    act(s, c) {
      const go = c.dur - 1.0, k = seg(c.t, go, go + 0.35), kb = backOut(k);
      s.lu.pose({ armL: [20 + 130 * k, 30, 0], armR: [20 + 130 * k, 30, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      const bn = s.obj('Banner'); bn.visible = k > 0; bn.scale.y = Math.max(0.001, kb);
      s.balloons.forEach((b, n) => { b.visible = k > 0; b.position.y -= (1 - easeOut(seg(c.t, go + n * 0.03, go + 0.6 + n * 0.03))) * 4.5; });
      if (k > 0) for (const [n, x, z] of GUESTS) { const j = backOut(seg(c.t, go + 0.05, go + 0.4)); stand(s[n], [x, z], 180, Y - 1.3 * (1 - j)).pose({ armL: [165, 20, 0], armR: [165, 20, 0], lift: abs(sin(c.T * 7 + x)) * 0.1 * j }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); }
      stand(s.cop, C1, -90).pose({ armL: [150 * k, 30, 0], armR: [150 * k, 30, 0], lift: abs(sin(c.T * 8)) * 0.08 * k }).expr(k > 0.3 ? { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.7 } : { eyes: 'wide', brows: 'raised', mouth: 'o', blush: 0.5 });
      s.dash.pose({ head: [4, 40, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  // 33 ─ party
  { id: 'party', dur: 2.0, focus: 'cop', cuts: 2,
    shots: [{ on: 'cop', dist: 1.4, yaw: -8, pitch: 0 }, WIDE],
    sfx: [{ at: 0, name: 'cheer', gain: 0.8 }, { at: 0.3, name: 'horn', gain: 0.7 }, { at: 1.0, name: 'cheer', gain: 0.6 }, { at: 1.2, name: 'horn', gain: 0.5 }],
    act(s, c) { endState(s, c); s.dash.expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' }); } },
  // 34
  { id: 'best', line: 'L26',
    shots: [{ on: 'cop', dist: 1.2, yaw: -10, pitch: -2 }, THREE, { on: 'dash', dist: 1.15, yaw: 46, pitch: 2 }, { on: 'cop', dist: 1.05, yaw: -44, pitch: -3 }],
    sfx: [{ at: 'w:ticket', name: 'slide' }, { at: 'w:ticket', name: 'wah', gain: 0.6 }],
    act(s, c) {
      const you = c.w('you') || c.dur * 0.55, k = seg(c.t, you - 0.15, you + 0.1); endState(s, c);
      if (k > 0.5) { stand(s.cop, C1, -90).pose({ armR: [84, 4, 0], armL: [20, 12, 0], torso: [6, 0, 0], head: [0, 0, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' }); carry(s, s.cop, 'Ticket', 0.36, 0.5, -0.19); cakeTo(s, s.lu); s.lu.pose({ armL: [50, 4, 0], armR: [50, 4, 0] }); }
      stand(s.dash, D1, 90).pose({ armL: [20, 14, 0], armR: [20, 14, 0], head: [4, 0, 0], torso: [k > 0.5 ? 10 : 0, 0, 0] }).expr(k > 0.5 ? { eyes: 'sad', brows: 'worried', mouth: 'wobble' } : { eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  // 35
  { id: 'pay', line: 'L27',
    shots: [{ on: 'lu', dist: 1.15, yaw: 4, pitch: -2 }, TWO],
    sfx: [{ at: 'w:pay', name: 'kaching', gain: 0.8 }],
    act(s, c) {
      endState(s, c); const k = easeOut(seg(c.t, 0.1, 0.5));
      stand(s.lu, L1, 140).pose({ armR: [20 + 64 * k, 4, 0], armL: [20, 10, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' }); carry(s, s.lu, 'Cash', 0.36, 0.5, -0.19);
      s.dash.pose({ armR: [84, 4, 0], armL: [20, 14, 0], head: [4, 0, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile' }); carry(s, s.dash, 'Ticket', 0.3, 0.5, -0.19);
    } },
  // 36
  { id: 'nine', line: 'L28',
    shots: [{ on: 'dash', dist: 1.3, yaw: -8, pitch: 2 }, { pos: [72.7, 1.15, 6.3], look: [72.7, 0.92, 7.95], fov: 30, focus: [72.7, 0.9, 7.95] }, { on: 'dash', dist: 1.5, yaw: 12, pitch: 1 }],
    sfx: [{ at: 'w:ten', name: 'boom', gain: 0.5 }, { at: 'w:ten', name: 'wah', gain: 0.5 }],
    act(s, c) {
      endState(s, c); const ten = c.w('ten') || c.dur * 0.6, k = c.t > ten - 0.15;
      stand(s.dash, D1, 180).pose({ armR: [84, 4, 0], armL: [84, 4, 0], head: [k ? 4 : -12, k ? 0 : sin(c.t * 7) * 22, 0], lift: k ? abs(sin(c.T * 12)) * 0.04 : 0 }).expr(k ? { eyes: 'angry', brows: 'angry', mouth: 'scream' } : { eyes: 'wide', brows: 'worried', mouth: 'o', look: [sin(c.t * 7) * 0.7, -0.6] });
      carry(s, s.dash, 'Ticket', 0.3, 0.5, -0.19); carry(s, s.dash, 'Cash', 0.3, 0.5, 0.19);
    } },
  // 37
  { id: 'tomorrow', line: 'L29',
    shots: [{ pos: [71.5, 1.5, 6.2], look: 'lu', track: true, fov: 40, focus: 'lu' }],
    act(s, c) {
      endState(s, c); const k = easeInOut(seg(c.t, 0.35, c.dur));
      walkPose(stand(s.lu, [L1[0] - 0.4 * k, L1[1] + 1.2 * k], lerp(150, 60, k)), c, k > 0.02 && k < 0.98 ? 1 : 0, 9, 26).pose({ head: [0, lerp(0, 70, k), 0], armR: [k * 130, 20, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
      stand(s.dash, D1, 180).pose({ armR: [84, 4, 0], armL: [84, 4, 0], head: [0, -50, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'o' });
      carry(s, s.dash, 'Ticket', 0.3, 0.5, -0.19); carry(s, s.dash, 'Cash', 0.3, 0.5, 0.19);
    } },
  // 38 ─ button: to camera, then it loops into "First day in Blox City…"
  { id: 'dayone', line: 'L30', pad: [0.07, 0.35], music: 'cruise',
    shots: [{ on: 'dash', dist: 1.35, yaw: 0, pitch: 2 }, { on: 'dash', dist: 1.05, yaw: -8, pitch: 0 }],
    sfx: [{ at: -0.3, name: 'ding', gain: 0.6 }],
    act(s, c) {
      endState(s, c); const one = c.w('one') || c.dur * 0.7, k = seg(c.t, one, one + 0.3);
      stand(s.dash, D1, 180).pose({ armR: [30, 10, 0], armL: [30, 10, 0], torso: [6 + 6 * k, 0, 0], head: [-4 - 8 * k, 0, 6] }).expr({ eyes: 'half', brows: 'sad', mouth: k > 0.5 ? 'flat' : 'frown' });
      stand(s.lu, [70.6, 10.2], 160).pose({ armL: [50, 4, 0], armR: [50, 4, 0] }); cakeTo(s, s.lu); s.cop.pose({ armL: [160, 20, 0], armR: [160, 20, 0] });
    } },
];
for (const b of beats) for (const sh of b.shots) if (sh.on && !sh._scaled) { sh.dist = (sh.dist ?? 1.3) * 1.38; sh._scaled = true; }      // the cast is 1.5x the size of the EP01 kids: back the character cameras off

// end-of-story tableau on the pier: the Chief hugs his cake, the party is on
function endState(s, c) {
  s.obj('Package').visible = false;
  stand(s.cop, C1, 180).pose({ armL: [50, 4, 0], armR: [50, 4, 0], lift: abs(sin(c.T * 8)) * 0.05, head: [0, 0, sin(c.T * 6) * 8] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.8 }); cakeTo(s, s.cop);
  s.dash.pose({ armL: [20, 14, 0], armR: [20, 14, 0] });
}
function bridgeOpen(s, c, a, gate = 1, smashed = false) {
  s.obj('BridgeL').rotation.z = a; s.obj('BridgeR').rotation.z = -a;
  const arm = s.obj('GateArm'); arm.rotation.x = -1.35 * (1 - gate); if (smashed) arm.rotation.y = 1.9;
}
// the fruit stand after Dash clips it (k = seconds since the hit; negative = untouched)
function market(s, c, k) {
  if (k <= 0) return; const fs = s.obj('FruitStand'); fs.rotation.x = 0.22 * easeOut(seg(k, 0, 0.3)); fs.rotation.y = 0.12 * easeOut(seg(k, 0, 0.3));
  for (let i = 0; i < 18; i++) { const f = s.obj('Fruit' + i), vx = 2 + hash(i) * 5, vz = (hash(i + 40) - 0.6) * 5, vy = 2.5 + hash(i + 80) * 3.5, t = Math.min(k, 3);
    let y = f.position.y + vy * t - 4.9 * t * t, tt = t; if (y < 0.11) { const tl = (vy + Math.sqrt(vy * vy + 19.6 * (f.position.y - 0.11))) / 9.8; tt = tl + (t - tl) * 0.35; y = 0.11 + abs(sin((t - tl) * 7)) * 0.25 * Math.exp(-(t - tl) * 3); }
    f.position.set(f.position.x + vx * tt, y, f.position.z + vz * tt); }
  s.vendorF.pose({ armR: [160, 10 + sin(c.T * 18) * 14, 0], armL: [30, 30, 0], head: [0, -40, 0], lift: abs(sin(c.T * 10)) * 0.05 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
}
function cartCrash(s, c, k) {
  if (k <= 0) return; const cart = s.obj('HotdogCart'), u = easeOut(seg(k, 0, 0.35)); cart.rotation.z = -0.45 * u; cart.position.x += 0.5 * u; cart.position.y += 0.1 * u;
  s.obj('CartUmb').rotation.y = k * 9 * (1 - seg(k, 0, 2)); s.obj('CartUmb').rotation.z = 0.3 * u;
  for (let i = 0; i < 6; i++) { const h = s.obj('Hotdog' + i), vx = 1 + hash(i + 7) * 3, vz = (hash(i + 17) - 0.3) * 3, vy = 4 + hash(i + 27) * 3, t = Math.min(k, 3); let y = h.position.y + vy * t - 4.9 * t * t; const land = y < 0.07; if (land) y = 0.07;
    const tl = (vy + Math.sqrt(vy * vy + 19.6 * (h.position.y - 0.07))) / 9.8, tt = Math.min(t, tl); h.position.set(h.position.x + vx * tt, y, h.position.z + vz * tt); h.rotation.set(tt * 6 + i, i, tt * 5); }
  stand(s.vendorH, [30.2, -3.5], 0).pose({ armL: [165, 20, 0], armR: [165, 20, 0], lift: sin(seg(k, 0, 0.3) * PI) * 0.12 }).expr({ eyes: 'shock', brows: 'raised', mouth: 'scream' });
}
