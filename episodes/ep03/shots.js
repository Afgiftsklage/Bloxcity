// EP03 — "I broke Mr. Pickle's window"   (1.5x episode: natural-pitch voices sped up 1.5x, cuts every 0.67–1.33 s)
// Three acts on the STREET set: candy shop front → lemonade stand in the park → chase → the bush by the shop → inside the shop.
// All times in this file are final (on-screen) seconds.
import { seg, smooth, easeOut, easeInOut, backOut, lerp, sat } from '../../web/src/engine/util.js';

const HEAD = { type: 'box', w: 0.25, h: 0.22, d: 0.22 };
const C2 = (model, scale, skin) => ({ model, scale, skin, head: HEAD });
export const characters = {
  bean: C2('char2_bean', 1.0, '#F7C59A'), dottie: C2('char2_dottie', 1.1, '#F2B890'), pickle: C2('char2_pickle', 1.5, '#EDB48C'),
  max: C2('char2_max', 1.2, '#C98A5E'), ana: C2('char2_ana', 1.15, '#F2C6A0'), leo: C2('char2_leo', 1.25, '#8D5B3F'),
};
export const set = {
  model: 'street.glb', lighting: 'day',
  noCast: /^(Hill|Fan(Back|Side|Floor)|ShopGlass|GumGlobe|HWinGlass|ShopLight|LampHead|Road|Grass|Sidewalk|Curb|Far|Shard|ShopCamLed)/,
  bounds: { x: [-14, 40], y: [0.12, 6], z: [-6.2, 6.5] },
  lights: [{ color: '#ffe2b8', intensity: 34, pos: [8.4, 2.7, -4.3], distance: 9 }, { color: '#ffd9a8', intensity: 14, pos: [9.6, 2.2, -5.2], distance: 6 }],
  materials(m) { for (const [k, o] of [['shopglass', 0.16], ['gumglobe', 0.38], ['shard', 0.55]]) if (m[k]) { m[k].transparent = true; m[k].opacity = o; m[k].depthWrite = false; } },
};

const sin = Math.sin, PI = Math.PI;
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / Math.PI;
const mix2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const along = (pts, u) => { const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = L.reduce((a, b) => a + b, 0);
  let d = sat(u) * tot, i = 0; while (i < L.length - 1 && d > L[i]) d -= L[i++]; return { p: mix2(pts[i], pts[i + 1], L[i] ? d / L[i] : 0), h: faceTo(pts[i], pts[i + 1]) }; };
const show = ch => { ch.group.visible = true; return ch; };
const run = (ch, pts, u, t, rate = 11, swing = 46) => { const { p, h } = along(pts, u), mv = u > 0.001 && u < 0.999 ? 1 : 0, st = t * rate * PI;
  return show(ch).at(p[0], p[1], h).pose({ torso: [14 * mv, 0, 0], legL: sin(st) * swing * mv, legR: -sin(st) * swing * mv, armL: [-sin(st) * swing * mv, 8, 0], armR: [sin(st) * swing * mv, 8, 0], lift: Math.abs(sin(st)) * 0.035 * mv }); };
const idle = [0, 8, 0];

// ---- marks
const SB = [8.0, -0.2], SD = [8.9, -0.1];                           // shop front
const TB = [-4.75, -1.0], TD = [-4.05, -1.0], TM = [-3.6, 0.38];    // lemonade stand: Bean, Dottie behind it; Max in front
const QA = [-2.85, 0.5], QL = [-2.1, 0.55];                         // queue
const HB = [11.05, -1.6], HD = [11.65, -1.6], HP = [10.4, 0.75];  // behind the bush; Mr. Pickle
const UB = [11.0, -0.3], UD = [11.6, -0.3];                        // the kids step out to face him
const IB = [9.05, -5.3], ID = [9.75, -5.3], IP = [10.3, -4.0], IM = [9.0, -2.85];   // inside the shop; Max at the door
const shopTwo = { pos: [8.45, 0.8, 2.6], look: [8.45, 0.62, -0.15], fov: 38 };
const winCam = { pos: [7.0, 1.25, 1.1], look: [7.0, 1.4, -2.5], fov: 44, focus: [7.0, 1.4, -2.5] };
const standFront = { pos: [-4.4, 1.0, 3.5], look: [-4.4, 0.9, -0.6], fov: 50 };
const standSide = { pos: [-2.5, 0.95, 1.5], look: [-4.2, 0.68, -0.35], fov: 42 };
const signCam = { pos: [-4.4, 1.25, 2.7], look: [-4.4, 1.42, -0.65], fov: 52, focus: [-4.4, 1.42, -0.65] };
const hideFront = { pos: [11.35, 0.95, 1.5], look: [11.35, 0.62, -1.5], fov: 36 };
const kidsBush = { pos: [11.3, 0.85, 2.3], look: [11.3, 0.66, -0.3], fov: 40, focus: 'bean' };
const inTwo = { pos: [9.4, 0.9, -2.95], look: [9.4, 0.7, -5.3], fov: 50 };
const doorPOV = { pos: [9.35, 1.3, -3.0], look: [9.62, 0.8, -5.1], fov: 72, focus: 'pickle' };            // from the door: Pickle + both kids
const shelfCam = { pos: [8.6, 1.3, -2.95], look: [8.6, 1.35, -6.1], fov: 52, focus: [8.6, 1.35, -6.1] };
const camIns = { pos: [9.4, 1.55, -0.75], look: [9.75, 2.06, -2.2], fov: 30, focus: [9.75, 2.06, -2.2] };

export function setup(s) {
  s.label('ShopSignFace', "MR. PICKLE'S CANDY", { w: 4.4, h: 0.62, color: '#FFF4D0', font: 'bold 168px "DejaVu Sans", sans-serif', px: 2048, emissive: 0.25 });
  s.label('MailboxFace', 'PICKLE', { w: 0.38, h: 0.14, color: '#fff', font: 'bold 150px "DejaVu Sans", sans-serif', px: 512 });
  const sign = (lines, color, size) => { const m = s.label('StandSignFace', lines, { w: 1.44, h: 0.32, color, font: `bold ${size}px "DejaVu Sans", sans-serif`, px: 1024 }); s.rest.set(m, { p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone(), v: false }); return m; };
  s.signs = { plain: sign('LEMONADE $1', '#E08A00', 128), magic: sign('MAGIC LEMONADE $10', '#8A2BE2', 84) };
  const grip = (name, pos, rot = [0, 0, 0], sc = 1) => { const o = s.clone(name); o.position.set(...pos); o.rotation.set(...rot); o.scale.setScalar(sc); const r = s.rest.get(o); r.p.copy(o.position); r.q.copy(o.quaternion); r.s.copy(o.scale); r.v = false; o.visible = false; return o; };
  s.items = { ball: grip('BallProp', [0, 0, 0]), cash: grip('CashProp', [0, -0.3, 0.06], [-1.2, 0, 0], 1.3), cashMax: grip('CashProp', [0, -0.3, 0.06], [-1.2, 0, 0], 1.0),
    broom: grip('BroomProp', [0, -0.25, 0.08], [0.25, 0, 0], 1.0), cup: grip('CupProp', [0, -0.3, 0.06], [0, 0, 0], 1.6) };
  s.jarCandy = []; for (const [n, o] of s.props) if (/^BJar\w*B\d+$/.test(n)) s.jarCandy.push(o);
  const move = (n, f) => { const o = s.obj(n); if (!o) return; f(o.position); s.rest.get(o).p.copy(o.position); };
  for (const [n] of s.props) if (/^(Pitcher|PitcherHandle|Cup\d|Lemon\d|CashBox)$/.test(n)) move(n, p => { p.x *= 0.42; });      // table-top props to the middle, clear of the kids' faces
  for (const n of ['ShopCamArm', 'ShopCam', 'ShopCamLens', 'ShopCamLed']) move(n, p => { p.y -= 0.64; });                  // security camera under the awning, where it can be seen
  // glass bodies for the back-wall jars (so an empty jar still reads as a jar) + candy wrappers on the shop floor
  const T = s.scene.children[0].constructor, lids = [...s.props].filter(([n]) => /^BJar\w*Lid$/.test(n)).map(([, o]) => o), M = lids[0].constructor, G = lids[0].geometry.constructor;
  const glass = lids[0].material.clone(); glass.color.set('#dff4ff'); glass.transparent = true; glass.opacity = 0.3; glass.roughness = 0.05; glass.depthWrite = false;
  s.scene.updateMatrixWorld(true);
  for (const l of lids) { const b = l.clone(); b.material = glass; b.castShadow = false; b.scale.set(1.25, 5.2, 1.25); b.position.y -= 0.15; l.parent.add(b); }
  s.wrappers = []; for (let i = 0; i < 8; i++) for (const n of ['Wrap' + i, 'WrapEnd' + i + '-1', 'WrapEnd' + i + '1']) { if (!s.obj(n)) continue; const o = s.obj(n).clone(true); o.position.x += -30 + 9.4 - 0.2 + (i % 4) * 0.12; o.position.z += -5.6 - 1.0; s.obj(n).parent.add(o); s.rest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: false }); s.wrappers.push(o); }
}

const ORDER = ['hook', 'isaw', 'donttell', 'costs', 'twohundred', 'business', 'build', 'lemonade', 'crickets', 'nobody', 'wrong', 'magic', 'five', 'queue', 'lie', 'marketing', 'sticky', 'run', 'chase', 'hide',
  'why', 'confess', 'fake', 'iknow', 'knew', 'giveback', 'work', 'refund', 'montage', 'weeklater', 'keep', 'whyq', 'noreason', 'reveal', 'mycandy', 'workoff', 'isback', 'no', 'button'];
const I = Object.fromEntries(ORDER.map((id, i) => [id, i]));
export function base(s, c) {
  const i = I[c.id];
  for (const n of ['pickle', 'max', 'ana', 'leo']) s[n].hide();
  const broken = (i > I.hook || c.t > 0.33) && i < I.weeklater;
  s.obj('ShopGlass').visible = !broken; s.obj('GlassShards').visible = broken;
  s.obj('LemonStand').visible = i >= I.build && i <= I.run;
  const magic = i > I.wrong || (i === I.wrong && c.t > c.w('watch') + 0.25);
  s.signs.plain.visible = !magic; s.signs.magic.visible = magic;
  if (i >= I.weeklater) { for (const o of s.jarCandy) o.visible = false; for (const o of s.wrappers) o.visible = true; }      // one week of "work" later…
}
const atShop = (s, turned = 0) => { s.bean.at(...SB, 8 + turned * 60).pose({ armL: idle, armR: idle }); s.dottie.at(...SD, -10).pose({ armL: idle, armR: idle }); };
const atStand = s => { s.bean.at(...TB, 4).pose({ armL: idle, armR: idle }); s.dottie.at(...TD, -4).pose({ armL: idle, armR: idle }); };
const maxAtStand = s => show(s.max).at(...TM, faceTo(TM, [-4.4, -1.0])).pose({ armL: idle, armR: idle, head: [-6, 0, 0] });
const queue = (s, c) => { show(s.ana).at(...QA, 262).pose({ armL: idle, armR: idle, lift: Math.abs(sin(c.T * 7)) * 0.03 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
  show(s.leo).at(...QL, 265).pose({ armL: [150, 20, 0], armR: idle, lift: Math.abs(sin(c.T * 7 + 1)) * 0.03 }).expr({ eyes: 'wide', brows: 'raised', mouth: 'grin' }); };
const kidsUp = s => { s.bean.at(...UB, faceTo(UB, HP)).pose({ armL: idle, armR: idle, head: [18, 0, 0] }); s.dottie.at(...UD, faceTo(UD, HP)).hold('cash', s.items.cash, true, 'L').pose({ armL: [30, 6, 0], armR: idle, head: [18, 0, 0] }); };
const pickleOut = s => show(s.pickle).at(...HP, faceTo(HP, [11.3, -0.3])).pose({ armL: idle, armR: idle, head: [-14, 0, 0], torso: [6, 0, 0] });
const inside = s => { const fb = faceTo(IB, IP); s.bean.at(...IB, fb).pose({ armL: idle, armR: idle, head: [16, 0, 0] }); s.dottie.at(...ID, faceTo(ID, IP)).pose({ armL: idle, armR: idle, head: [16, 0, 0] });
  show(s.pickle).at(...IP, faceTo(IP, [9.38, -5.3])).pose({ armL: idle, armR: idle, head: [-14, 0, 0], torso: [5, 0, 0] }); };
const full = { eyes: 'wide', brows: 'raised', mouth: 'wobble', blush: 1, look: [0.7, -0.2] };      // Dottie with her cheeks full of candy

export const beats = [
  // ═════════ ACT 1 — the window
  { id: 'hook', line: 'L01', music: 'sneak',
    shots: [winCam, { on: 'bean', dist: 1.05, yaw: 5, pitch: 2 }, { on: 'bean', dist: 0.85, yaw: -18, pitch: 1 }],
    sfx: [{ at: 0.05, name: 'whoosh', gain: 0.7 }, { at: 0.33, name: 'crash' }, { at: 0.5, name: 'sting', gain: 0.5 }],
    act(s, c) {
      s.dottie.hide(); const k = seg(c.t, 0.05, 0.33), k2 = easeOut(seg(c.t, 0.33, 0.7));
      const b = s.items.ball; b.visible = true; b.position.set(lerp(8.0, 7.0, k) - 0.2 * k2, lerp(0.5, 1.45, k) - 1.2 * k2, lerp(-0.6, -2.55, k) - 1.9 * k2); b.rotation.set(c.t * 14, c.t * 9, 0);
      const freeze = seg(c.t, 0.33, 0.5);
      s.bean.at(...SB, 6).pose({ legR: 55 * (1 - seg(c.t, 0, 0.3)), armL: [150 * freeze, 22, 0], armR: [150 * freeze, 22, 0], head: [0, 0, 4], torso: [0, 0, 0], auto: { blink: false } })
        .expr({ eyes: freeze > 0.5 ? 'shock' : 'wide', brows: 'worried', mouth: 'wobble', sweat: freeze > 0.5, look: [seg(c.t, 1.4, 1.6) * sin(c.t * 9) * 0.8, 0] });
    } },
  { id: 'isaw', line: 'L02',
    shots: [{ on: 'dottie', dist: 1.0, yaw: -10, pitch: 2, anchor: 0.3 }],
    sfx: [{ at: 0, name: 'slide', gain: 0.6 }, { at: 0.2, name: 'pop', gain: 0.6 }],
    act(s, c) {
      atShop(s); const k = easeOut(seg(c.t, 0, 0.25));
      s.dottie.at(lerp(10.6, SD[0], k), SD[1], -10).pose({ torso: [6, 0, 10 * (1 - k)], armL: [48, -24, 0], armR: [48, -24, 0], head: [0, 0, -8] }).expr({ eyes: 'half', brows: 'angry', mouth: 'smirk' });
      s.bean.expr({ eyes: 'shock', brows: 'worried', mouth: 'o' });
    } },
  { id: 'donttell', line: 'L03',
    shots: [shopTwo, { on: 'bean', dist: 0.9, yaw: -30, pitch: 2 }],
    act(s, c) {
      atShop(s, 1); s.bean.pose({ armL: [112 + sin(c.t * 16) * 8, -16, 0], armR: [112 + sin(c.t * 16) * 8, -16, 0], torso: [10, 0, 0], head: [8, 0, 0], lift: Math.abs(sin(c.t * 10)) * 0.03 }).expr({ eyes: 'sad', brows: 'worried', mouth: 'wobble', sweat: true });
      s.dottie.at(...SD, -40).pose({ armL: [48, -24, 0], armR: [48, -24, 0], head: [0, 0, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'smirk' });
    } },
  { id: 'costs', line: 'L04',
    shots: [{ on: 'dottie', dist: 1.0, yaw: 12, pitch: 2 }, { ...winCam, pos: [7.0, 1.2, 0.5] }],
    sfx: [{ at: 'w:two', name: 'kaching', gain: 0.6 }],
    act(s, c) {
      atShop(s); const k = seg(c.t, c.w('window') - 0.1, c.w('window') + 0.1);
      s.dottie.pose({ armR: [20, 80 * k + 8, 0], armL: idle, head: [0, 14, 0] }).expr({ eyes: 'open', brows: 'angry', mouth: 'flat' });
      s.bean.pose({ head: [0, -20, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'o' });
    } },
  { id: 'twohundred', line: 'L05',
    shots: [{ on: 'bean', dist: 0.9, yaw: 8, pitch: 0, shake: 0.6 }, { on: 'bean', dist: 1.1, yaw: -14, pitch: 3 }, shopTwo],
    sfx: [{ at: 0, name: 'sting', gain: 0.45 }, { at: 'w:button', name: 'plink', note: 0 }],
    act(s, c) {
      atShop(s); const h = c.w('i'), sad = seg(c.t, h - 0.1, h + 0.1), b = seg(c.t, c.w('button') - 0.1, c.w('button') + 0.1);
      s.bean.pose({ lift: sin(sat(c.t / 0.3) * PI) * 0.1, armL: [lerp(150, 0, sad), 20, 0], armR: [lerp(150, 70 * b, sad), 10, 0], head: [-10 * sad, 0, 0], torso: [8 * sad, 0, 0] })
        .expr(sad > 0.5 ? { eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0, 0.6] } : { eyes: 'shock', brows: 'raised', mouth: 'scream' });
      s.dottie.pose({ head: [0, 20, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'flat' });
    } },
  { id: 'business', line: 'L06', music: 'comedy',
    shots: [{ on: 'dottie', dist: 0.95, yaw: -8, pitch: 0 }, shopTwo],
    sfx: [{ at: 'w:business', name: 'ding' }, { at: 'w:lemonade', name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      atShop(s); const k = backOut(seg(c.t, c.w('business') - 0.15, c.w('business') + 0.1)), l = seg(c.t, c.w('a') - 0.05, c.w('a') + 0.15);
      s.dottie.pose({ armR: [165 * k, 10, 0], armL: [l * 150, 24 * l + 8, 0], head: [8, 0, 0], lift: sin(l * PI) * 0.06 }).expr({ eyes: l > 0.5 ? 'happy' : 'wide', brows: 'raised', mouth: 'grin' });
      s.bean.pose({ head: [0, -24, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  // ═════════ ACT 2 — the lemonade stand
  { id: 'build', dur: 1.5, music: 'happy', focus: [-4.4, 0.7, -0.5], inFrame: [],
    shots: [{ ...standFront, dolly: [0, 0, -0.3] }],
    sfx: [{ at: 0.1, name: 'knock' }, { at: 0.3, name: 'knock' }, { at: 0.5, name: 'knock' }, { at: 0.75, name: 'pop' }, { at: 0.95, name: 'sparkle' }],
    act(s, c) {
      atStand(s); const k = backOut(seg(c.t, 0.55, 0.85)), st = s.obj('LemonStand'); st.scale.set(1, Math.max(0.001, k), 1);
      const ham = c.t < 0.6 ? Math.abs(sin(c.t * PI / 0.2)) : 0;
      s.bean.pose({ armR: [70 + ham * 50, 0, 0], torso: [14 * (1 - k), 0, 0] }).expr({ eyes: 'open', brows: 'angry', mouth: 'flat' });
      s.dottie.pose({ armL: [165 * k, 20, 0], armR: [165 * k, 20, 0], lift: sin(k * PI) * 0.05 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
    } },
  { id: 'lemonade', line: 'L07',
    shots: [standFront, { on: 'bean', dist: 0.95, yaw: -28, pitch: 4 }, { ...standFront, pos: [-3.4, 1.0, 3.3] }],
    act(s, c) {
      atStand(s); s.bean.pose({ armL: [150, 34 + sin(c.t * 12) * 12, 0], armR: [150, 34 - sin(c.t * 12) * 12, 0], head: [10, sin(c.t * 5) * 20, 0], lift: Math.abs(sin(c.t * 8)) * 0.04 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ armL: [48, -24, 0], armR: [48, -24, 0] }).expr({ eyes: 'open', brows: 'neutral', mouth: 'smile' });
    } },
  { id: 'crickets', dur: 1.0, music: 'stop', focus: [-4.4, 0.7, -0.5], inFrame: [],
    shots: [{ pos: [-4.4, 1.7, 5.6], look: [-4.4, 0.9, -0.5], fov: 50, dolly: [0, 0, -0.2] }],
    sfx: [{ at: 0.1, name: 'cricket' }, { at: 0.55, name: 'cricket', gain: 0.8 }],
    act(s, c) {
      atStand(s); s.bean.pose({ armL: [150, 34, 0], armR: [150, 34, 0], auto: { blink: false } }).expr({ eyes: 'wide', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ armL: [48, -24, 0], armR: [48, -24, 0], head: [0, 20, 0] }).expr({ eyes: 'half', brows: 'neutral', mouth: 'flat' });
    } },
  { id: 'nobody', line: 'L08',
    shots: [{ on: 'bean', dist: 1.0, yaw: -28, pitch: 8 }, standFront, { on: 'dottie', dist: 0.9, yaw: 10, pitch: 2, focus: 'dottie' }],
    sfx: [{ at: 0.05, name: 'wah', gain: 0.7 }],
    act(s, c) {
      atStand(s); s.bean.pose({ torso: [12, 0, 0], head: [-14, 0, 8], armL: [30, 20, 0], armR: [30, 20, 0], auto: { idle: 0.4 } }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0, 0.6] });
      const z = c.w('zero'), k = seg(c.t, z - 0.1, z + 0.1);
      s.dottie.pose({ armL: [48, -24, 0], armR: [48, -24, 0], head: [10 * k, 0, 0] }).expr({ eyes: k > 0.5 ? 'half' : 'open', brows: 'angry', mouth: 'flat', look: [0, -0.9 * k] });
    } },
  { id: 'wrong', line: 'L09', music: 'comedy',
    shots: [{ on: 'dottie', dist: 0.95, yaw: -10, pitch: 0 }, signCam],
    sfx: [{ at: 'w:watch', name: 'whoosh', gain: 0.6, }, { at: -0.25, name: 'pop' }, { at: -0.2, name: 'sparkle' }],
    act(s, c) {
      atStand(s); const w = c.w('watch'), k = seg(c.t, w - 0.1, w + 0.15);
      s.dottie.pose({ armR: [165 * k, 12, 0], armL: [30, 26, 0], head: [4, 20 * (1 - k), 0], torso: [0, 0, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'smirk' });
      s.bean.pose({ torso: [12 * (1 - k), 0, 0], head: [-14 * (1 - k), -24 * k, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown' });
      const pop = 1 + 0.25 * sin(seg(c.t, w + 0.25, w + 0.5) * PI); s.signs.magic.scale.setScalar(pop);
    } },
  { id: 'magic', line: 'L10',
    shots: [{ on: 'dottie', dist: 1.0, yaw: 6, pitch: -4 }, signCam, { on: 'dottie', dist: 0.8, yaw: -14, pitch: -2 }, { ...standSide, focus: 'dottie' }],
    sfx: [{ at: 0, name: 'sparkle' }, { at: 'w:super', name: 'whoosh' }, { at: 'w:ten', name: 'kaching' }],
    act(s, c) {
      atStand(s); const j = Math.abs(sin(c.t * 7)), su = seg(c.t, c.w('super') - 0.1, c.w('super') + 0.1);
      s.dottie.pose({ lift: j * 0.06, armL: [150, 40 + sin(c.t * 10) * 10, 0], armR: [150 - su * 60, 40, 0], head: [10, sin(c.t * 4) * 16, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.5 });
      s.bean.pose({ head: [0, -30, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'o' });
      const u = easeOut(seg(c.t, c.dur - 1.2, c.dur - 0.2)); if (u > 0) run(s.max, [[0.5, 0.6], TM], u, c.t).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  { id: 'five', line: 'L11',
    shots: [{ on: 'max', dist: 1.0, yaw: -50, pitch: 4 }, { ...standSide, focus: 'max' }],
    sfx: [{ at: 'w:five', name: 'kaching' }],
    act(s, c) {
      atStand(s); const f = c.w('five'), k = backOut(seg(c.t, f - 0.1, f + 0.15));
      maxAtStand(s).hold('cash', s.items.cashMax, true).pose({ armR: [70 + 80 * k, 10, 0], armL: [150 * k, 30, 0], lift: sin(sat((c.t - f) / 0.3) * PI) * 0.08 * (c.t > f ? 1 : 0), head: [-10, 0, 0] }).expr({ eyes: k > 0.5 ? 'happy' : 'wide', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ armL: [60, 30, 0], armR: [60, 30, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' }); s.bean.pose({ head: [0, -20, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'flat' });
    } },
  { id: 'queue', dur: 1.4, music: 'happy', focus: 'max', inFrame: [],
    shots: [{ pos: [-0.9, 1.35, 2.3], look: [-3.6, 0.7, 0.1], fov: 44, dolly: [0.15, 0, 0.1] }, { ...standFront, pos: [-5.6, 1.0, 2.2], look: [-4.2, 0.72, -0.5] }],
    sfx: [{ at: 0.15, name: 'pop' }, { at: 0.45, name: 'pop' }, { at: 0.3, name: 'kaching', gain: 0.7 }, { at: 0.75, name: 'kaching', gain: 0.7 }, { at: 1.1, name: 'kaching', gain: 0.7 }],
    act(s, c) {
      atStand(s); maxAtStand(s).hold('cup', s.items.cup, true).pose({ armR: [110, 0, 0], head: [10, 0, 0] }).expr({ eyes: 'closed', brows: 'raised', mouth: 'o' });
      queue(s, c); s.ana.group.scale.setScalar(1.15 * backOut(seg(c.t, 0.1, 0.35)) + 0.001); s.leo.group.scale.setScalar(1.25 * backOut(seg(c.t, 0.4, 0.65)) + 0.001);
      s.dottie.hold('cash', s.items.cash, c.t > 0.3, 'L').pose({ armL: [80, 20, 0], armR: [90 + sin(c.t * 20) * 20, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.6 });
      s.bean.pose({ armR: [80 + sin(c.t * 18) * 14, 0, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'flat' });
    } },
  { id: 'lie', line: 'L12',
    shots: [{ on: 'bean', dist: 0.9, yaw: -22, pitch: 10 }, { on: 'dottie', dist: 0.9, yaw: -24, pitch: 8, focus: 'dottie' }, { on: 'bean', dist: 0.75, yaw: -10, pitch: 8 }],
    act(s, c) {
      atStand(s); maxAtStand(s).hold('cup', s.items.cup, true).pose({ armR: [110, 0, 0] }).expr({ eyes: 'closed', brows: 'raised', mouth: 'o' }); queue(s, c);
      s.bean.at(TB[0] + 0.12, TB[1], 4).pose({ torso: [0, 0, 12], head: [4, -30, 0], armL: idle, armR: idle }).expr({ eyes: 'wide', brows: 'worried', mouth: 'whisper', look: [-0.6, 0], sweat: true });
      s.dottie.hold('cash', s.items.cash, true, 'L').pose({ armL: [84, 10, 0], armR: [84 + sin(c.t * 16) * 10, -14, 0], head: [-14, 0, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', look: [0, 0.6], blush: 0.6 });
    } },
  { id: 'marketing', line: 'L13',
    shots: [{ on: 'dottie', dist: 0.95, yaw: 10, pitch: 0 }, { on: 'dottie', dist: 0.8, yaw: -20, pitch: -6 }, standFront],
    sfx: [{ at: 'w:look', name: 'kaching' }, { at: 'w:look', name: 'sparkle', gain: 0.7 }],
    act(s, c) {
      atStand(s); maxAtStand(s).hold('cup', s.items.cup, true).pose({ armR: [110, 0, 0] }); queue(s, c);
      const l = c.w('look'), k = backOut(seg(c.t, l - 0.1, l + 0.15));
      s.dottie.hold('cash', s.items.cash, true, 'L').pose({ armL: [84 + 76 * k, 26 * k + 6, 0], armR: [k * 20, 60 * (1 - k) + 8, 0], head: [6 * k, 22 * (1 - k), -6], lift: sin(k * PI) * 0.05 }).expr({ eyes: k > 0.5 ? 'happy' : 'half', brows: k > 0.5 ? 'raised' : 'angry', mouth: k > 0.5 ? 'grin' : 'smirk', blush: 0.6 });
      s.bean.pose({ head: [0, -30, 0] }).expr({ eyes: 'wide', brows: 'worried', mouth: 'frown', sweat: true });
    } },
  { id: 'sticky', line: 'L14', music: 'tension',
    shots: [{ on: 'max', dist: 0.95, yaw: -50, pitch: 4 }, { ...standSide, focus: 'max' }, { on: 'max', dist: 0.75, yaw: -40, pitch: 4 }, { ...standFront, focus: 'dottie' }],
    sfx: [{ at: 0, name: 'thud' }, { at: 'w:sticky', name: 'squeak' }, { at: 'w:money', name: 'boom', gain: 0.6 }],
    act(s, c) {
      atStand(s); queue(s, c); s.ana.expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' }); s.leo.pose({ armL: [150, 20 + sin(c.t * 14) * 14, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' });
      const f = c.w('faster'), st = c.w('sticky'), m = c.w('want'), jog = c.t > f - 0.4 && c.t < st - 0.1 ? 1 : 0, stp = c.t * 4 * PI;
      maxAtStand(s).pose({ legL: sin(stp) * 30 * jog, legR: -sin(stp) * 30 * jog, armL: c.t > st ? [50 + sin(c.t * 9) * 10, 30, 0] : [-sin(stp) * 30 * jog, 8, 0], armR: c.t > m ? [100, 10 + sin(c.t * 22) * 8, 0] : [sin(stp) * 30 * jog, 8, 0], head: [-8, 0, 0] })
        .expr({ eyes: 'angry', brows: 'angry', mouth: c.t > m ? 'scream' : 'frown', sweat: true });
      s.dottie.hold('cash', s.items.cash, true, 'L').pose({ armL: [40, -20, 0], armR: [40, -20, 0], head: [0, 0, 0], auto: { blink: false } }).expr({ eyes: 'shock', brows: 'worried', mouth: 'teeth', sweat: true });
      s.bean.pose({ torso: [0, 0, -6] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble', sweat: true });
    } },
  { id: 'run', line: 'L15', music: 'panic',
    shots: [{ on: 'dottie', dist: 0.9, yaw: 8, pitch: 0, anchor: 0.05 }, { ...standSide, pos: [-2.2, 1.0, 2.0], focus: 'max' }],
    sfx: [{ at: 'w:run', name: 'whoosh' }, { at: 'w:run', name: 'slide', gain: 0.7 }],
    act(s, c) {
      const r = c.w('run'), u = easeInOut(seg(c.t, r, r + 0.9)); queue(s, c); maxAtStand(s).pose({ armR: [100, 10, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      if (u <= 0) { atStand(s); s.dottie.hold('cash', s.items.cash, true, 'L').pose({ armL: [40, -20, 0], armR: [40, -20, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'teeth', sweat: true }); s.bean.expr({ eyes: 'shock', brows: 'worried', mouth: 'wobble' }); }
      else { run(s.dottie, [TD, [-3.2, -1.3], [0.5, -0.5]], u, c.t).hold('cash', s.items.cash, true, 'L').expr({ eyes: 'shock', brows: 'worried', mouth: 'scream' }); run(s.bean, [TB, [-4.0, -1.5], [-0.3, -0.6]], u, c.t + 0.1).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream' }); }
    } },
  { id: 'chase', dur: 1.7, focus: 'bean', inFrame: [],
    shots: [{ pos: [3.0, 0.95, 3.8], look: 'bean', track: true, fov: 46, dolly: [0.3, 0, 0] }, { pos: [9.2, 0.6, 0.35], look: 'dottie', track: true, fov: 44, dolly: [0, 0, 0] }],
    sfx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({ at: i * 0.16, name: 'step', gain: 0.55 })),
    act(s, c) {
      const u = seg(c.t, 0, 1.7);
      run(s.bean, [[0.2, 0.1], [7.6, 0.0]], u * 0.999 + 0.0005, c.t).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream', sweat: true });
      run(s.dottie, [[1.0, -0.25], [8.4, -0.3]], u * 0.999 + 0.0005, c.t + 0.07).hold('cash', s.items.cash, true, 'L').pose({ armL: [150, 10, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream' });
      run(s.max, [[-2.2, 0.2], [5.0, 0.15]], u * 0.999 + 0.0005, c.t + 0.2, 9).pose({ armR: [110, 10, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      run(s.leo, [[-3.6, -0.2], [3.4, -0.2]], u * 0.999 + 0.0005, c.t + 0.3, 9).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' });
      run(s.ana, [[-4.6, 0.3], [2.2, 0.3]], u * 0.999 + 0.0005, c.t + 0.4, 9).expr({ eyes: 'angry', brows: 'angry', mouth: 'frown' });
    } },
  { id: 'hide', dur: 1.2, music: 'stop', focus: [11.35, 0.6, -1.3], inFrame: [],
    shots: [{ ...hideFront, dolly: [0, 0, -0.15] }],
    sfx: [{ at: 0.05, name: 'slide' }, { at: 0.3, name: 'thud', gain: 0.6 }, { at: 0.45, name: 'whoosh' }, { at: 0.65, name: 'whoosh', gain: 0.7 }],
    act(s, c) {
      const d = easeOut(seg(c.t, 0, 0.3)), peek = seg(c.t, 0.85, 1.05);
      s.bean.at(lerp(9.6, HB[0], d), lerp(-0.4, HB[1], d), 0, -0.3 * d + 0.25 * peek).pose({ legL: -80 * d, legR: -80 * d, armL: idle, armR: idle }).expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', look: [-0.8, 0] });
      s.dottie.at(lerp(10.2, HD[0], d), lerp(-0.5, HD[1], d), 0, -0.34 * d + 0.24 * peek).pose({ legL: -80 * d, legR: -80 * d, armL: idle, armR: idle }).expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', look: [-0.8, 0] });
      const u = seg(c.t, 0.3, 1.0); if (u > 0) { run(s.max, [[7.5, 0.3], [15.5, 0.3]], u * 0.999, c.t, 9).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' }); run(s.leo, [[6.3, 0.0], [14.3, 0.0]], u * 0.999, c.t + 0.2, 9); run(s.ana, [[5.2, 0.5], [13.2, 0.5]], u * 0.999, c.t + 0.3, 9); }
    } },
  // ═════════ ACT 3 — the truth
  { id: 'why', line: 'L16', music: 'sneak',
    shots: [{ on: 'pickle', dist: 1.1, yaw: -25, pitch: -2 }, hideFront],
    sfx: [{ at: 0, name: 'creak', gain: 0.6 }],
    act(s, c) {
      show(s.pickle).at(...HP, faceTo(HP, [11.35, -1.6])).pose({ armL: [48, -30, 0], armR: [48, -30, 0], head: [-18, 0, 6], torso: [6, 0, 0] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' });
      for (const [ch, m, y] of [[s.bean, HB, -0.05], [s.dottie, HD, -0.1]]) ch.at(m[0], m[1], 0, y).pose({ legL: -80, legR: -80, armL: idle, armR: idle, head: [10, 30, 0], auto: { blink: false } }).expr({ eyes: 'shock', brows: 'worried', mouth: 'flat', look: [-0.7, -0.3] });
    } },
  { id: 'confess', line: 'L17',
    shots: [{ on: 'bean', dist: 0.75, yaw: 38, pitch: 6 }, { on: 'pickle', dist: 1.0, yaw: -25, pitch: -2, focus: 'pickle' }, { on: 'bean', dist: 0.62, yaw: 30, pitch: 5 }, kidsBush],
    sfx: [{ at: 'w:ball', name: 'plink', note: 1 }],
    act(s, c) {
      kidsUp(s); pickleOut(s).pose({ armL: [48, -30, 0], armR: [48, -30, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'flat' });
      const so = c.w('im'), k = seg(c.t, so - 0.1, so + 0.15);
      s.bean.pose({ torso: [10 * k, 0, 0], head: [18 - 20 * k, 0, 0], armL: [20, -10, 0], armR: [20, -10, 0] }).expr({ eyes: k > 0.5 ? 'closed' : 'sad', brows: 'worried', mouth: 'frown', look: [0, k > 0.5 ? 0 : -0.3] });
      s.dottie.expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', look: [0.6, 0] });
    } },
  { id: 'fake', line: 'L18',
    shots: [{ on: 'dottie', dist: 0.75, yaw: 60, pitch: 6 }, { on: 'pickle', dist: 0.9, yaw: -30, pitch: -2, focus: 'pickle' }],
    act(s, c) {
      kidsUp(s); pickleOut(s).pose({ armL: [48, -30, 0], armR: [48, -30, 0] }).expr({ eyes: 'open', brows: 'raised', mouth: 'flat' });
      s.dottie.pose({ armL: [50, 6, 0], armR: [20, -10, 0], head: [8, 0, 6], torso: [8, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'teeth', look: [0, 0.3], sweat: true });
      s.bean.pose({ torso: [10, 0, 0], head: [-2, 0, 0] }).expr({ eyes: 'closed', brows: 'worried', mouth: 'frown' });
    } },
  { id: 'iknow', line: 'L19',
    shots: [{ on: 'pickle', dist: 1.0, yaw: -25, pitch: -2 }, camIns, { on: 'pickle', dist: 0.85, yaw: -32, pitch: -3 }, kidsBush],
    sfx: [{ at: 'w:camera', name: 'ding', gain: 0.6 }, { at: 'w:truth', name: 'sparkle', gain: 0.6 }],
    act(s, c) {
      kidsUp(s); const cm = c.w('camera'), k = seg(c.t, cm - 0.2, cm), tr = seg(c.t, c.w('waiting') - 0.1, c.w('waiting') + 0.1);
      pickleOut(s).pose({ armR: [k * (1 - tr) * 150, 40 * k * (1 - tr) + 8, 0], armL: idle, head: [-16, 0, 4] }).expr(tr > 0.5 ? { eyes: 'happy', brows: 'raised', mouth: 'smile', blush: 0.3 } : { eyes: 'half', brows: 'neutral', mouth: 'smirk' });
      s.bean.expr({ eyes: 'shock', brows: 'raised', mouth: 'o' }); s.dottie.expr({ eyes: 'shock', brows: 'raised', mouth: 'o' });
    } },
  { id: 'knew', line: 'L20',
    shots: [{ on: 'bean', dist: 0.7, yaw: 36, pitch: 5, shake: 0.6 }, kidsBush],
    sfx: [{ at: 0, name: 'boing', gain: 0.6 }],
    act(s, c) {
      kidsUp(s); pickleOut(s).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
      s.bean.pose({ lift: sin(sat(c.t / 0.3) * PI) * 0.08, armL: [150, 26, 0], armR: [150, 26, 0], head: [20, 0, 0] }).expr({ eyes: 'shock', brows: 'raised', mouth: 'scream' });
      s.dottie.expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
    } },
  { id: 'giveback', line: 'L21',
    shots: [{ on: 'pickle', dist: 1.0, yaw: -25, pitch: -2 }, { on: 'dottie', dist: 0.72, yaw: 60, pitch: 6, focus: 'dottie' }, { on: 'pickle', dist: 0.85, yaw: -32, pitch: -3 }],
    sfx: [{ at: 'w:work', name: 'thud', gain: 0.6 }],
    act(s, c) {
      kidsUp(s); const w = c.w('then'), k = seg(c.t, w - 0.1, w + 0.1);
      pickleOut(s).pose({ armL: [k ? 0 : 84, k ? 8 : 0, 0], armR: [k * 30, k * 96 + 8, 0], head: [-16, 0, 0] }).expr({ eyes: 'open', brows: 'angry', mouth: 'flat' });
      s.dottie.pose({ armL: [62, -22, 0], armR: [62, -22, 0], head: [10, 0, -8], torso: [0, 0, 6] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown', look: [0, 0.5] });
      s.bean.expr({ eyes: 'open', brows: 'worried', mouth: 'flat' });
    } },
  { id: 'work', line: 'L22', music: 'dream',
    shots: [{ on: 'dottie', dist: 0.72, yaw: 60, pitch: 5 }, { on: 'dottie', dist: 0.6, yaw: 54, pitch: 3 }],
    sfx: [{ at: 'w:candy', name: 'shimmer' }, { at: 'w:okay', name: 'ding' }],
    act(s, c) {
      kidsUp(s); pickleOut(s); const cd = c.w('in'), k = seg(c.t, cd - 0.05, cd + 0.15), ok = backOut(seg(c.t, c.w('okay') - 0.1, c.w('okay') + 0.1));
      s.dottie.pose({ armL: [62, -22 + 44 * k, 0], armR: [62 * (1 - k) + 150 * ok, -22 * (1 - k) + 20, 0], head: [14, 0, 0], lift: sin(ok * PI) * 0.06 })
        .expr(k > 0.5 ? { eyes: ok > 0.5 ? 'happy' : 'shock', brows: 'raised', mouth: 'grin', blush: 0.7 } : { eyes: 'half', brows: 'angry', mouth: 'frown' });
      s.bean.expr({ eyes: 'open', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'refund', dur: 1.1, music: 'happy', focus: 'max', inFrame: [],
    shots: [{ pos: [10.3, 1.25, 2.7], look: [10.2, 0.72, -0.4], fov: 44, dolly: [0, 0, -0.25] }],
    sfx: [{ at: 0.25, name: 'kaching', gain: 0.7 }, { at: 0.55, name: 'kaching', gain: 0.7 }, { at: 0.8, name: 'pop' }],
    act(s, c) {
      const k = seg(c.t, 0.2, 0.5);
      s.bean.at(10.9, -0.3, -70).pose({ armL: idle, armR: idle }).expr({ eyes: 'open', brows: 'worried', mouth: 'smile' });
      s.dottie.at(10.3, -0.15, -80).hold('cash', s.items.cash, k < 0.5, 'L').pose({ armL: [96, 0, 0], armR: idle, head: [10, 0, 0], torso: [6, 0, 0] }).expr({ eyes: 'sad', brows: 'worried', mouth: 'frown' });
      show(s.max).at(9.55, -0.1, 95).hold('cash', s.items.cashMax, k >= 0.5).pose({ armR: [96, 0, 0], armL: idle, head: [-8, 0, 0], lift: sin(seg(c.t, 0.5, 0.8) * PI) * 0.06 }).expr({ eyes: k >= 0.5 ? 'happy' : 'angry', brows: k >= 0.5 ? 'raised' : 'angry', mouth: k >= 0.5 ? 'grin' : 'frown' });
      show(s.leo).at(8.8, 0.1, 92).pose({ armL: [48, -24, 0], armR: [48, -24, 0] }).expr({ eyes: 'half', brows: 'angry', mouth: 'flat' }); show(s.ana).at(8.1, -0.1, 90).pose({ armL: idle, armR: [90, 0, 0] }).expr({ eyes: 'open', brows: 'angry', mouth: 'flat' });
      pickleOut(s).at(11.2, 0.5, -120).pose({ armL: [48, -30, 0], armR: [48, -30, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile' });
    } },
  { id: 'montage', dur: 2.6, focus: 'bean', inFrame: [], cuts: 3,
    shots: [{ pos: [9.85, 0.95, -5.25], look: 'bean', track: true, fov: 42 }, { pos: [9.2, 1.0, -3.2], look: 'dottie', fov: 40, focus: 'dottie' }, { ...winCam, focus: 'pickle' }],
    sfx: [0.1, 0.45, 0.8].map(at => ({ at, name: 'whoosh', gain: 0.4 })).concat([{ at: 1.0, name: 'plink', note: 2 }, { at: 1.3, name: 'plink', note: 3 }, { at: 1.6, name: 'chomp', gain: 0.6 }, { at: 1.9, name: 'knock' }, { at: 2.15, name: 'knock' }, { at: 2.35, name: 'sparkle' }]),
    act(s, c) {
      const sw = sin(c.t * 9);
      s.bean.at(10.2 + sw * 0.18, -3.7, 200).hold('broom', s.items.broom, true).pose({ torso: [14, sw * 14, 0], armR: [50 + sw * 22, 0, 0], armL: [60 - sw * 22, -20, 0], head: [-6, 0, 0] }).expr({ eyes: 'open', brows: 'angry', mouth: 'flat' });
      const sneak = seg(c.t, 1.4, 1.7);
      s.dottie.at(8.9, -4.9, 10).pose({ armL: [100 + sin(c.t * 12) * 20, 10, 0], armR: [20 + 100 * sneak, -10 * sneak, 0], head: [10, -40 * sneak, 0] }).expr(sneak > 0.5 ? { eyes: 'half', brows: 'angry', mouth: 'smirk', look: [-0.9, 0] } : { eyes: 'wide', brows: 'raised', mouth: 'o', look: [0, 0.4], blush: 0.5 });
      show(s.pickle).at(7.0, -2.95, 0).pose({ armL: [150, 10, 0], armR: [120 + Math.abs(sin(c.t * 12)) * 30, 0, 0], head: [-10, 0, 0] }).expr({ eyes: 'open', brows: 'angry', mouth: 'flat' });
    } },
  { id: 'weeklater', line: 'L23', music: 'happy',
    shots: [{ ...winCam, dolly: [0, 0, -0.4] }, { on: 'pickle', dist: 1.0, yaw: 6, pitch: -2 }, inTwo],
    sfx: [{ at: 0.1, name: 'sparkle' }, { at: 'w:free', name: 'ding' }],
    act(s, c) {
      inside(s); const f = c.w('free'), k = backOut(seg(c.t, f - 0.1, f + 0.15));
      s.pickle.pose({ armL: [k * 60, 60 * k + 8, 0], armR: [k * 60, 60 * k + 8, 0] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 0.3 });
      s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'flat', look: [0.6, 0] }); s.dottie.pose({ auto: { idle: 0.3 } }).expr(full);
    } },
  { id: 'keep', line: 'L24', music: 'comedy',
    shots: [{ on: 'bean', dist: 0.8, yaw: -30, pitch: 5 }, { ...inTwo, focus: 'dottie' }],
    act(s, c) {
      inside(s); s.pickle.expr({ eyes: 'open', brows: 'raised', mouth: 'smile' });
      s.bean.pose({ armL: [40, -30, 0], armR: [40, -30, 0], head: [10, sin(c.t * 5) * 10, 0], torso: [0, 0, sin(c.t * 5) * 3] }).expr({ eyes: 'open', brows: 'worried', mouth: 'teeth', look: [sin(c.t * 5) * 0.6, 0], sweat: true });
      s.dottie.pose({ head: [0, -30, 0], auto: { idle: 0.3 } }).expr(full);
    } },
  { id: 'whyq', line: 'L25', pad: [0.07, 0.2],
    shots: [{ on: 'pickle', dist: 0.85, yaw: -6, pitch: -2 }],
    act(s, c) { inside(s); s.pickle.pose({ armL: [48, -30, 0], armR: [48, -30, 0], head: [-18, 0, 10] }).expr({ eyes: 'half', brows: 'skeptic', mouth: 'flat' }); s.dottie.expr(full); s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth' }); } },
  { id: 'noreason', line: 'L26', pad: [0.07, 0.25],
    shots: [{ on: 'dottie', dist: 0.72, yaw: -34, pitch: 5 }],
    sfx: [{ at: -0.2, name: 'pop' }],
    act(s, c) { inside(s); s.pickle.pose({ head: [-18, 0, 10] });
      s.dottie.pose({ armL: [20, -14, 0], armR: [20, -14, 0], head: [10, 0, 0], auto: { blink: false, talk: 0.3 } }).expr({ ...full, look: [sin(c.t * 7) * 0.8, 0], sweat: true }); s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth' }); } },
  { id: 'reveal', dur: 1.0, music: 'stop', inFrame: [],
    shots: [{ ...shelfCam, dolly: [0, 0, -0.5] }],
    sfx: [{ at: 0.05, name: 'sting' }, { at: 0.5, name: 'cricket', gain: 0.7 }],
    act(s, c) { inside(s); s.pickle.hide(); s.bean.at(7.9, -5.45, 0).pose({ armL: idle, armR: idle, auto: { blink: false } }).expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth', sweat: true }); s.dottie.at(9.3, -5.45, 0).pose({ armL: idle, armR: idle, auto: { blink: false } }).expr(full); } },
  { id: 'mycandy', line: 'L27', music: 'panic',
    shots: [{ on: 'pickle', dist: 0.95, yaw: 4, pitch: -2, shake: 0.8 }, { on: 'pickle', dist: 0.75, yaw: -10, pitch: -4, shake: 0.5 }],
    sfx: [{ at: 0, name: 'boom', gain: 0.6 }],
    act(s, c) { inside(s); s.pickle.pose({ lift: sin(sat(c.t / 0.3) * PI) * 0.06, armL: [165, 24 + sin(c.t * 24) * 6, 0], armR: [165, 24 - sin(c.t * 24) * 6, 0], head: [-10, 0, 0], auto: { blink: false } }).expr({ eyes: 'shock', brows: 'worried', mouth: 'scream' });
      s.dottie.expr(full); s.bean.expr({ eyes: 'wide', brows: 'worried', mouth: 'teeth' }); } },
  { id: 'workoff', line: 'L28', pad: [0.07, 0.2], music: 'comedy',
    shots: [{ ...inTwo, focus: 'bean' }],
    sfx: [{ at: 0.1, name: 'ding', gain: 0.6 }],
    act(s, c) { inside(s); s.pickle.pose({ armL: [165, 24, 0], armR: [165, 24, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'o' });
      const k = backOut(seg(c.t, 0.05, 0.3)); s.bean.pose({ armR: [150 * k, 20, 0], armL: idle, head: [16, 0, 6], lift: sin(k * PI) * 0.05 }).expr({ eyes: 'happy', brows: 'raised', mouth: 'grin' });
      s.dottie.pose({ armL: [150 * k, 20, 0], armR: idle, head: [16, 0, -6] }).expr({ eyes: 'happy', brows: 'raised', mouth: 'smile', blush: 1 }); } },
  { id: 'isback', line: 'L29',
    shots: [{ on: 'max', dist: 1.0, yaw: 6, pitch: 3 }, doorPOV],
    sfx: [{ at: 0, name: 'creak', gain: 0.5 }, { at: 0.1, name: 'ding', gain: 0.5 }],
    act(s, c) { inside(s); const t = easeOut(seg(c.t, 0.2, 0.5));
      show(s.max).at(...IM, 180).hold('cup', s.items.cup, true).pose({ armR: [70, 0, 0], armL: [150 * seg(c.t, 0, 0.2), 20, 0], head: [-4, 0, 6] }).expr({ eyes: 'open', brows: 'raised', mouth: 'smile' });
      s.pickle.at(10.4, -5.0, lerp(faceTo(IP, [9.38, -5.3]), 0, t)).pose({ head: [-6, 0, 0] }).expr({ eyes: 'wide', brows: 'raised', mouth: 'o' });
      s.bean.at(...IB, 0).pose({ head: [10, 0, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'o' }); s.dottie.at(...ID, 0).pose({ head: [10, 0, 0] }).expr({ eyes: 'shock', brows: 'worried', mouth: 'o', blush: 1 }); } },
  { id: 'no', line: 'L30', also: [{ line: 'L31', at: 0.03 }], pad: [0.05, 0.2], inFrame: [],
    shots: [{ ...doorPOV, shake: 1, dolly: [0, 0, -0.25] }],
    sfx: [{ at: 0, name: 'boom', gain: 0.5 }],
    act(s, c) { inside(s); const sh = sin(c.t * 30) * 8;
      s.pickle.at(10.4, -5.0, 0).pose({ armL: [150, 30 + sh, 0], armR: [150, 30 - sh, 0], head: [-6, 0, 0] }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream', open: 0.9 });
      s.bean.at(...IB, 0).pose({ armL: [150, 30 - sh, 0], armR: [150, 30 + sh, 0], head: [10, 0, 0], lift: 0.04 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream' });
      s.dottie.at(...ID, 0).pose({ armL: [150, 30 + sh, 0], armR: [150, 30 - sh, 0], head: [10, 0, 0], lift: 0.04 }).expr({ eyes: 'angry', brows: 'angry', mouth: 'scream', blush: 1 }); } },
  { id: 'button', dur: 1.0, music: 'button', focus: 'max', inFrame: ['max'],
    shots: [{ on: 'max', dist: 1.0, yaw: -8, pitch: 3 }],
    sfx: [{ at: 0.45, name: 'chomp', gain: 0.5 }, { at: 0.7, name: 'ding', gain: 0.6 }],
    act(s, c) { inside(s); const k = easeOut(seg(c.t, 0.15, 0.45));
      show(s.max).at(...IM, 180).hold('cup', s.items.cup, true).pose({ armR: [70 + 50 * k, -6 * k, 0], armL: idle, head: [-4 + 10 * k, 0, 0] }).expr(k > 0.6 ? { eyes: 'closed', brows: 'raised', mouth: 'o' } : { eyes: 'open', brows: 'worried', mouth: 'flat' }); } },
];
