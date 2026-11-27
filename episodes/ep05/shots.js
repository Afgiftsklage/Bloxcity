// EP05 — "In this city, your shadow is alive"   (Blox City, toy cast, living shadows, 1.5x, cuts every 0.67–1.33 s)
// Every character's shadow is cast by an invisible twin (set.shadowTwins): it copies its owner, acts on its own (s.shadow(name)) or is missing (noShadow).
// Story clock: in this city a shadow that isn't home by sunset is gone forever. The street clocks count down to 7:00 and the sun sinks beat by beat.
// Route: Mama Lu's Diner (the rules) → donut shop (the lies, the shadow walks out) → bus stop (re-hook: the shadow is out there telling the truth)
//        → market (Dottie joins) → donut shop (Mr. Pickle joins) → drawbridge (the leap) → the pier at sunset (apology, confession, Dottie has no shadow).
// Dottie never has a shadow, in any shot. All times are on-screen seconds.
import { seg, smooth, easeOut, easeInOut, backOut, lerp, clamp, sat } from '../../web/src/engine/util.js';

const C = (model, scale, skin, colors, hide = []) => ({ model, scale, skin, colors: { skin, ...colors }, hide });
export const characters = {
  bean:    C('char_bean', 1.45, '#F7C59A', { top: '#ffd23f', pants: '#2f56c9', hair: '#5a3418', accent: '#ff8a3d', shoe: '#ffffff' }),
  dottie:  C('char_dottie', 1.42, '#F2B890', { top: '#ff7fb5', pants: '#7b4fd6', hair: '#3a1f5a', accent: '#3fd0c9', shoe: '#ffffff' }),
  max:     C('char_bean', 1.55, '#C98A5E', { top: '#19b5a5', pants: '#2d3352', hair: '#15161c', accent: '#ffd166', shoe: '#ffffff' }, ['Tuft1']),
  pickle:  C('char_bean', 1.62, '#EDB48C', { top: '#6fbf3a', pants: '#3a2f4a', hair: '#dcdce6', accent: '#ff4b3e', shoe: '#15161c' }, ['Tuft0', 'Tuft1', 'Tuft2']),
  // silent city life (sound effects only)
  cop:     C('char_bean', 1.62, '#F0B58A', { hair: '#4a2c1a', top: '#24418f', pants: '#1b2f6b', accent: '#ffd166', shoe: '#15161c' }, ['Tuft0', 'Tuft1', 'Tuft2']),
  vendorF: C('char_mom', 1.5, '#C98D62', { hair: '#6b3a1e', top: '#3cc46c', pants: '#f3f0e8', accent: '#ffffff', shoe: '#8a5a36' }, ['Bun']),
  vendorH: C('char_bean', 1.55, '#F2B88F', { hair: '#2b1a12', top: '#ffffff', pants: '#ff4b3e', accent: '#ff4b3e', shoe: '#15161c' }, ['Tuft0', 'Tuft1', 'Tuft2']),
  jog:     C('char_dottie', 1.45, '#D99A6C', { hair: '#7a3b12', top: '#ffd166', pants: '#3f8cff', accent: '#ffffff', shoe: '#ffffff' }),
  ped1:    C('char_bean', 1.5, '#F5C9A3', { hair: '#d9a441', top: '#c9a9e9', pants: '#5a4630', accent: '#ffffff', shoe: '#3a2f4a' }),
  ped2:    C('char_dottie', 1.48, '#B97A56', { hair: '#15161c', top: '#7cc6fe', pants: '#ff7fa0', accent: '#ffffff', shoe: '#ffffff' }),
};
// sun from the left and a little in front: shadows fall back-right of the characters (onto the sidewalk and the shop walls), long enough to act in
const SUN0 = { offset: [-7, 6, 6], color: '#ffc08a', intensity: 4.4 }, SUN1 = { offset: [-7, 3.1, 6], color: '#ff8a52', intensity: 4.0 };
export const set = {
  model: null, builder: 'bloxcity', lighting: 'day', shadowTwins: true, bounds: { x: [-40, 120], y: [0.12, 40], z: [-40, 60] },
  day: { exposure: 0.86, bloom: { strength: 0.16, radius: 0.5, threshold: 1.0 }, hdri: { file: 'hdri/belfast_sunset_puresky_2k.hdr', intensity: 0.6, background: 1.0, rotation: 0 },
    sun: { color: SUN0.color, intensity: SUN0.intensity, offset: SUN0.offset, shadowHalf: 7 }, rim: { color: '#ff9fd0', intensity: 1.2, offset: [7, 5, -8] }, hemi: { sky: '#ffd0b0', ground: '#8a7a9a', intensity: 0.42 } },
  sun: { fill: 0.3, fillOffset: [5, 3, 7], env: 0.28, hemi: 0.2 },
};

const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs;
const Y = 0.12;                                                     // sidewalk / pier height
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / PI;
const hex = (a, b, t) => '#' + [0, 2, 4].map(i => Math.round(lerp(parseInt(a.substr(1 + i, 2), 16), parseInt(b.substr(1 + i, 2), 16), t)).toString(16).padStart(2, '0')).join('');
const idle = [0, 8, 0];
const stand = (ch, p, f = 0, y = Y) => { ch.group.visible = true; return ch.at(p[0], p[1], f, y); };
const walkPose = (ch, t, mv = 1, rate = 8, amp = 38) => { const st = t * rate; return ch.pose({ legL: sin(st) * amp * mv, legR: -sin(st) * amp * mv, armL: [-sin(st) * amp * 0.8 * mv, 8, 0], armR: [sin(st) * amp * 0.8 * mv, 8, 0], torso: [7 * mv, 0, 0], lift: abs(sin(st)) * 0.03 * mv }); };
const runTo = (ch, a, b, u, t, rate = 12, amp = 48, y = Y) => { const mv = u > 0.001 && u < 0.999 ? 1 : 0; walkPose(stand(ch, [lerp(a[0], b[0], sat(u)), lerp(a[1], b[1], sat(u))], faceTo(a, b), y), t, mv, rate, amp); return ch.pose({ torso: [16 * mv, 0, 0] }); };
// a shadow twin standing where its owner stands (still attached at the feet) but with a pose of its own
const own = (s, n, facing) => { const o = s.chars[n], t = s.shadow(n); t.group.visible = true; t.group.position.copy(o.group.position); t.group.rotation.y = facing == null ? o.group.rotation.y : facing * PI / 180; return t; };
// a shadow twin somewhere else (its owner is not there)
const away = (s, n, p, f = 0, y = Y) => { const t = s.shadow(n); t.group.visible = true; return t.at(p[0], p[1], f, y); };
const carry = (s, ch, o, fwd = 0.3, h = 0.42, side = 0) => { const r = ch.group.rotation.y, sc = ch.scale; o.visible = true;
  o.position.set(ch.group.position.x + (sin(r) * fwd + cos(r) * side) * sc, ch.group.position.y + h * sc, ch.group.position.z + (cos(r) * fwd - sin(r) * side) * sc); o.rotation.set(0, r, 0); return o; };
const veh = (s, name, x, z, f = 90, y = 0) => { const v = s.obj(name); v.visible = true; v.position.set(x, y, z); v.rotation.set(0, (f - 90) * PI / 180, 0); return v; };
// shadow poses
const P = {
  wave: t => ({ armL: idle, armR: [160 + sin(t * 10) * 8, 28 + sin(t * 9) * 26, 0], head: [0, 0, sin(t * 9) * 10] }),
  dance: t => { const d = t * 10; return { armL: [150 + sin(d) * 25, 40, 0], armR: [150 - sin(d) * 25, 40, 0], torso: [0, sin(d * 0.5) * 25, sin(d) * 12], legL: sin(d) * 25, legR: -sin(d) * 25, lift: abs(sin(d)) * 0.05 }; },
  shake: t => ({ armL: [130, 20, 0], armR: [130, 20, 0], torso: [-8, 0, sin(t * 60) * 6], head: [0, sin(t * 70) * 10, 0], legL: sin(t * 60) * 6 }),
  cross: (t, n = 1) => ({ armL: [80, -42, 0], armR: [80, -42, 0], head: [sin(t * 7) * 14 * n, 0, 0] }),
  palm: () => ({ armR: [150, -40, 0], armL: idle, head: [-25, 0, 0], torso: [10, 0, 0] }),
  gag: t => ({ torso: [48 + sin(t * 9) * 8, 0, sin(t * 34) * 4], head: [-30, 0, 0], armL: [55, -24, 0], armR: [140, -30, 0], legL: -8, legR: 8 }),
  stuff: t => ({ armR: [128 + sin(t * 15) * 16, -26, 0], armL: [52, -26 + sin(t * 6) * 10, 0], head: [6, 0, 0] }),
  lick: t => ({ armR: [152, -32, sin(t * 10) * 20], armL: idle, head: [-10, 0, 14] }),
  cower: () => ({ torso: [-14, 0, 0], armL: [130, 30, 0], armR: [130, 30, 0], head: [10, 0, 0] }),
  flap: (t, fall) => ({ armL: [10, 70 + sin(t * 26) * 40, 0], armR: [10, 70 + sin(t * 26) * 40, 0], torso: [80 * fall, 0, 0], legL: -30 * fall, legR: -30 * fall, lift: abs(sin(t * 13)) * 0.12 * (1 - fall) }),
};

// ---- marks
const BD = [5.0, -3.35];                                         // Mama Lu's Diner: Bean at the front of the sidewalk (his shadow stretches back across it)
const BS = [34.7, -4.3], PS = [36.05, -4.72], DS = [37.35, -3.95];   // donut shop: Bean, Mr. Pickle in the doorway, Dottie
const BB = [0.5, -3.75], MB = [-0.85, -4.2], SHX = [2.9, 4.25];  // bus stop: Bean, Max; Bean's runaway shadow across the avenue
const DM = [23.4, 3.85], SHM = [24.6, 4.35];                     // market: Dottie at the fruit stand, the shadow beside her
const SHD = [32.7, -3.35];                                       // the shadow at the donut-shop window
const SIT = [75.6, 17.45], BP = [74.4, 15.9];                    // pier: the shadow sits on the edge (feet over the water); Bean
const GANG = { max: [71.4, 14.1], pickle: [72.6, 13.4], dottie: [73.4, 14.95] };  // the pursuers arrive on the pier
// cameras
const wall = (x, z) => ({ pos: [x + 0.95, 1.9, z + 3.1], look: [x + 0.55, 0.45, z - 0.8], fov: 52, focus: [x + 0.3, 0.9, z] });   // the character (left) and its shadow stretching back-right
const ground = (x, z, k = 1) => ({ pos: [x + 0.8 * k, 2.3 + 0.4 * k, z + 2.4 + 0.4 * k], look: [x + 0.75 * k, 0.25, z - 0.55 * k], fov: 54, focus: [x + 0.4, 0.4, z] });   // looking down at a shadow
const dinerWide = { pos: [8.2, 1.7, 0.6], look: [7.0, 1.2, -4.6], fov: 50, focus: 'bean' };
const shopTwo = { pos: [35.4, 1.55, 0.1], look: [35.35, 1.15, -4.4], fov: 50, focus: 'bean' };
const shopWide = { pos: [37.4, 2.3, 0.4], look: [35.4, 0.9, -4.6], fov: 54, focus: 'bean' };
const busTwo = { pos: [-0.1, 1.5, 0.3], look: [-0.15, 1.15, -4.0], fov: 52, focus: 'bean' };
const across = { pos: [4.6, 3.3, 1.1], look: [3.6, 0.1, 3.9], fov: 50, focus: [3.5, 0.3, 3.9] };
const pierWide = { pos: [71.0, 2.1, 10.2], look: [74.5, 0.6, 16.8], fov: 54, focus: [74.6, 0.6, 16.6] };
const pierGround = { pos: [78.6, 3.3, 13.4], look: [76.6, 0.15, 16.4], fov: 52, focus: [76.2, 0.4, 16.8] };

const CLOCKS = [[9.6, -4.6], [44.2, -4.6], [64.4, 4.7]];
export function setup(s) {
  const T = s.THREE;
  // the pickle donut: a copy of the city donut with green icing
  const pd = s.items = { pdonut: s.clone('Donut') }; pd.pdonut.traverse(o => { if (o.isMesh && o.name === 'DonutIce') { o.material = o.material.clone(); o.material.color.set('#7ac943'); } }); pd.pdonut.visible = false;
  s.rest.get(pd.pdonut).v = false;
  // Mr. Pickle's paper hat
  { const h = new T.Group(); const b = new T.Mesh(new T.BoxGeometry(0.25, 0.1, 0.13), new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 })); b.position.y = 0.3; h.add(b);
    const st = new T.Mesh(new T.BoxGeometry(0.255, 0.03, 0.135), new T.MeshStandardMaterial({ color: '#6fbf3a', roughness: 0.7 })); st.position.y = 0.28; h.add(st); s.pickle.head.add(h); }
  // street clocks: a post with a round face; the time is redrawn when it changes (story clock to 7:00)
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  const face = new T.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.5 });
  s.clock = { text: null, set(t) { if (t === this.text) return; this.text = t; const c = cv.getContext('2d'), late = t === '7:00';
    c.fillStyle = '#fff8e6'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.lineWidth = 14; c.strokeStyle = late ? '#e23b2e' : '#2a2d3a'; c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * PI; c.fillStyle = '#2a2d3a'; c.fillRect(128 + sin(a) * 100 - 4, 128 - cos(a) * 100 - 4, 8, 8); }
    c.fillStyle = late ? '#e23b2e' : '#2a2d3a'; c.font = 'bold 74px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 128, 118);
    c.font = 'bold 30px "DejaVu Sans", sans-serif'; c.fillText('PM', 128, 176); tex.needsUpdate = true; } };
  for (const [i, [x, z]] of CLOCKS.entries()) {
    const g = new T.Group(); g.name = 'StreetClock' + i; g.position.set(x, Y, z);
    const pole = new T.Mesh(new T.CylinderGeometry(0.07, 0.08, 2.8, 12), new T.MeshStandardMaterial({ color: '#2a2d3a', roughness: 0.5 })); pole.position.y = 1.4; g.add(pole);
    const rim = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.14, 32), new T.MeshStandardMaterial({ color: '#2a2d3a', roughness: 0.4 })); rim.rotation.x = PI / 2; rim.position.y = 3.05; g.add(rim);
    for (const sd of [1, -1]) { const f = new T.Mesh(new T.CircleGeometry(0.36, 32), face); f.position.set(0, 3.05, 0.075 * sd); if (sd < 0) f.rotation.y = PI; g.add(f); }
    s.add(g);
  }
  s.clock.set('6:30');
}

const ORDER = ['hook', 'copies', 'feel', 'rule', 'liealot', 'offer', 'yum', 'throwup', 'dancing', 'uhhuh', 'choc', 'never', 'licking', 'owe', 'goaway', 'leave', 'hedid',
  'nosnitch', 'fly', 'cool', 'there', 'ohno', 'sunset', 'market', 'donuts', 'flybean', 'bridge', 'alone', 'sorry', 'promise', 'confess', 'return', 'cameback',
  'proud', 'noticed', 'noshadow', 'where', 'whatshadow', 'button'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
const TIME = [[I.hook, '6:30'], [I.sunset, '6:45'], [I.market, '6:51'], [I.donuts, '6:54'], [I.bridge, '6:57'], [I.alone, '6:59'], [I.cameback, '7:00']];
export function base(s, c) {
  const i = I[c.id], T = c.T;
  // story clock: time on the street clocks and the sinking sun
  s.clock.set(TIME.filter(([k]) => i >= k).at(-1)[1]);
  const prog = clamp((i + c.u - I.liealot) / (I.cameback - I.liealot), 0, 1), e = smooth(prog);
  s.sky({ offset: SUN0.offset.map((v, k) => lerp(v, SUN1.offset[k], e)), color: hex(SUN0.color, SUN1.color, e), intensity: lerp(SUN0.intensity, SUN1.intensity, e), warmth: lerp(0.06, 0.14, e) });
  // who is where
  for (const n of ['bean', 'dottie', 'max', 'pickle']) s[n].hide();
  s.dottie.noShadow = true;                                                                   // she never had one
  if ((i > I.leave || (i === I.leave && c.u > 0.85)) && i < I.return) s.bean.noShadow = true;     // Bean's shadow is out on its own
  for (const n of ['Scooter', 'Bike', 'Cop0', 'Cop1', 'Cop2', 'Package', 'BirthdayCake', 'Phone', 'Ticket', 'Cash', 'Donut', 'Party', 'Banner']) { const o = s.obj(n); if (o) o.visible = false; }
  s.balloons?.forEach(b => { b.visible = false; });
  s.obj('GateArm').rotation.x = -1.35; s.obj('BridgeL').rotation.z = 0; s.obj('BridgeR').rotation.z = 0;
  // silent city life
  const pier = i >= I.alone;
  { const L = 26, u = (T * 2.6 + 9) % (2 * L), fw = u < L, st = T * 10;
    stand(s.jog, [3 + (fw ? u : 2 * L - u), 4.1], fw ? 90 : -90).pose({ legL: sin(st) * 48, legR: -sin(st) * 48, armL: [-sin(st) * 50 + 25, 6, 0], armR: [sin(st) * 50 + 25, 6, 0], torso: [10, 0, 0], lift: abs(sin(st)) * 0.06 }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile' }); }
  { const L = 20, u = (T * 1.2 + 4) % (2 * L), fw = u < L; walkPose(stand(s.ped1, [12 + (fw ? u : 2 * L - u), -4.2], fw ? 90 : -90), T, 1, 6.5, 30).expr({ eyes: 'half', mouth: 'smile' }); }
  stand(s.ped2, [-3.4, -4.0], 20).pose({ armR: [70, 20, 0], head: [-14, 0, 0] }).expr({ eyes: 'half', mouth: 'flat', look: [0, -0.6] });
  stand(s.vendorF, [22, 3.5], 180).pose({ armL: [35, 20, 0], armR: [35 + sin(T * 2) * 8, 20, 0] }).expr({ eyes: 'happy', mouth: 'smile' });
  stand(s.vendorH, [30, -3.45], 0).pose({ armR: [60 + sin(T * 3) * 10, 10, 0] }).expr({ eyes: 'open', mouth: 'smile' });
  stand(s.cop, [31.4, -4.35], 20).pose({ armR: [112, 14, 0], head: [-6, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' }); carry(s, s.cop, s.obj('Donut'), 0.19, 0.6, -0.1);
  if (pier) for (const n of ['jog', 'ped1', 'ped2', 'vendorF', 'vendorH', 'cop']) s[n].hide();
  const tr = i < I.market || i > I.bridge;
  veh(s, 'Taxi', tr ? 46 - ((T * 6.5 + 20) % 84) : -30, tr ? -1.5 : -2.2, -90); veh(s, 'CarRed', tr ? 46 - ((T * 6.5 + 62) % 84) : 15.5, tr ? -1.5 : -2.2, -90);
  veh(s, 'CarMint', -9, -2.2); veh(s, 'CarBlue', 45.4, -2.2, -90);
  s.palms?.forEach((p, k) => { p.rotation.z = sin(T * 1.3 + k) * 0.035; p.rotation.x = sin(T * 0.9 + k * 2) * 0.03; });
  s.gulls?.forEach((g, k) => { const a = T * (0.7 + k * 0.13) + k * 1.7, cx = pier ? 75 : [8, 24, 60, 40][k], cz = pier ? 19 : 11; g.position.set(cx + cos(a) * (3 + k), 5 + k * 0.7 + sin(a * 2) * 0.3, cz + sin(a) * (2.5 + k * 0.5)); g.rotation.y = -a; });
}
const atDiner = s => stand(s.bean, BD, 0).pose({ armL: idle, armR: idle });
const atShop = (s, f = faceTo(BS, PS) - 25) => { stand(s.bean, BS, f).pose({ armL: idle, armR: idle }); return stand(s.pickle, PS, faceTo(PS, BS) - 15).pose({ armL: idle, armR: idle, head: [-10, 0, 0] }); };
const dottieAt = (s, p = DS, k = 1) => stand(s.dottie, [lerp(p[0] + 2.2, p[0], k), p[1]], faceTo(p, BS) + 10).pose({ armL: [48, -24, 0], armR: [48, -24, 0] });
const atBus = s => { stand(s.bean, BB, faceTo(BB, MB) + 30).pose({ armL: idle, armR: idle }); return stand(s.max, MB, faceTo(MB, BB) - 30).pose({ armL: idle, armR: idle, head: [-6, 0, 0] }); };
const sitShadow = (s, t, look = 0) => away(s, 'bean', SIT, 0, Y + 0.16).sit().pose({ torso: [14, 0, 0], head: [-24 + look * 20, look * 40, 0], armL: [40, 4, 0], armR: [40, 4, 0], legL: 80 + sin(t * 3) * 10, legR: 80 - sin(t * 3) * 10 });
const atPier = (s, f = faceTo(BP, SIT)) => stand(s.bean, BP, f).pose({ armL: idle, armR: idle });
const gang = (s, c, mood = {}) => { for (const [n, p] of Object.entries(GANG)) stand(s[n], p, faceTo(p, BP)).pose({ armL: idle, armR: idle }).expr(mood[n] ?? { eyes: 'half', brows: 'angry', mouth: 'flat' }); };
const bridge = (s, a) => { s.obj('BridgeL').rotation.z = a; s.obj('BridgeR').rotation.z = -a; s.obj('GateArm').rotation.x = -1.35 * (1 - sat(a * 4)); };

export const beats = [
  // ═════════ ACT 1 — the rules (Mama Lu's Diner, the shadow acts on the wall)
  { id: 'hook', line: 'L01', music: 'playful',
    shots: [wall(...BD), { on: 'bean', dist: 1.42, yaw: 10, pitch: 4 }, dinerWide],
    sfx: [{ at: 0.05, name: 'sting', gain: 0.4 }, { at: 'w:alive', name: 'boing', gain: 0.5 }],
    act(s, c) {
      atDiner(s); const look = seg(c.t, c.w('alive') - 0.3, c.w('alive'));
      s.bean.pose({ head: [-10 * look, -40 * look, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile', look: [0.6 * look, 0.2 * look] });
      own(s, 'bean').pose(P.wave(c.t));
    } },
  { id: 'copies', line: 'L02',
    shots: [dinerWide, wall(...BD), { on: 'bean', dist: 1.8, yaw: -16, pitch: 2 }],
    sfx: [{ at: 'w:well', name: 'scratch', gain: 0.6 }, { at: 'w:almost', name: 'boing', gain: 0.45 }],
    act(s, c) {
      atDiner(s); const w = c.w('well'), up = seg(c.t, 0.15, 0.4) * (1 - seg(c.t, w - 0.1, w + 0.05));
      s.bean.pose({ armR: [150 * up, 20, 0], armL: [150 * up, 20, 0], lift: sin(sat(c.t / 0.5) * PI) * 0.05 }).expr(c.t > w ? { eyes: 'half', brows: 'skeptic', mouth: 'flat', look: [0.6, 0.2] } : { eyes: 'happy', brows: 'raised', mouth: 'grin' });
      if (c.t > w) own(s, 'bean').pose(P.dance(c.t));
    } },
  { id: 'feel', line: 'L02b',
    shots: [{ on: 'bean', dist: 1.35, yaw: 12, pitch: 4 }, wall(...BD), { ...wall(...BD), pos: [7.0, 1.5, -2.0] }],
    sfx: [{ at: 'w:shakes', name: 'rumble', gain: 0.5 }, { at: 'w:dances', name: 'boing', gain: 0.5 }],
    act(s, c) {
      atDiner(s); const sc = c.t > c.w('scared') && c.t < c.w('happy'), hp = c.t >= c.w('happy');
      s.bean.pose({ armL: sc ? [70, -30, 0] : idle, armR: sc ? [70, -30, 0] : idle, torso: [0, 0, sc ? sin(c.t * 50) * 2 : 0] })
        .expr(sc ? { eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true } : hp ? { eyes: 'happy', brows: 'raised', mouth: 'grin' } : { eyes: 'open', brows: 'raised', mouth: 'smile' });
      own(s, 'bean').pose(sc ? P.shake(c.t) : hp ? P.dance(c.t) : { armL: idle, armR: idle });
    } },
  { id: 'rule', line: 'L03',
    shots: [{ on: 'bean', dist: 1.22, yaw: -8, pitch: 2 }, wall(...BD), { on: 'bean', dist: 1.01, yaw: 14, pitch: 1 }],
    sfx: [{ at: 'w:never', name: 'thud', gain: 0.7 }],
    act(s, c) {
      atDiner(s); const n = seg(c.t, c.w('never') - 0.1, c.w('never') + 0.1);
      s.bean.pose({ armR: [60 + 60 * n, -10, 0] }).expr({ eyes: 'open', brows: n > 0.5 ? 'angry' : 'neutral', mouth: n > 0.5 ? 'teeth' : 'flat' });
      own(s, 'bean').pose(P.cross(c.t, n));
    } },
  { id: 'liealot', line: 'L04',
    shots: [{ on: 'bean', dist: 1.15, yaw: 18, pitch: 3 }, wall(...BD)],
    sfx: [{ at: 'w:lie', name: 'wah', gain: 0.6 }],
    act(s, c) {
      atDiner(s); const l = seg(c.t, c.w('because') - 0.1, c.w('because') + 0.1);
      s.bean.pose({ armR: [70 * l, -20, 0], head: [0, 0, 10 * l], torso: [0, 0, 4 * l] }).expr(l > 0.5 ? { eyes: 'happy', brows: 'worried', mouth: 'teeth', sweat: true, blush: 0.5 } : { eyes: 'half', brows: 'sad', mouth: 'frown' });
      own(s, 'bean').pose(P.palm());
    } },
  // ═════════ the lies (donut shop)
  { id: 'offer', line: 'N01',
    shots: [{ on: 'pickle', dist: 1.5, yaw: 40, pitch: -2 }, shopTwo, { on: 'pickle', dist: 1.3, yaw: 55, pitch: -3 }],
    sfx: [{ at: 0.02, name: 'ding', gain: 0.5 }, { at: 'w:pickle', name: 'boing', gain: 0.45 }],
    act(s, c) {
      const pk = atShop(s), k = easeOut(seg(c.t, 0.1, 0.5)), p = c.t > c.w('pickle');
      pk.pose({ armR: [80 * k, 6, 0], torso: [8 * k, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); carry(s, s.pickle, s.items.pdonut, 0.12 + 0.2 * k, 0.5 + 0.06 * k, -0.12);
      s.bean.pose({ head: [12, 0, 0] }).expr({ eyes: p ? 'wide' : 'open', brows: p ? 'worried' : 'raised', mouth: p ? 'flat' : 'smile' });
    } },
  { id: 'yum', line: 'L06',
    shots: [{ on: 'bean', dist: 1.28, yaw: -10, pitch: 3 }, wall(...BS), { on: 'bean', dist: 1.05, yaw: 16, pitch: 2 }],
    sfx: [{ at: 0.03, name: 'chomp' }, { at: 'w:delicious', name: 'gurgle', gain: 0.6 }],
    act(s, c) {
      atShop(s).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' }); const th = seg(c.t, c.w('wow') - 0.1, c.w('wow') + 0.1);
      s.bean.pose({ armR: [c.t < 0.35 ? 120 : 110 * th, c.t < 0.35 ? -20 : 10, 0], head: [12, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: c.t < 0.35 ? 'o' : 'grin', blush: 0.4, sweat: c.t > 0.8 });
      if (c.t < 0.35) carry(s, s.bean, s.items.pdonut, 0.22, 0.62, -0.05);
      own(s, 'bean').pose(P.gag(c.t));
    } },
  { id: 'throwup', line: 'L07',
    shots: [ground(...BS), { on: 'pickle', dist: 1.45, yaw: 45, pitch: -2 }],
    sfx: [{ at: 0.05, name: 'gurgle', gain: 0.55 }],
    act(s, c) {
      atShop(s).pose({ head: [-30, 30, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'flat', look: [-0.4, 0.8] });
      s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'grin', sweat: true }); own(s, 'bean').pose(P.gag(c.t + 1));
    } },
  { id: 'dancing', line: 'L08',
    shots: [shopWide, { on: 'bean', dist: 1.22, yaw: 8, pitch: 3 }],
    sfx: [{ at: 'w:dancing', name: 'boing', gain: 0.55 }],
    act(s, c) {
      atShop(s).pose({ head: [-16, 0, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      const d = seg(c.t, c.w('dancing') - 0.1, c.w('dancing')), st = c.t * 12;
      s.bean.pose({ armL: [150 * d + sin(st) * 20 * d, 30, 0], armR: [150 * d - sin(st) * 20 * d, 30, 0], torso: [0, 0, sin(st) * 10 * d], legL: sin(st) * 20 * d, lift: abs(sin(st)) * 0.04 * d })
        .expr({ eyes: 'happy', brows: 'worried', mouth: 'teeth', sweat: true });
      own(s, 'bean').pose(P.gag(c.t + 2));                                                    // …still gagging
    } },
  { id: 'uhhuh', line: 'L08b', min: 0.8,
    shots: [{ on: 'pickle', dist: 1.4, yaw: 45, pitch: -3 }],
    act(s, c) {
      atShop(s).pose({ armL: [48, -24, 0], armR: [48, -24, 0], head: [-12, 0, 8] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      s.bean.pose({ armL: [150, 30, 0], armR: [150, 30, 0] }).expr({ eyes: 'happy', brows: 'worried', mouth: 'teeth', sweat: true }); own(s, 'bean').pose(P.gag(c.t + 3));
    } },
  { id: 'choc', line: 'L09',
    shots: [{ on: 'dottie', dist: 1.6, yaw: 40, pitch: 2, anchor: 0.6 }, shopTwo, { on: 'dottie', dist: 1.2, yaw: 50, pitch: 1 }],
    sfx: [{ at: 0.02, name: 'step', gain: 0.5 }, { at: 0.2, name: 'step', gain: 0.5 }, { at: 'w:chocolate', name: 'sting', gain: 0.35 }],
    act(s, c) {
      stand(s.bean, BS, faceTo(BS, DS)).pose({ armL: idle, armR: idle }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
      dottieAt(s, DS, easeOut(seg(c.t, 0, 0.4))).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' });
    } },
  { id: 'never', line: 'L10',
    shots: [{ on: 'bean', dist: 1.22, yaw: -40, pitch: 3 }, ground(...BS), { on: 'bean', dist: 1.05, yaw: -55, pitch: 3 }],
    sfx: [{ at: 'w:never', name: 'chomp', gain: 0.5 }],
    act(s, c) {
      dottieAt(s).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' });
      stand(s.bean, BS, faceTo(BS, DS)).pose({ armL: [110, 30, 0], armR: [110, 30, 0], head: [6, 0, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile', blush: 0.5 });
      own(s, 'bean').pose(P.stuff(c.t));                                                      // the shadow mimes stuffing its face
    } },
  { id: 'licking', line: 'L11',
    shots: [{ on: 'dottie', dist: 1.3, yaw: 45, pitch: 4 }, ground(...BS), { on: 'dottie', dist: 1.15, yaw: 55, pitch: 3 }],
    sfx: [{ at: 'w:licking', name: 'squeak', gain: 0.6 }],
    act(s, c) {
      const p = seg(c.t, c.w('shadow') - 0.1, c.w('shadow') + 0.1);
      dottieAt(s).pose({ armR: [50 * p, 0, 0], head: [-14 * p, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'teeth' });
      stand(s.bean, BS, faceTo(BS, DS)).pose({ head: [-26, 20, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true, look: [0.5, 0.8] });
      own(s, 'bean').pose(P.lick(c.t));
    } },
  { id: 'owe', line: 'L11b',
    shots: [{ on: 'dottie', dist: 1.3, yaw: 45, pitch: 2, shake: 0.4 }, shopTwo],
    sfx: [{ at: 'w:knew', name: 'thud', gain: 0.6 }, { at: -0.5, name: 'step', gain: 0.5 }, { at: -0.3, name: 'step', gain: 0.5 }],
    act(s, c) {
      const out = seg(c.t, c.dur - 0.7, c.dur);
      if (out <= 0) dottieAt(s).pose({ armR: [90, 0, 0], lift: abs(sin(c.t * 8)) * 0.02 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      else runTo(s.dottie, DS, [DS[0] + 2.4, DS[1] + 0.3], out, c.t, 9, 36).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' });
      stand(s.bean, BS, faceTo(BS, DS)).expr({ eyes: 'wide', brows: 'worried', mouth: 'wobble', sweat: true });
      own(s, 'bean').pose({ armL: [150, 20, 0], armR: [150, 20, 0], head: [-20, 0, 0] });                  // the shadow: guilty, hands up
    } },
  { id: 'goaway', line: 'L12',
    shots: [{ on: 'bean', dist: 1.25, yaw: -60, pitch: 3, shake: 0.4 }, wall(...BS), { on: 'bean', dist: 1.05, yaw: -80, pitch: 2, shake: 0.5 }],
    sfx: [{ at: 'w:away', name: 'thud' }],
    act(s, c) {
      stand(s.bean, BS, 120).pose({ armL: idle, armR: [90, 0, 0], head: [-16, 0, 0], torso: [8, 0, 0], lift: abs(sin(c.t * 9)) * 0.02 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      own(s, 'bean', 120).pose(P.cower());
    } },
  { id: 'leave', dur: 1.8, focus: [35.8, 0.6, -4.7],
    shots: [{ ...ground(...BS, 1.25), dolly: [0.4, 0, 0] }, { pos: [34.0, 1.35, -1.6], look: 'bean', fov: 44, focus: 'bean' }],
    sfx: [{ at: 0.15, name: 'slide', gain: 0.5 }],
    act(s, c) {
      stand(s.bean, BS, 120).pose({ armL: idle, armR: [90 * (1 - seg(c.t, 0.2, 0.6)), 0, 0], head: [-20, 0, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'flat', look: [0.6, 0.6] });
      const u = seg(c.t, 0.3, 1.8), sh = s.shadow('bean'); sh.group.visible = true;
      walkPose(sh.at(lerp(BS[0], BS[0] + 2.6, u), lerp(BS[1], BS[1] + 0.35, u), 95, Y), c.t, u > 0 && u < 1 ? 1 : 0, 5, 22).pose({ head: [-24, 0, 0], torso: [10, 0, 0] });
      if (c.u > 0.85) sh.hide();
    } },
  { id: 'hedid', line: 'L13',
    shots: [ground(...BS), { on: 'bean', dist: 1.15, yaw: -10, pitch: 6 }],
    act(s, c) { stand(s.bean, BS, 80).pose({ armL: idle, armR: idle, head: [-24, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0.5, 0.8] }); } },
  // ═════════ ACT 2 — no shadow, no snitch … then the shadow starts talking
  { id: 'nosnitch', line: 'L14',
    shots: [{ on: 'bean', dist: 1.35, yaw: 4, pitch: 4 }, ground(...BS), { on: 'bean', dist: 1.08, yaw: -20, pitch: 6 }],
    sfx: [{ at: 'w:snitch', name: 'ding' }, { at: 'w:anything', name: 'sparkle' }],
    act(s, c) {
      const j = sin(sat((c.t - c.w('anything')) / 0.4) * PI);
      stand(s.bean, BS, 0).pose({ armL: [150 * (j > 0 ? 1 : 0.2), 30, 0], armR: [150 * (j > 0 ? 1 : 0.2), 30, 0], lift: j * 0.14 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
    } },
  { id: 'fly', line: 'L15',
    shots: [{ on: 'bean', dist: 1.35, yaw: 40, pitch: 4 }, busTwo, { on: 'bean', dist: 1.15, yaw: 55, pitch: 4 }],
    sfx: [{ at: 'w:fly', name: 'whoosh', gain: 0.5 }],
    act(s, c) {
      atBus(s).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' }); const f = seg(c.t, c.w('i', 1) - 0.1, c.w('i', 1) + 0.1);
      s.bean.pose({ armL: [80, f > 0.5 ? -40 : 60, 0], armR: [80, f > 0.5 ? -40 : 60, 0], head: [10, 0, f * 8] }).expr({ eyes: f > 0.5 ? 'half' : 'open', brows: 'raised', mouth: 'smirk' });
    } },
  { id: 'cool', line: 'L16',
    shots: [{ on: 'max', dist: 1.45, yaw: -45, pitch: 2 }, busTwo],
    sfx: [{ at: 0.05, name: 'sparkle', gain: 0.6 }],
    act(s, c) {
      atBus(s).pose({ armL: [150, 30, 0], armR: [150, 30, 0], lift: abs(sin(c.t * 8)) * 0.05 }).expr({ eyes: 'shock', brows: 'raised', mouth: 'grin' });
      s.bean.pose({ armL: [80, -40, 0], armR: [80, -40, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
    } },
  // re-hook: across the avenue, Bean's shadow is flapping its arms and falling on its face — it is telling everyone the truth
  { id: 'there', line: 'N02', music: 'stop',
    shots: [{ on: 'max', dist: 1.45, yaw: -50, pitch: 2 }, across, { ...across, pos: [2.0, 1.8, -1.2] }],
    sfx: [{ at: 'w:flapping', name: 'boing', gain: 0.5 }, { at: 'w:face', name: 'thud', gain: 0.8 }],
    act(s, c) {
      const m = atBus(s), pt = seg(c.t, c.w('shadow') - 0.2, c.w('shadow'));
      m.pose({ armR: [90 * pt, 20 * pt, 0], head: [0, 30 * pt, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      s.bean.pose({ armL: [80, -40, 0], armR: [80, -40, 0] }).expr({ eyes: 'half', brows: 'raised', mouth: 'smirk' });
      const fall = easeIn2(seg(c.t, c.w('falling') - 0.1, c.w('face')));
      away(s, 'bean', SHX, 300).pose(P.flap(c.t, fall));
    } },
  { id: 'ohno', line: 'N03',
    shots: [{ on: 'bean', dist: 1.25, yaw: 45, pitch: 3, shake: 0.4 }, across],
    sfx: [{ at: 0.05, name: 'sting', gain: 0.6 }],
    act(s, c) {
      atBus(s).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      s.bean.pose({ armL: [150, 30, 0], armR: [150, 30, 0], head: [0, 30, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      away(s, 'bean', [SHX[0] + 0.8 * seg(c.t, 0.3, c.dur), SHX[1]], 90).pose(P.wave(c.t));                // gets up, waves, wanders off down the avenue
    } },
  // the ticking clock
  { id: 'sunset', line: 'N04',
    shots: [{ pos: [8.4, 2.6, -3.3], look: [9.6, 3.05, -4.6], fov: 34, focus: [9.6, 3.05, -4.6] }, { on: 'bean', dist: 1.6, yaw: -30, pitch: 2 }, { pos: [-3.5, 1.4, 1.5], look: [20, 3.5, -2], fov: 50, focus: 'bean' }],
    sfx: [{ at: 0.05, name: 'tick', gain: 0.8 }, { at: 0.55, name: 'tick', gain: 0.8 }, { at: 1.05, name: 'tick', gain: 0.8 }, { at: 'w:forever', name: 'rumble', gain: 0.6 }],
    act(s, c) {
      stand(s.bean, [1.2, -3.7], 70).pose({ armL: idle, armR: idle, head: [18, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0.3, -0.4] });
    } },
  // chase, beat 1 — the market: the shadow tells Dottie about the second chocolate bar
  { id: 'market', line: 'N05', music: 'chase',
    shots: [ground(...SHM, 0.9), { on: 'dottie', dist: 1.35, yaw: 12, pitch: 2, shake: 0.3 }, { pos: [27.5, 1.3, 1.0], look: 'bean', track: true, fov: 48, focus: 'bean' }],
    sfx: [{ at: 'w:other', name: 'thud', gain: 0.6 }, { at: -0.4, name: 'whoosh', gain: 0.6 }],
    act(s, c) {
      stand(s.dottie, DM, 90).pose({ armL: [48, -24, 0], armR: [90 * seg(c.t, 0.3, 0.6), 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      away(s, 'bean', SHM, 270).pose(P.stuff(c.t + 2));
      runTo(s.bean, [19, 2.9], [27.5, 2.6], seg(c.t, 0.6, c.dur + 0.4), c.T).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
    } },
  // chase, beat 2 — the donut shop: the shadow gags at Mr. Pickle's window
  { id: 'donuts', line: 'N06',
    shots: [ground(...SHD), { on: 'pickle', dist: 1.45, yaw: 45, pitch: -2, shake: 0.4 }],
    sfx: [{ at: 0.02, name: 'gurgle', gain: 0.6 }, { at: 'w:hate', name: 'sting', gain: 0.5 }],
    act(s, c) {
      stand(s.pickle, PS, -60).pose({ armL: [140, 30, 0], armR: [140, 30, 0], head: [0, -20, 0] }).expr({ eyes: 'shock', brows: 'angry', mouth: 'scream' });
      away(s, 'bean', SHD, 30).pose(P.gag(c.t));
      runTo(s.bean, [31.5, -2.4], [37.5, -2.4], seg(c.t, 0.4, c.dur + 0.3), c.T).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
    } },
  // chase, beat 3 — everyone after Bean (staged in depth: camera ahead, pursuers piling up behind)
  { id: 'flybean', line: 'N07',
    shots: [{ on: 'bean', dist: 2.6, yaw: 0, pitch: 6, track: true }, { on: 'max', dist: 1.35, yaw: 20, pitch: 2, track: true }],
    sfx: [{ at: 0.05, name: 'whoosh' }, { at: 'w:fly', name: 'boing', gain: 0.5 }],
    act(s, c) {
      const x = 40 + 4.2 * c.t;
      runTo(s.bean, [x, 1.0], [x + 1, 1.0], 0.5, c.T, 13).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      runTo(s.max, [x - 1.6, 0.4], [x - 0.6, 0.4], 0.5, c.T + 0.3, 12).pose({ armL: [10, 70 + sin(c.T * 26) * 40, 0], armR: [10, 70 + sin(c.T * 26) * 40, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      runTo(s.dottie, [x - 2.8, 1.6], [x - 1.8, 1.6], 0.5, c.T + 0.6, 12).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      runTo(s.pickle, [x - 4.2, 0.9], [x - 3.2, 0.9], 0.5, c.T + 0.9, 10).pose({ armR: [150, 20, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
    } },
  // chase, beat 4 — the drawbridge goes up as the sun goes down; Bean leaps the gap, the others are stuck at the gate
  { id: 'bridge', line: 'N08', min: 2.6,
    shots: [{ pos: [54.0, 2.8, 14.5], look: 'bean', track: true, fov: 46, focus: 'bean' }, { on: 'bean', dist: 1.62, yaw: 30, pitch: 8, track: true }, { pos: [62.5, 1.0, 2.4], look: [48, 1.2, 0.6], fov: 44, focus: [48.4, 1.2, 0.6] }],
    sfx: [{ at: 0.05, name: 'creak' }, { at: 0.1, name: 'ding' }, { at: 0.5, name: 'ding' }, { at: 0.3, name: 'rumble' }, { at: 'w:sun', name: 'whoosh' }, { at: -0.35, name: 'thud' }],
    act(s, c) {
      const a = 0.36 * smooth(seg(c.t, 0, 1.2)); bridge(s, a);
      const u = seg(c.t, 0.1, c.dur - 0.1), x = lerp(45.5, 61.5, u), ta = Math.tan(a), tipL = 50 + 4 * cos(a), tipR = 58 - 4 * cos(a);
      let y = Y, air = false;
      if (x > 50 && x < tipL) y = (x - 50) * ta; else if (x >= tipL && x <= tipR) { const k = (x - tipL) / Math.max(0.01, tipR - tipL); y = 4 * sin(a) + sin(k * PI) * 0.9; air = true; } else if (x > tipR && x < 58) y = (58 - x) * ta; else if (x >= 58) y = 0;
      runTo(s.bean, [x, 1.2], [x + 1, 1.2], 0.5, c.T, 13, 48, y).pose(air ? { armL: [165, 30, 0], armR: [165, 30, 0], legL: 40, legR: -30 } : {}).expr(air ? { eyes: 'shock', brows: 'raised', mouth: 'scream' } : { eyes: 'angry', brows: 'worried', mouth: 'teeth', sweat: true });
      for (const [n, dx, z] of [['max', 0, 0.2], ['dottie', 0.7, 1.4], ['pickle', 1.4, 0.6]]) {
        const px = Math.min(lerp(40 - dx, 49, u * 1.6), 48.6 - dx * 0.5); runTo(s[n], [px, z], [px + 1, z], px < 48.6 - dx * 0.5 - 0.01 ? 0.5 : 1, c.T + dx, 12).pose(px >= 48.6 - dx * 0.5 - 0.01 ? { armL: [150, 30, 0], armR: [150, 30, 0] } : {}).expr({ eyes: 'shock', brows: 'worried', mouth: 'o' }); }
    } },
  // ═════════ ACT 3 — the pier at sunset
  { id: 'alone', line: 'N09', music: 'tender',
    shots: [pierWide, pierGround, { on: 'bean', dist: 1.28, yaw: 30, pitch: 4 }],
    sfx: [{ at: 'w:alone', name: 'plink', note: 0 }],
    act(s, c) {
      const u = seg(c.t, 0, c.w('the') + 0.2); runTo(s.bean, [70.6, 12.6], BP, u, c.T, 6, 22).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' }); if (u >= 1) atPier(s);
      sitShadow(s, c.T);
    } },
  { id: 'sorry', line: 'L24',
    shots: [{ on: 'bean', dist: 1.28, yaw: 50, pitch: 2 }, pierGround, { on: 'bean', dist: 1.08, yaw: -55, pitch: 1 }],
    act(s, c) {
      atPier(s).pose({ torso: [14, 0, 0], head: [-10, 0, 0], armL: [30, 0, 0], armR: [30, 0, 0] }).expr({ eyes: 'sad', brows: 'sad', mouth: 'frown' });
      sitShadow(s, c.T, seg(c.t, c.w('truth') - 0.2, c.w('truth') + 0.2));
    } },
  { id: 'promise', line: 'L25',
    shots: [{ on: 'bean', dist: 1.15, yaw: -60, pitch: 2 }, pierWide],
    sfx: [{ at: 'w:promise', name: 'shimmer', gain: 0.6 }],
    act(s, c) {
      const h = easeOut(seg(c.t, 0.1, 0.5)); atPier(s).pose({ armR: [80 * h, 6, 0], torso: [8, 0, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'smile' });
      sitShadow(s, c.T, 1).pose({ legL: 80, legR: 80 });
    } },
  // the confession — the pursuers have caught up
  { id: 'confess', line: 'N10',
    shots: [{ on: 'bean', dist: 1.4, yaw: 40, pitch: 2 }, { on: 'max', dist: 1.4, yaw: -30, pitch: 2, focus: 'max' }, { on: 'pickle', dist: 1.45, yaw: -20, pitch: -2, focus: 'pickle' }, { on: 'dottie', dist: 1.35, yaw: 30, pitch: 2, focus: 'dottie' }],
    sfx: [{ at: 'w:fly', name: 'wah', gain: 0.5 }, { at: 'w:terrible', name: 'thud', gain: 0.5 }, { at: 'w:both', name: 'sting', gain: 0.4 }],
    act(s, c) {
      const fly = c.t > c.w('fly'), terr = c.t > c.w('terrible'), both = c.t > c.w('both');
      gang(s, c, { max: fly ? { eyes: 'sad', brows: 'sad', mouth: 'frown' } : { eyes: 'half', brows: 'angry', mouth: 'flat' },
        pickle: terr ? { eyes: 'shock', brows: 'raised', mouth: 'o' } : { eyes: 'half', brows: 'angry', mouth: 'flat' },
        dottie: both ? { eyes: 'angry', brows: 'angry', mouth: 'teeth' } : { eyes: 'half', brows: 'angry', mouth: 'flat' } });
      if (terr) s.pickle.pose({ armL: [100, -30, 0], armR: [100, -30, 0] });
      atPier(s, faceTo(BP, GANG.pickle)).pose({ armL: [30, -10, 0], armR: [30, -10, 0], head: [-6, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', blush: 0.4 });
      sitShadow(s, c.T, 1).pose({ head: [0, 60, 0] });
    } },
  { id: 'return', dur: 1.5, focus: [75.0, 0.5, 16.6],
    shots: [pierGround, pierWide],
    sfx: [{ at: 0.2, name: 'whoosh', gain: 0.6 }, { at: 1.1, name: 'ding' }, { at: 1.15, name: 'pop' }, { at: 1.2, name: 'sparkle' }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'wide', brows: 'raised', mouth: 'o' }, pickle: { eyes: 'wide', brows: 'raised', mouth: 'o' }, dottie: { eyes: 'half', brows: 'neutral', mouth: 'flat' } });
      atPier(s, faceTo(BP, SIT)).pose({ armR: [80, 6, 0] }).expr({ eyes: c.t > 1.1 ? 'happy' : 'wide', brows: 'raised', mouth: c.t > 1.1 ? 'grin' : 'o' });
      if (c.t < 0.25) { sitShadow(s, c.T).pose({ legL: 40, legR: 40 }); return; }
      const u = easeInOut(seg(c.t, 0.25, 1.1)), sh = s.shadow('bean'); sh.group.visible = true;
      walkPose(sh.at(lerp(SIT[0], BP[0], u), lerp(SIT[1] - 0.3, BP[1], u), faceTo(SIT, BP), Y), c.T, u < 1 ? 1 : 0, 11, 44);
      if (u >= 1) sh.free = false;                                                        // home: back to copying Bean
    } },
  { id: 'cameback', line: 'L26', music: 'playful',
    shots: [ground(...BP, 1.5), { on: 'bean', dist: 1.28, yaw: 10, pitch: 4 }],
    sfx: [{ at: 'w:back', name: 'ding' }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'happy', brows: 'raised', mouth: 'grin' }, pickle: { eyes: 'happy', brows: 'raised', mouth: 'smile' }, dottie: { eyes: 'happy', brows: 'raised', mouth: 'smile' } });
      const j = sin(sat((c.t - 0.05) / 0.45) * PI);
      atPier(s, 20).pose({ armL: [150, 30, 0], armR: [150, 30, 0], lift: j * 0.16, legL: 30 * j, legR: 30 * j }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
    } },
  // ═════════ the twist
  { id: 'proud', line: 'L27',
    shots: [{ on: 'dottie', dist: 1.28, yaw: -40, pitch: 2 }, { on: 'bean', dist: 1.49, yaw: 40, pitch: 2 }],
    sfx: [{ at: 0.02, name: 'step', gain: 0.4 }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'happy', brows: 'raised', mouth: 'smile' }, pickle: { eyes: 'happy', brows: 'raised', mouth: 'smile' } });
      atPier(s, faceTo(BP, GANG.dottie)).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      s.dottie.pose({ armL: [20, -20, 0], armR: [20, -20, 0], head: [0, 0, -8] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'noticed', line: 'L28', music: 'stop',
    shots: [{ on: 'bean', dist: 1.15, yaw: 40, pitch: 2 }, { on: 'bean', dist: 1.01, yaw: 30, pitch: 1, up: -0.03 }],
    sfx: [{ at: 0.1, name: 'rumble', gain: 0.6 }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'happy', brows: 'raised', mouth: 'smile' }, pickle: { eyes: 'happy', brows: 'raised', mouth: 'smile' }, dottie: { eyes: 'happy', brows: 'raised', mouth: 'smile' } });
      const d = seg(c.t, 0.3, 1.0); atPier(s, faceTo(BP, GANG.dottie)).pose({ head: [-24 * d, 0, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'flat', look: [0, 0.7 * d] });
    } },
  // everyone's long sunset shadow stretches across the planks … except hers
  { id: 'noshadow', line: 'L29',
    shots: [{ pos: [69.8, 3.4, 11.0], look: [73.6, 0.2, 13.8], fov: 54, focus: 'dottie' }, { ...ground(...GANG.dottie, 1.3), focus: [73.6, 0.8, 14.6] }, { pos: [70.6, 2.4, 10.6], look: [73.2, 0.6, 14.6], fov: 50, focus: 'dottie' }],
    sfx: [{ at: 'w:shadow', name: 'sting', gain: 0.8 }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'open', brows: 'neutral', mouth: 'smile' }, pickle: { eyes: 'open', brows: 'neutral', mouth: 'smile' }, dottie: { eyes: 'happy', brows: 'raised', mouth: 'smile' } });
      atPier(s, faceTo(BP, GANG.dottie)).pose({ head: [-18, 0, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'o', look: [0, 0.6] });
    } },
  { id: 'where', line: 'L30',
    shots: [{ on: 'bean', dist: 1.15, yaw: 40, pitch: 2, shake: 0.4 }, { on: 'dottie', dist: 1.28, yaw: -30, pitch: 0 }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'wide', brows: 'raised', mouth: 'o' }, pickle: { eyes: 'wide', brows: 'raised', mouth: 'o' }, dottie: { eyes: 'happy', brows: 'raised', mouth: 'smile' } });
      atPier(s, faceTo(BP, GANG.dottie)).pose({ armL: [30, 10, 0], armR: [30, 10, 0], torso: [-6, 0, sin(c.t * 40) * 1.5] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true });
    } },
  { id: 'whatshadow', line: 'L31',
    shots: [{ on: 'dottie', dist: 1.22, yaw: -30, pitch: 0 }, { on: 'dottie', dist: 0.97, yaw: -6, pitch: -2 }],
    sfx: [{ at: 'w:dont', name: 'sting', gain: 0.5 }],
    act(s, c) {
      gang(s, c, { max: { eyes: 'wide', brows: 'raised', mouth: 'o' }, pickle: { eyes: 'wide', brows: 'raised', mouth: 'o' } });
      atPier(s, faceTo(BP, GANG.dottie)).pose({ armL: [30, 10, 0], armR: [30, 10, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble' });
      const w = seg(c.t, c.w('dont') - 0.15, c.w('dont') + 0.05), f0 = faceTo(GANG.dottie, BP);
      s.dottie.at(...GANG.dottie, lerp(f0, 0, w), Y).pose({ armL: [20, -20, 0], armR: [lerp(20, 120, w), lerp(-20, -30, w), 0], torso: [12 * w, 0, 0], head: [-8 * w, 0, 6 * w] })
        .expr(w > 0.5 ? { eyes: 'half', brows: 'angry', mouth: 'smirk' } : { eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'button', dur: 0.8, focus: 'dottie',
    shots: [{ on: 'dottie', dist: 0.89, yaw: 0, pitch: -2 }],
    sfx: [{ at: 0.05, name: 'boom', gain: 0.6 }],
    act(s, c) {
      gang(s, c); atPier(s, faceTo(BP, GANG.dottie));
      s.dottie.at(...GANG.dottie, 0, Y).pose({ armL: [20, -20, 0], armR: [120, -30, 0], torso: [12, 0, 0], head: [-8, 0, 6] }).expr({ eyes: 'half', brows: 'angry', mouth: 'smirk' });
    } },
];
function easeIn2(t) { return t * t; }
