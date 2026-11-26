// EP02 — "We found a wallet with $100"   (block-style characters, four locations on the STREET set, daylight)
// Locations along the street (x): PARK -5.5 · MR. PICKLE'S HOUSE door at x=1 · CANDY SHOP door at x=9 · CANDY FANTASY x=30.
import { seg, smooth, easeOut, easeInOut, backOut, lerp, sat } from '../../web/src/engine/util.js';

const HEAD = { type: 'box', w: 0.25, h: 0.22, d: 0.22 };
export const characters = {
  bean:   { model: 'char2_bean',   scale: 1.0,  skin: '#F7C59A', head: HEAD },
  dottie: { model: 'char2_dottie', scale: 1.1,  skin: '#F2B890', head: HEAD },
  pickle: { model: 'char2_pickle', scale: 1.5,  skin: '#EDB48C', head: HEAD },
};
export const set = {
  model: 'street.glb', lighting: 'day',
  noCast: /^(Hill|Fan(Back|Side|Floor)|ShopGlass|GumGlobe|HWinGlass|ShopLight|LampHead|Road|Grass|Sidewalk|Curb|Far)/,
  bounds: { x: [-14, 40], y: [0.12, 6], z: [-4.2, 6] },
  lights: [{ color: '#ffd9a8', intensity: 14, pos: [8.2, 2.7, -4.2], distance: 7 }, { color: '#ffc890', intensity: 5, pos: [1.0, 2.0, -3.4], distance: 4 }],
  materials(m) {
    for (const [k, o] of [['shopglass', 0.16], ['gumglobe', 0.38]]) if (m[k]) { m[k].transparent = true; m[k].opacity = o; m[k].depthWrite = false; }
  },
};

const sin = Math.sin, PI = Math.PI;
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / Math.PI;
const mix2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const along = (pts, u) => { const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = L.reduce((a, b) => a + b, 0);
  let d = sat(u) * tot, i = 0; while (i < L.length - 1 && d > L[i]) d -= L[i++]; return { p: mix2(pts[i], pts[i + 1], L[i] ? d / L[i] : 0), h: faceTo(pts[i], pts[i + 1]) }; };
const walk = (ch, pts, u, t, rate = 7, swing = 34) => { const { p, h } = along(pts, u), mv = u > 0.001 && u < 0.999 ? 1 : 0, st = t * rate * PI;
  return ch.at(p[0], p[1], h).pose({ legL: sin(st) * swing * mv, legR: -sin(st) * swing * mv, armL: [-sin(st) * swing * 0.8 * mv, 6, 0], armR: [sin(st) * swing * 0.8 * mv, 6, 0], lift: Math.abs(sin(st)) * 0.02 * mv }); };

// ---- marks
const PB = [-5.6, 0.0], PD = [-4.95, 0.05];                         // park: Bean, Dottie
const HB = [0.6, -1.55], HD = [1.45, -1.5], HP = [0.85, -2.55];     // house: Bean, Dottie at the door; Mr. Pickle in the doorway
const SB = [0.4, 0.1], SD = [1.1, 0.12];                            // sidewalk in front of the house
const CB = [8.0, -0.3], CD = [8.9, -0.3], CP = [8.85, -2.5];        // candy shop: Bean, Dottie outside; Mr. Pickle in the doorway
const FD = [30, 0.4];                                               // candy fantasy
const lowCam = { pos: [1.12, 0.86, -2.9], look: 'dottie', fov: 38, focus: 'dottie' };     // from the doorway onto Dottie (Mr. Pickle is cheated out of this angle)
const sideCam = { pos: [-0.65, 1.1, -0.15], look: [1.0, 0.68, -1.9], fov: 46 };
const parkTwo = { pos: [-5.28, 0.78, 2.7], look: [-5.28, 0.62, 0], fov: 38 };
const dottieDoorCU = { on: 'dottie', dist: 0.72, yaw: -48, pitch: 3 };
const beanDoorCU = { on: 'bean', dist: 0.9, yaw: 58, pitch: 3 };

export function setup(s) {
  s.label('ShopSignFace', "MR. PICKLE'S CANDY", { w: 4.4, h: 0.62, color: '#FFF4D0', font: 'bold 168px "DejaVu Sans", sans-serif', px: 2048, emissive: 0.25 });
  s.label('MailboxFace', 'PICKLE', { w: 0.38, h: 0.14, color: '#fff', font: 'bold 150px "DejaVu Sans", sans-serif', px: 512 });
  const grip = (name, pos, rot = [0, 0, 0], sc = 1) => { const o = s.clone(name); o.position.set(...pos); o.rotation.set(...rot); o.scale.setScalar(sc); s.rest.get(o).p.copy(o.position); s.rest.get(o).q.copy(o.quaternion); s.rest.get(o).s.copy(o.scale); o.visible = false; s.rest.get(o).v = false; return o; };
  s.items = { walletBean: grip('Wallet', [0, -0.27, 0.05], [0.2, 0, 0], 1.25), walletPickle: grip('Wallet', [0, -0.27, 0.05], [0.2, 0, 0], 0.9),
    pickleP: grip('PickleProp', [0, -0.27, 0.06], [0.9, 0, 0], 1.0), pickleD: grip('PickleProp', [0, -0.3, 0.06], [0.2, 0, 0], 1.5) };
  // ID card insert (held up in front of the camera in the "belongs" beat)
  const holder = s.obj('Wallet').clone(false); holder.position.set(-5.6, 0.46, 0.43); holder.rotation.set(-0.72, 0, 0.03); s.scene.add(holder);
  s.label(holder, [], { w: 0.34, h: 0.215, bg: '#FBF3DC', px: 1024, draw(c, cv) {
    const W = cv.width, H = cv.height; c.fillStyle = '#3E7CB1'; c.fillRect(0, 0, W, H * 0.2); c.fillStyle = '#fff'; c.font = 'bold 84px "DejaVu Sans", sans-serif'; c.textAlign = 'left'; c.fillText('ID CARD', 40, H * 0.11);
    const x = 215, y = H * 0.6; c.fillStyle = '#EDB48C'; c.fillRect(x - 140, y - 150, 280, 300);                                    // blocky portrait of Mr. Pickle
    c.fillStyle = '#F1EFEA'; c.fillRect(x - 160, y - 110, 40, 120); c.fillRect(x + 120, y - 110, 40, 120); c.fillRect(x - 95, y + 30, 190, 42);
    c.strokeStyle = '#2B2B33'; c.lineWidth = 12; c.strokeRect(x - 112, y - 78, 92, 80); c.strokeRect(x + 20, y - 78, 92, 80); c.fillStyle = '#2a1d1a'; c.beginPath(); c.arc(x - 66, y - 36, 17, 0, 7); c.arc(x + 66, y - 36, 17, 0, 7); c.fill();
    c.fillStyle = '#2a1d1a'; c.font = 'bold 96px "DejaVu Sans", sans-serif'; c.fillText('MR. PICKLE', 420, H * 0.46); c.font = '62px "DejaVu Sans", sans-serif'; c.fillStyle = '#555'; c.fillText('1 Pickle Lane', 420, H * 0.66); c.fillText('Honest since 1952', 420, H * 0.83);
  } });
  s.idCard = holder; s.rest.set(holder, { p: holder.position.clone(), q: holder.quaternion.clone(), s: holder.scale.clone(), v: false }); holder.visible = false;
  s.rainY = Array.from({ length: 18 }, (_, i) => s.obj('FanRain' + i).position.y);
}

const ORDER = ['hook', 'keep', 'candy', 'belongs', 'think', 'fine', 'walk', 'knock', 'mywallet', 'deserve', 'rich', 'give', 'apickle', 'slam', 'right', 'nextday', 'owns', 'free', 'forever', 'faint', 'heridea', 'myidea'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
export function base(s, c) {
  const i = I[c.id];
  s.pickle.hide();
  for (const n of ['GlassShards', 'LemonStand']) if (s.obj(n)) s.obj(n).visible = false;      // props added to the street set for later episodes
  s.obj('HouseDoorPivot').rotation.y = 0;
  if (i >= I.mywallet && i <= I.apickle) { s.obj('HouseDoorPivot').rotation.y = 1.75; pickleAtDoor(s); }
}
const pickleAtDoor = s => { s.pickle.group.visible = true; return s.pickle.at(...HP, 0).pose({ armL: [0, 8, 0], armR: [0, 8, 0] }); };
const kidsAtDoor = s => { s.bean.at(...HB, 180).pose({ head: [22, 0, 0], armL: [0, 8, 0], armR: [0, 8, 0] }); s.dottie.at(...HD, 180).pose({ head: [22, 0, 0], armL: [0, 8, 0], armR: [0, 8, 0] }); };
const kidsAtShop = s => { s.bean.at(...CB, 180).pose({ head: [18, 0, 0], armL: [0, 8, 0], armR: [0, 8, 0] }); s.dottie.at(...CD, 180).pose({ head: [18, 0, 0], armL: [0, 8, 0], armR: [0, 8, 0] }); };
const parkPair = (s, c) => {
  s.bean.at(...PB, 8).hold('wallet', s.items.walletBean, true).pose({ armR: [78, 4, 0], armL: [0, 8, 0], head: [0, 0, 0] });
  s.dottie.at(...PD, -14).pose({ armL: [0, 8, 0], armR: [0, 8, 0] });
};
const lying = (ch, x, z, facing, k) => { ch.at(x, z, facing, 0.075 * k); ch.group.rotation.order = 'YXZ'; ch.group.rotation.x = -PI / 2 * k; return ch; };

export const beats = [
  // 1 ─ HOOK (park)
  { id: 'hook', line: 'L01', music: 'happy',
    shots: [{ on: 'bean', dist: 1.1, yaw: -5, pitch: 2 }, { on: 'bean', dist: 0.9, yaw: 16, pitch: -2 }, parkTwo],
    sfx: [{ at: 'w:hundred', name: 'kaching' }, { at: 'w:hundred', name: 'sparkle', gain: 0.6 }],
    act(s, c) {
      const h = c.w('hundred'), k = backOut(seg(c.t, h - 0.1, h + 0.2)), slide = easeOut(seg(c.t, h + 0.25, h + 0.75));
      s.bean.at(...PB, 8).hold('wallet', s.items.walletBean, true).pose({ armR: [70 + 40 * k, 4, 0], armL: [20 * k, 18 * k, 0], head: [4, 0, 4], lift: sin(sat((c.t - h) / 0.35) * PI) * 0.07 * (c.t > h ? 1 : 0) })
        .expr({ eyes: k > 0.5 ? 'shock' : 'wide', brows: 'raised', mouth: 'grin', blush: 0.5, look: [k > 0.5 ? 0 : 0.3, k > 0.5 ? 0 : 0.5] });
      s.dottie.at(lerp(-3.4, PD[0], slide), PD[1], -14).pose({ torso: [0, 0, -10 * (1 - slide)], armL: [0, 10, 0], armR: [0, 10, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o', look: [-0.6, 0.2] });
      if (slide <= 0) s.dottie.hide();
    } },
  // 2
  { id: 'keep', line: 'L02',
    shots: [{ on: 'dottie', dist: 1.0, yaw: 10, pitch: 2 }, parkTwo],
    sfx: [{ at: 0.05, name: 'pop', gain: 0.5 }],
    act(s, c) {
      parkPair(s, c); const n = c.w('nobody'), k = seg(c.t, n - 0.1, n + 0.1);
      s.dottie.pose({ torso: [8, 0, -6], head: [0, k ? sin((c.t - n) * 9) * 28 : 12, -6], armR: [k ? 0 : 40, 20, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'smirk', look: [k ? sin((c.t - n) * 9) * 0.9 : -0.6, 0] });
      s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', look: [0.7, 0] });
    } },
  // 3 ─ candy fantasy
  { id: 'candy', line: 'L03', music: 'dream', inFrame: [],
    shots: [{ pos: [30, 0.95, 2.9], look: [30, 0.85, -1.4], fov: 40, focus: 'dottie', dolly: [0, 0, -0.4] }, { on: 'dottie', dist: 1.0, yaw: -14, pitch: -10 }],
    sfx: [{ at: 0, name: 'shimmer' }, { at: 'w:all', name: 'sparkle' }, { at: 'w:candy', name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      s.bean.hide();
      const j = Math.abs(sin(c.t * 5.5));
      s.dottie.at(...FD, 0).pose({ lift: j * 0.1, armL: [165, 22 + sin(c.t * 11) * 10, 0], armR: [165, 22 - sin(c.t * 11) * 10, 0], head: [16, 0, sin(c.t * 5.5) * 6], auto: { blink: false } })
        .expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.8 });
      for (let i = 0; i < 18; i++) { const o = s.obj('FanRain' + i), ph = (c.T * 0.75 + i * 0.137) % 1; o.position.y = s.rainY[i] - ph * 3.4; o.rotation.x = c.T * 3 + i; }
    } },
  // 4 ─ it belongs to Mr. Pickle (ID card insert)
  { id: 'belongs', line: 'L04', music: 'happy',
    shots: [{ on: 'bean', dist: 1.0, yaw: 12, pitch: 2 }, { pos: [-5.6, 1.27, 1.32], look: [-5.6, 0.46, 0.43], fov: 36, focus: [-5.6, 0.46, 0.43], dolly: [0, -0.05, -0.06] }],
    sfx: [{ at: 'w:mister', name: 'ding', gain: 0.5 }],
    act(s, c) {
      parkPair(s, c); const m = c.w('it'), show = c.t > m - 0.15;
      s.bean.hold('wallet', null, false).pose({ armR: [62, -6, 0], armL: [62, -6, 0], head: [-18, 0, 0], torso: [4, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0, 0.6] });
      s.dottie.pose({ head: [0, 20, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'flat', look: [-0.7, 0.3] });
      s.idCard.visible = show;
    } },
  // 5 ─ Bean looks at Dottie. Dottie looks away.
  { id: 'think', dur: 1.5, focus: 'bean', inFrame: [],
    shots: [{ ...parkTwo, dolly: [0, 0, -0.25] }],
    sfx: [{ at: 0.2, name: 'plink', note: 0 }, { at: 0.75, name: 'plink', note: 2 }],
    act(s, c) {
      parkPair(s, c); const k = seg(c.t, 0.15, 0.45), k2 = seg(c.t, 0.7, 1.0);
      s.bean.pose({ head: [0, -42 * k, 0], armR: [60, 4, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0.5 * k, 0] });
      s.dottie.pose({ head: [6 * k2, 40 * k2 - 20, 0], armL: [50 * k2, -30 * k2 + 8, 0], armR: [50 * k2, -30 * k2 + 8, 0] }).expr({ eyes: k2 > 0.5 ? 'closed' : 'half', brows: k2 > 0.5 ? 'angry' : 'neutral', mouth: 'frown' });
    } },
  // 6 ─ ugh, FINE
  { id: 'fine', line: 'L05',
    shots: [{ on: 'dottie', dist: 1.0, yaw: 12, pitch: 2 }, parkTwo, { on: 'dottie', dist: 0.85, yaw: -18, pitch: -2 }],
    sfx: [{ at: 'w:reward', name: 'ding', gain: 0.5 }],
    act(s, c) {
      parkPair(s, c); const f = c.w('fine'), b = c.w('but'), k = seg(c.t, f - 0.1, f + 0.15), r = backOut(seg(c.t, c.w('reward') - 0.15, c.w('reward') + 0.1));
      s.dottie.pose({ head: [c.t < b ? 14 * k : 0, c.t < b ? 30 * (1 - k) : -8, 0], torso: [0, 0, c.t < b ? 5 : 0], armL: [c.t < b ? 50 : 0, c.t < b ? -22 : 8, 0], armR: [c.t < b ? 50 : 150 * r, c.t < b ? -22 : 8, 0] })
        .expr(c.t < b ? { eyes: k > 0.5 ? 'half' : 'closed', brows: 'angry', mouth: 'frown', look: [0, -0.9] } : { eyes: 'open', brows: 'angry', mouth: 'smirk' });
      s.bean.pose({ head: [0, -30, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  // 7 ─ walk up to the house
  { id: 'walk', dur: 1.7, music: 'comedy', focus: 'bean', inFrame: [],
    shots: [{ pos: [1.0, 1.15, 3.6], look: [1.0, 1.15, -2.4], fov: 46, dolly: [0, 0, -0.5] }],
    sfx: [0, 1, 2, 3, 4, 5].map(i => ({ at: 0.15 + i * 0.24, name: 'step', gain: 0.6 })),
    act(s, c) {
      const u = easeInOut(seg(c.t, 0, 1.6));
      walk(s.bean, [[-0.9, 0.3], [0.5, -0.3], HB], u, c.t).hold('wallet', s.items.walletBean, true).pose({ armR: [50, 4, 0] });
      walk(s.dottie, [[-0.1, 0.6], [1.4, -0.2], HD], u, c.t + 0.13).pose({ torso: [8, 0, 0] });
    } },
  // 8 ─ knock knock
  { id: 'knock', dur: 1.6, focus: 'bean', inFrame: [],
    shots: [{ ...sideCam, dolly: [0.12, 0, -0.1] }],
    sfx: [{ at: 0.25, name: 'knock' }, { at: 0.5, name: 'knock' }, { at: 0.75, name: 'knock' }, { at: 1.15, name: 'creak' }],
    act(s, c) {
      kidsAtDoor(s); const kn = c.t < 0.95 ? Math.abs(sin((c.t - 0.12) * PI / 0.25)) : 0, open = easeOut(seg(c.t, 1.15, 1.55));
      s.bean.hold('wallet', s.items.walletBean, true).pose({ armR: [40, 4, 0], armL: [92 + kn * 22, 0, 0], head: [10, 0, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile' });
      s.dottie.pose({ armL: [50, -24, 0], armR: [50, -24, 0], head: [8, 20, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'frown' });
      s.obj('HouseDoorPivot').rotation.y = 1.75 * open; if (open > 0.3) pickleAtDoor(s).expr({ eyes: 'open', brows: 'raised', mouth: 'o' });
    } },
  // 9 ─ My wallet!
  { id: 'mywallet', line: 'L06',
    shots: [{ on: 'pickle', dist: 1.25, yaw: 3, pitch: 5 }, beanDoorCU, { on: 'pickle', dist: 0.95, yaw: -8, pitch: 2 }],
    sfx: [{ at: 0.05, name: 'boing', gain: 0.6 }, { at: 'w:everywhere', name: 'sparkle', gain: 0.5 }],
    act(s, c) {
      kidsAtDoor(s); const e = c.w('i'), take = seg(c.t, e - 0.1, e + 0.2), j = sin(sat(c.t / 0.4) * PI);
      s.bean.hold('wallet', s.items.walletBean, take < 0.5).pose({ armR: [112, 0, 0], head: [24, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ armL: [50, -24, 0], armR: [50, -24, 0], head: [20, 0, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'flat' });
      s.pickle.hold('wallet', s.items.walletPickle, take >= 0.5).pose({ lift: j * 0.08, armL: [lerp(150, 20, take), 20, 0], armR: [lerp(150, 78, take), 8, 0], head: [-12, 0, 0], torso: [6, 0, 0] })
        .expr({ eyes: take > 0.5 ? 'happy' : 'shock', brows: 'raised', mouth: 'grin', blush: 0.4 });
    } },
  // 10 ─ you honest kids deserve a reward
  { id: 'deserve', line: 'L07',
    shots: [{ on: 'pickle', dist: 1.05, yaw: -6, pitch: 4 }, { ...dottieDoorCU, focus: 'dottie' }],
    sfx: [{ at: 'w:reward', name: 'ding' }],
    act(s, c) {
      kidsAtDoor(s); const r = c.w('reward'), k = seg(c.t, r - 0.1, r + 0.1);
      s.pickle.hold('wallet', s.items.walletPickle, true).pose({ armR: [50, 8, 0], armL: [k * 150, 14, 0], head: [-14, 0, 5], torso: [8, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile', blush: 0.3 });
      s.bean.expr({ eyes: 'open', brows: 'raised', mouth: 'smile' });
      s.dottie.pose({ armL: [k ? 0 : 50, k ? 8 : -24, 0], armR: [k ? 0 : 50, k ? 8 : -24, 0], head: [22, 0, 0], lift: sin(k * PI) * 0.05 }).expr(k > 0.5 ? { eyes: 'shock', brows: 'raised', mouth: 'grin' } : { eyes: 'half', brows: 'neutral', mouth: 'flat' });
    } },
  // 11 ─ we're gonna be RICH
  { id: 'rich', line: 'L08',
    shots: [lowCam],
    sfx: [{ at: 'w:rich', name: 'kaching', gain: 0.7 }],
    act(s, c) {
      kidsAtDoor(s); const r = c.w('rich'), k = seg(c.t, r - 0.1, r + 0.1);
      s.dottie.at(HD[0] - 0.15, HD[1], 180).pose({ torso: [0, 0, 10], head: [8, 22, 0], armL: [30 + 60 * k, 10, 0], armR: [30 + 60 * k, 10, 0], lift: Math.abs(sin(c.t * 9)) * 0.03 })
        .expr({ eyes: k > 0.5 ? 'happy' : 'wide', brows: 'raised', mouth: 'whisper', blush: 0.6, look: [0.6, 0] });
      s.bean.expr({ eyes: 'open', brows: 'neutral', mouth: 'smile', look: [-0.5, 0] });
      s.pickle.hide();
    } },
  // 12 ─ drum roll… a pickle.
  { id: 'give', dur: 2.3, music: 'drumroll', focus: 'pickle', inFrame: [],
    shots: [{ on: 'pickle', dist: 1.0, yaw: -30, pitch: 0, up: -0.2, focus: 'pickle' }, { ...dottieDoorCU, focus: 'dottie' }],
    sfx: [{ at: 1.2, name: 'pop' }, { at: 1.3, name: 'wah' }],
    act(s, c) {
      kidsAtDoor(s); const out = c.t >= 1.2, k = backOut(seg(c.t, 1.2, 1.45));
      s.pickle.hold('pickle', s.items.pickleP, out).pose({ armR: out ? [40 + 55 * k, 6, 0] : [20 + sin(c.t * 14) * 8, 0, -30], armL: [0, 10, 0], head: [-14, 0, 0], torso: [8, 0, 0] })
        .expr({ eyes: 'happy', brows: 'raised', mouth: out ? 'grin' : 'smile', blush: 0.4 });
      const hope = Math.abs(sin(c.t * 10)) * 0.04 * (out ? 0 : 1);
      s.dottie.pose({ lift: hope, armL: [70, 16, 0], armR: [70, 16, 0], head: [22, 0, 0], auto: { blink: !out } }).expr(out ? { eyes: 'shock', brows: 'worried', mouth: 'flat' } : { eyes: 'wide', brows: 'raised', mouth: 'grin', blush: 0.7 });
      s.bean.expr(out ? { eyes: 'wide', brows: 'raised', mouth: 'o' } : { eyes: 'open', brows: 'raised', mouth: 'smile' });
    } },
  // 13 ─ A PICKLE?!
  { id: 'apickle', line: 'L09',
    shots: [{ ...dottieDoorCU, shake: 0.8 }, { ...beanDoorCU, focus: 'bean' }, { ...dottieDoorCU, dist: 0.62, yaw: -44, shake: 0.5 }],
    sfx: [{ at: 0.05, name: 'sting', gain: 0.5 }, { at: 'w:for', name: 'thud', gain: 0.7 }],
    act(s, c) {
      kidsAtDoor(s); const g = c.w('we'), f = c.w('for'), sh = sin(c.t * 26) * 9;
      s.dottie.hold('pickle', s.items.pickleD, true, 'L').pose({ armL: [c.t < g ? 165 : c.t < f ? 100 : 165, 14 + sh, 0], armR: [c.t < g ? 20 : 55, 22, 0], head: [c.t < g ? 26 : 12, 0, c.t < g ? 0 : 8], torso: [c.t < g ? -6 : 8, 0, 0], lift: c.t > f ? Math.abs(sin((c.t - f) * 12)) * 0.05 : 0, auto: { blink: false } })
        .expr({ eyes: 'angry', brows: 'angry', mouth: 'scream', sweat: true });
      s.bean.pose({ head: [14, 0, -8], torso: [0, 0, -6] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'wobble', look: [-0.8, 0], sweat: true });
      s.pickle.pose({ armL: [150, 24 + sin(c.t * 8) * 14, 0], head: [-14, 0, 6], torso: [8, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.4 });
    } },
  // 14 ─ door shuts. Dottie stares at the pickle.
  { id: 'slam', dur: 1.3, focus: 'dottie', inFrame: [],
    shots: [{ ...dottieDoorCU, focus: 'dottie' }],
    sfx: [{ at: 0.2, name: 'doorslam' }, { at: 0.75, name: 'squeak' }],
    act(s, c) {
      kidsAtDoor(s); s.pickle.hide(); s.obj('HouseDoorPivot').rotation.y = 1.75 * (1 - easeOut(seg(c.t, 0, 0.22)));
      s.dottie.hold('pickle', s.items.pickleD, true, 'L').pose({ armL: [84, 4, 0], armR: [0, 10, 0], head: [-16, 0, 0], auto: { blink: c.t > 0.7 } }).expr({ eyes: 'half', brows: 'angry', mouth: 'frown', look: [0, 0.8] });
      s.bean.pose({ head: [4, -30, 0] }).expr({ eyes: 'open', brows: 'worried', mouth: 'smile', look: [-0.5, 0.2] });
    } },
  // 15 ─ we did the right thing
  { id: 'right', line: 'L10',
    shots: [{ on: 'bean', dist: 1.0, yaw: -8, pitch: 2 }, { pos: [0.82, 0.8, 2.85], look: [0.82, 0.62, 0.1], fov: 40, focus: 'dottie' }],
    sfx: [{ at: -0.45, name: 'chomp', gain: 0.8 }],
    act(s, c) {
      const pat = seg(c.t, 0.3, 0.6), bite = seg(c.t, c.dur - 0.6, c.dur - 0.4);
      s.bean.at(...SB, 6).pose({ armL: [60 * pat, 40 * pat + 8, 0], armR: [0, 8, 0], head: [0, -24 * pat, 4] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      s.dottie.at(...SD, -6).hold('pickle', s.items.pickleD, true, 'L').pose({ armL: [lerp(40, 112, bite), -8 * bite + 6, 0], armR: [0, 8, 0], head: [-10 + 8 * bite, 0, 0], torso: [6, 0, 0] })
        .expr(bite > 0.5 ? { eyes: 'closed', brows: 'angry', mouth: 'o' } : { eyes: 'half', brows: 'angry', mouth: 'frown', look: [0, 0.5] });
    } },
  // 16 ─ the next day: the candy shop
  { id: 'nextday', dur: 1.9, music: 'happy', focus: [8.4, 3.2, -2.3], inFrame: [],
    shots: [{ pos: [8.4, 1.6, 5.6], look: [8.4, 2.0, -2.4], fov: 58, dolly: [0, -0.1, -0.8] }],
    sfx: [{ at: 0.1, name: 'ding' }, { at: 0.35, name: 'sparkle', gain: 0.6 }, ...[0, 1, 2, 3].map(i => ({ at: 0.6 + i * 0.25, name: 'step', gain: 0.5 }))],
    act(s, c) {
      const u = easeInOut(seg(c.t, 0.3, 1.8));
      walk(s.bean, [[6.6, 0.5], [7.6, 0.2], CB], u, c.t).pose({ head: [14 * u, 0, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
      walk(s.dottie, [[7.4, 0.8], [8.5, 0.3], CD], u, c.t + 0.1).pose({ head: [14 * u, 0, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  // 17 ─ wait… Mr. Pickle owns the CANDY shop?
  { id: 'owns', line: 'L11',
    shots: [{ on: 'bean', dist: 1.0, yaw: 34, pitch: -2 }, { pos: [8.4, 1.3, 4.6], look: [8.4, 3.1, -2.3], fov: 52, focus: [8.4, 3.25, -2.3], dolly: [0, 0.05, -0.3] }, { on: 'bean', dist: 0.85, yaw: 22, pitch: -4 }],
    sfx: [{ at: 'w:candy', name: 'shimmer' }],
    act(s, c) {
      kidsAtShop(s); const k = seg(c.t, c.w('candy') - 0.1, c.w('candy') + 0.1);
      s.bean.pose({ head: [26, 0, 6], armR: [k * 140, 10, 0] }).expr({ eyes: k > 0.5 ? 'shock' : 'wide', brows: 'raised', mouth: 'o', look: [0, -0.5] });
      s.dottie.pose({ head: [26, 0, 0], armL: [0, 12, 0], armR: [0, 12, 0] }).expr({ eyes: 'shock', brows: 'raised', mouth: 'o', look: [0, -0.5] });
    } },
  // 18 ─ honest kids eat free. FOREVER!
  { id: 'free', line: 'L12',
    shots: [{ on: 'pickle', dist: 1.15, yaw: -6, pitch: 4 }, { on: 'dottie', dist: 1.0, yaw: 32, pitch: 0, focus: 'dottie' }, { on: 'pickle', dist: 0.95, yaw: 10, pitch: 2 }],
    sfx: [{ at: 0, name: 'ding', gain: 0.6 }, { at: 'w:forever', name: 'kaching' }, { at: 'w:forever', name: 'sparkle' }],
    act(s, c) {
      kidsAtShop(s); const f = c.w('forever'), k = backOut(seg(c.t, f - 0.1, f + 0.2));
      s.pickle.group.visible = true;
      s.pickle.at(...CP, 0).pose({ armL: [k * 150, 30 * k + 8, 0], armR: [k * 150, 30 * k + 8, 0], head: [-12, 0, 0], torso: [6, 0, 0], lift: sin(sat((c.t - f) / 0.4) * PI) * 0.06 * (c.t > f ? 1 : 0) }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.5 });
      s.bean.pose({ head: [20, 0, 0], lift: k * 0.02 }).expr({ eyes: k > 0.5 ? 'happy' : 'wide', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ head: [20, 0, 0], auto: { blink: false } }).expr({ eyes: k > 0.5 ? 'shock' : 'wide', brows: 'raised', mouth: 'o' });
    } },
  // 19 ─ FOREVER?!
  { id: 'forever', line: 'L13',
    shots: [{ on: 'dottie', dist: 1.2, yaw: 32, pitch: 0, shake: 1, anchor: 0.1, up: -0.02 }, { on: 'dottie', dist: 1.0, yaw: 20, pitch: -4, shake: 0.6, anchor: 0.1, up: -0.02 }],
    sfx: [{ at: 0, name: 'sting', gain: 0.4 }],
    act(s, c) {
      kidsAtShop(s); s.pickle.group.visible = true; s.pickle.at(...CP, 0).pose({ armL: [150, 38, 0], armR: [150, 38, 0], head: [-12, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ armL: [170, 20 + sin(c.t * 30) * 8, 0], armR: [170, 20 - sin(c.t * 30) * 8, 0], head: [20, 0, 0], lift: Math.abs(sin(c.t * 8)) * 0.06, auto: { blink: false } }).expr({ eyes: 'shock', brows: 'raised', mouth: 'scream', blush: 0.8 });
      s.bean.pose({ head: [10, -40, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'smile' });
    } },
  // 20 ─ she faints
  { id: 'faint', dur: 1.4, focus: 'dottie', inFrame: [],
    shots: [{ pos: [7.9, 0.7, 2.5], look: [8.7, 0.38, 0.1], fov: 46, dolly: [0.08, 0, -0.2] }],
    sfx: [{ at: 0.05, name: 'slide' }, { at: 0.55, name: 'thud' }, { at: 0.7, name: 'plink', note: 4 }],
    act(s, c) {
      kidsAtShop(s); s.pickle.group.visible = true; s.pickle.at(...CP, 0).pose({ armL: [0, 10, 0], armR: [0, 10, 0], head: [-12, 0, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
      const k = Math.pow(seg(c.t, 0.1, 0.55), 2), b = c.t > 0.55 ? Math.abs(sin((c.t - 0.55) * 14)) * Math.exp(-(c.t - 0.55) * 7) * 0.08 : 0;
      lying(s.dottie, CD[0], CD[1] + 0.35 * k, 180, k).pose({ armL: [170 * (1 - k) + 20, 30, 0], armR: [170 * (1 - k) + 20, 30, 0], lift: b, auto: { blink: false, idle: 0 } }).expr({ eyes: k > 0.9 ? 'wince' : 'shock', brows: 'raised', mouth: k > 0.9 ? 'smile' : 'o', blush: 0.8 });
      s.bean.pose({ head: [-10 * k, -70, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o', look: [-0.3, 0.5] });
    } },
  // 21 ─ to camera
  { id: 'heridea', line: 'L14',
    shots: [{ on: 'bean', dist: 1.05, yaw: 4, pitch: 2, anchor: 0.6 }, { on: 'bean', dist: 0.8, yaw: -10, pitch: 1 }],
    sfx: [{ at: 0.05, name: 'pop', gain: 0.5 }],
    act(s, c) {
      const turn = easeOut(seg(c.t, 0, 0.25)), h = c.w('her'), k = seg(c.t, h - 0.1, h + 0.1);
      s.pickle.group.visible = true; s.pickle.at(...CP, 0).pose({ head: [-12, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      lying(s.dottie, CD[0], CD[1] + 0.35, 180, 1).pose({ armL: [20, 30, 0], armR: [20, 30, 0], auto: { idle: 0 } }).expr({ eyes: 'wince', brows: 'raised', mouth: 'smile', blush: 0.8 });
      s.bean.at(CB[0], CB[1] + 0.25, lerp(180, 0, turn) ).pose({ torso: [8, 0, 0], head: [0, 0, 6], armR: [k * 60, 60 * k + 8, 0], armL: [0, 8, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'whisper', look: [k * 0.6, 0] });
    } },
  // 22 ─ button
  { id: 'myidea', line: 'L15', pad: [0.1, 0.55], music: 'button',
    shots: [{ pos: [8.9, 1.75, -0.25], look: [8.9, 0.15, 0.72], fov: 40, focus: 'dottie', dolly: [0, -0.12, 0.03] }],
    sfx: [{ at: -0.4, name: 'ding', gain: 0.6 }],
    act(s, c) {
      s.pickle.hide(); s.bean.at(CB[0], CB[1] + 0.25, 0);
      const k = backOut(seg(c.t, 0.05, 0.3));
      lying(s.dottie, CD[0], CD[1] + 0.35, 180, 1).pose({ armR: [20 + 70 * k, 10, 0], armL: [20, 30, 0], auto: { idle: 0 } }).expr({ eyes: 'closed', brows: 'angry', mouth: 'smirk', blush: 0.8 });
    } },
];
