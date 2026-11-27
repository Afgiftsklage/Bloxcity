// Blox City — an open-world style seaside town built entirely in code (EP04 onward). Toy look: rounded boxes, flat saturated colours.
// One avenue runs along x (z = 0 is the centre line, traffic toward +x uses the near lane z = +1.5).
//   x -10..16 beach strip + Mama Lu's Diner | 16..34 street market | 34..46 downtown crossing + donut shop | 50..58 drawbridge | 62..80 the pier
// Everything is registered with stage.add(), so shots.js can move any named object and it snaps back every frame.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PAL = { pink: '#ff7fa0', yellow: '#ffd166', teal: '#3fd0c9', peach: '#f9a26c', mint: '#a8ecd6', lilac: '#c9a9e9', white: '#fff4e6', coral: '#ff6b5e', sky: '#7cc6fe' };
let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };   // seeded: every render worker builds the same city
const mats = new Map();
const mat = (color, o = {}) => { const k = color + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.62, ...o })); return mats.get(k); };
const glow = (color, i = 2.5) => mat(color, { emissive: color, emissiveIntensity: i });

export function box(name, w, h, d, color, x = 0, y = 0, z = 0, r = 0.05, parent = null) {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const m = new THREE.Mesh(rr > 0.004 ? new RoundedBoxGeometry(w, h, d, 3, rr) : new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color);
  m.name = name; m.position.set(x, y, z); parent?.add(m); return m;
}
export function cyl(name, r, h, color, x = 0, y = 0, z = 0, parent = null, r2 = r, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), typeof color === 'string' ? mat(color) : color);
  m.name = name; m.position.set(x, y, z); parent?.add(m); return m;
}
export function ball(name, r, color, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), typeof color === 'string' ? mat(color) : color);
  m.name = name; m.position.set(x, y, z); parent?.add(m); return m;
}
const group = (name, x = 0, y = 0, z = 0, parent = null) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent?.add(g); return g; };

function sign(text, { w = 2, h = 0.5, bg = '#1b1f3b', color = '#fff', px = 1024, emissive = 0.9, font = null, sub = null } = {}) {
  const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w); const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lines = [].concat(text), fs = Math.min(cv.height / lines.length * 0.74, cv.width / Math.max(...lines.map(l => l.length)) * 1.5);
  c.font = font ?? `bold ${Math.round(fs)}px "DejaVu Sans", sans-serif`;
  lines.forEach((t, i) => c.fillText(t, cv.width / 2, cv.height * (i + 0.5) / lines.length + fs * 0.04));
  sub?.(c, cv);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#fff', emissiveMap: tex, emissiveIntensity: emissive, side: THREE.DoubleSide }));
}
export const makeSign = sign;

// window-grid facade texture (lit windows glow)
function facade(color, cols, rows, lit = 0.45) {
  const cv = document.createElement('canvas'), ev = document.createElement('canvas'); cv.width = ev.width = 256; cv.height = ev.height = 256;
  const c = cv.getContext('2d'), e = ev.getContext('2d'); c.fillStyle = color; c.fillRect(0, 0, 256, 256); e.fillStyle = '#000'; e.fillRect(0, 0, 256, 256);
  const cw = 256 / cols, ch = 256 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = rnd() < lit, x = i * cw + cw * 0.2, y = j * ch + ch * 0.2, w = cw * 0.6, h = ch * 0.6;
    c.fillStyle = on ? '#ffe7a3' : '#2c4a66'; c.fillRect(x, y, w, h); if (on) { e.fillStyle = '#ffd98a'; e.fillRect(x, y, w, h); }
  }
  const t = new THREE.CanvasTexture(cv), te = new THREE.CanvasTexture(ev); t.colorSpace = te.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, emissive: '#fff', emissiveMap: te, emissiveIntensity: 0.8 });
}
function building(parent, name, x, z, w, h, d, color, { cols = 4, rows = 5, roof = PAL.white, lit = 0.45 } = {}) {
  const g = group(name, x, 0, z, parent);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facade(color, cols, rows, lit)); b.name = name + 'Body'; b.position.y = h / 2; g.add(b);
  box(name + 'Roof', w + 0.3, 0.3, d + 0.3, roof, 0, h + 0.15, 0, 0.1, g);
  return g;
}
function palm(parent, name, x, z, h = 4.6, lean = 0.12) {
  const g = group(name, x, 0, z, parent); let px = 0, py = 0;
  for (let i = 0; i < 6; i++) { const sh = h / 6; const s = cyl(name + 'T' + i, 0.17 - i * 0.012, sh + 0.04, i % 2 ? '#a9794e' : '#b98659', px, py + sh / 2, 0, g, 0.16 - i * 0.012, 10); s.rotation.z = -lean * i * 0.5; px += Math.sin(lean * i * 0.5) * sh; py += sh; }
  const top = group(name + 'Top', px, py, 0, g);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, lf = group(name + 'L' + i, 0, 0, 0, top); lf.rotation.y = a;
    const l1 = box(name + 'La' + i, 1.1, 0.05, 0.42, i % 2 ? '#2fae5b' : '#27994f', 0.5, 0.1, 0, 0.02, lf); l1.rotation.z = 0.25; const l2 = box(name + 'Lb' + i, 1.0, 0.05, 0.34, '#3cc46c', 1.38, -0.02, 0, 0.02, lf); l2.rotation.z = -0.45; }
  [[0.14, 0], [-0.1, 0.12], [-0.06, -0.14]].forEach(([cx, cz], i) => ball(name + 'C' + i, 0.13, '#6b4a2b', cx, -0.12, cz, top));
  return g;
}
function wheel(name, r, x, y, z, parent, w = 0.16) { const t = cyl(name, r, w, '#22232b', x, y, z, parent, r, 18); t.rotation.x = Math.PI / 2; const hub = cyl(name + 'Hub', r * 0.5, w + 0.02, '#d9dde6', 0, 0, 0, t, r * 0.5, 12); return t; }

// car: origin on the ground, nose toward +x
function car(name, color, { cop = false, taxi = false } = {}) {
  const g = group(name);
  box(name + 'Body', 2.5, 0.52, 1.25, color, 0, 0.52, 0, 0.16, g);
  box(name + 'Cabin', 1.35, 0.46, 1.08, cop ? '#f4f6fb' : color, -0.12, 0.98, 0, 0.14, g);
  box(name + 'Glass', 1.4, 0.3, 1.1, mat('#1d3350', { roughness: 0.15, metalness: 0.3 }), -0.12, 0.99, 0, 0.05, g);
  box(name + 'GlassS', 1.1, 0.3, 1.14, mat('#1d3350', { roughness: 0.15, metalness: 0.3 }), -0.12, 0.99, 0, 0.05, g);
  box(name + 'BumperF', 0.14, 0.18, 1.22, '#d9dde6', 1.24, 0.36, 0, 0.05, g); box(name + 'BumperR', 0.14, 0.18, 1.22, '#d9dde6', -1.24, 0.36, 0, 0.05, g);
  for (const s of [-1, 1]) { ball(name + 'HeadL' + s, 0.1, glow('#fff3c4', 3), 1.24, 0.56, 0.42 * s, g); box(name + 'Tail' + s, 0.06, 0.12, 0.26, glow('#ff3b30', 1.6), -1.26, 0.58, 0.42 * s, 0.02, g);
    wheel(name + 'WF' + s, 0.27, 0.78, 0.27, 0.6 * s, g); wheel(name + 'WR' + s, 0.27, -0.78, 0.27, 0.6 * s, g); }
  if (cop) {
    box(name + 'Stripe', 2.52, 0.2, 1.27, '#1f3f8f', 0, 0.5, 0, 0.05, g);
    box(name + 'BarBase', 0.26, 0.06, 0.8, '#30333d', -0.12, 1.24, 0, 0.02, g);
    box(name + 'LightR', 0.22, 0.13, 0.34, mat('#ff2d2d', { emissive: '#ff2d2d', emissiveIntensity: 0.3 }).clone(), -0.12, 1.32, 0.2, 0.04, g);
    box(name + 'LightB', 0.22, 0.13, 0.34, mat('#2d6bff', { emissive: '#2d6bff', emissiveIntensity: 0.3 }).clone(), -0.12, 1.32, -0.2, 0.04, g);
    for (const s of [-1, 1]) { const l = sign('POLICE', { w: 0.9, h: 0.2, bg: '#1f3f8f', color: '#fff', px: 256, emissive: 0.25 }); l.position.set(0.25, 0.52, 0.64 * s); if (s < 0) l.rotation.y = Math.PI; g.add(l); }
  }
  if (taxi) { const l = sign('TAXI', { w: 0.5, h: 0.18, bg: '#22232b', color: '#ffd166', px: 256, emissive: 1.5 }); l.position.set(-0.12, 1.31, 0.01); g.add(l); const l2 = l.clone(); l2.rotation.y = Math.PI; l2.position.z = -0.01; g.add(l2); box(name + 'TaxiBox', 0.52, 0.2, 0.1, '#22232b', -0.12, 1.31, 0, 0.02, g); }
  return g;
}
// scooter / motorbike: origin on the ground between the wheels, nose toward +x
function scooter(name, color, { big = false } = {}) {
  const g = group(name), R = big ? 0.3 : 0.2, L = big ? 0.62 : 0.46;
  wheel(name + 'WF', R, L, R, 0, g, 0.12); wheel(name + 'WR', R, -L, R, 0, g, 0.14);
  box(name + 'Deck', big ? 0.9 : 0.86, big ? 0.3 : 0.1, 0.3, color, 0, big ? 0.52 : 0.3, 0, 0.04, g);
  box(name + 'Tail', 0.52, 0.3, 0.32, color, -0.3, 0.52, 0, 0.1, g);
  box(name + 'Seat', 0.5, 0.1, 0.3, '#2a2d3a', -0.2, 0.71, 0, 0.04, g);
  const col = cyl(name + 'Col', 0.045, 0.82, '#d9dde6', L - 0.1, 0.68, 0, g, 0.045, 10); col.rotation.z = 0.28;
  box(name + 'Shield', 0.1, 0.5, 0.34, color, L - 0.07, 0.55, 0, 0.05, g).rotation.z = 0.28;
  box(name + 'Bar', 0.06, 0.06, 0.62, '#2a2d3a', L - 0.22, 1.08, 0, 0.025, g);
  for (const s of [-1, 1]) box(name + 'Grip' + s, 0.08, 0.08, 0.12, '#111', L - 0.22, 1.08, 0.3 * s, 0.03, g);
  ball(name + 'Lamp', 0.09, glow('#fff3c4', 3), L - 0.1, 0.98, 0, g);
  box(name + 'Fender', 0.36, 0.06, 0.16, color, L, R * 2 + 0.03, 0, 0.03, g);
  box(name + 'Rack', 0.4, 0.04, 0.36, '#d9dde6', -0.62, 0.72, 0, 0.02, g);
  box(name + 'TailLamp', 0.05, 0.08, 0.2, glow('#ff3b30', 1.6), -0.84, 0.62, 0, 0.02, g);
  return g;
}

export async function build(s) {
  seed = 7;
  const tl = new THREE.TextureLoader(), tex = async (n, rx, ry) => { const o = {}; for (const [k, key, cs] of [['diff', 'map', 1], ['nor', 'normalMap', 0], ['rough', 'roughnessMap', 0]]) { const t = await tl.loadAsync(`/tex/${n}_${k}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; if (cs) t.colorSpace = THREE.SRGBColorSpace; o[key] = t; } return o; };
  // stylised sunset sky (equirect gradient + sun disc + soft clouds); the HDRI still lights the scene
  { const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 1024);
    [[0, '#1c2a6b'], [0.22, '#3b3f9a'], [0.36, '#8a4fb0'], [0.44, '#e0629a'], [0.49, '#ff9966'], [0.515, '#ffd08a'], [0.56, '#ff9a7a'], [1, '#c96a7a']].forEach(([t, col]) => g.addColorStop(t, col)); c.fillStyle = g; c.fillRect(0, 0, 2048, 1024);
    const sx = 2048 * 0.42, sy = 1024 * 0.468, rg = c.createRadialGradient(sx, sy, 0, sx, sy, 330); rg.addColorStop(0, 'rgba(255,244,200,1)'); rg.addColorStop(0.09, 'rgba(255,236,170,1)'); rg.addColorStop(0.1, 'rgba(255,200,120,0.55)'); rg.addColorStop(1, 'rgba(255,160,110,0)'); c.fillStyle = rg; c.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 26; i++) { const x = rnd() * 2048, y = 1024 * (0.3 + rnd() * 0.16), w = 120 + rnd() * 260, h = 10 + rnd() * 16; c.fillStyle = `rgba(255,${170 + Math.round(rnd() * 50)},${170 + Math.round(rnd() * 40)},${0.18 + rnd() * 0.2})`; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + (rnd() - 0.5) * w * 0.6, y + (rnd() - 0.5) * h, w * (0.3 + rnd() * 0.3), h * (0.6 + rnd() * 0.6), 0, 0, 7); c.fill(); } }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; s.scene.background = t; s.scene.backgroundIntensity = 1; s.scene.backgroundRotation.set(0, Math.PI, 0); }
  s.scene.fog = new THREE.Fog('#f2a58f', 45, 230);
  s.camera.far = 320;
  const world = group('World');
  const slab = (name, x0, x1, z0, z1, y, material, h = 0.02) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), material); m.name = name; m.position.set((x0 + x1) / 2, y - h / 2, (z0 + z1) / 2); world.add(m); return m; };
  const asphalt = async (rx, ry) => new THREE.MeshStandardMaterial({ ...(await tex('asphalt', rx, ry)), color: '#8d8fa0', roughness: 1 });
  const pave = async (rx, ry) => new THREE.MeshStandardMaterial({ ...(await tex('pavement', rx, ry)), color: '#f3e3d0', roughness: 1 });
  const planks = async (rx, ry) => new THREE.MeshStandardMaterial({ ...(await tex('planks', rx, ry)), color: '#ffd9a8', roughness: 1 });

  // ---------------------------------------------------------------- ground
  slab('RoadA', -40, 50, -3, 3, 0, await asphalt(30, 2)); slab('RoadB', 58, 120, -3, 3, 0, await asphalt(20, 2));
  slab('RoadCross', 37.5, 42.5, -60, -3, 0, await asphalt(2, 19));
  for (const [n, z0, z1] of [['SidewalkN', -5, -3], ['SidewalkS', 3, 5]]) { slab(n + 'A', -40, 50, z0, z1, 0.12, await pave(45, 1), 0.14); slab(n + 'B', 58, 120, z0, z1, 0.12, await pave(31, 1), 0.14); }
  slab('FloorPlazaA', -40, 37.5, -40, -5, 0.1, mat('#e6d3bd'), 0.12); slab('FloorPlazaB', 42.5, 50, -40, -5, 0.1, mat('#e6d3bd'), 0.12); slab('FloorPlazaC', 58, 120, -40, -5, 0.1, mat('#e6d3bd'), 0.12);
  slab('FloorSandA', -40, 50, 5, 15, 0.08, mat('#f4dca4', { roughness: 0.95 }), 0.1); slab('FloorSandB', 58, 64, 5, 15, 0.08, mat('#f4dca4', { roughness: 0.95 }), 0.1); slab('FloorSandC', 80, 120, 5, 15, 0.08, mat('#f4dca4', { roughness: 0.95 }), 0.1);
  slab('FloorWater', -120, 200, -70, 160, -0.7, mat('#19b9c9', { roughness: 0.08, metalness: 0.35 }), 0.1);
  slab('FloorPier', 64, 80, 5, 18, 0.12, await planks(8, 6), 0.3);
  for (let x = 65; x <= 79; x += 3.5) for (const z of [8, 17.3]) cyl('PierPost', 0.18, 1.2, '#8a5a36', x, -0.55, z, world, 0.18, 10);
  for (let x = -39; x < 120; x += 3) { if (x > 48.5 && x < 58.5) continue; box('RoadDash', 1.3, 0.012, 0.13, '#fff1c9', x, 0.008, 0, 0, world); }
  for (const z of [-2.8, 2.8]) for (const [x0, x1] of [[-40, 50], [58, 120]]) box('RoadEdge', x1 - x0, 0.012, 0.09, '#f3f0e8', (x0 + x1) / 2, 0.008, z, 0, world);
  for (let i = 0; i < 6; i++) box('RoadZebra', 0.45, 0.012, 5.2, '#f3f0e8', 34.2 + i * 0.75 - 1.9 + 1.9, 0.008, 0, 0, world);       // crossing before the lights
  // canal walls under the drawbridge
  for (const x of [49.85, 58.15]) box('CanalWall', 0.3, 1.6, 100, '#b9b2a6', x, -0.8, 0, 0.05, world);

  // ---------------------------------------------------------------- skyline + street fronts (north side)
  const cols = Object.values(PAL);
  for (let x = -38, i = 0; x < 118; i++) {                              // far towers
    const w = 5 + rnd() * 4, h = 10 + rnd() * 16; if (!(x + w > 36.5 && x < 43.5)) building(world, 'Tower' + i, x + w / 2, -24 - rnd() * 8, w, h, 7, ['#6d7fb3', '#8a6fb0', '#5f8fb5', '#b07a9c', '#7a86c2'][i % 5], { cols: 5, rows: Math.round(h / 1.6), lit: 0.5 }); x += w + 0.6 + rnd() * 2;
  }
  const fronts = [[-33, 6, 5.5], [-26, 7, 7], [-18, 6, 4.5], [-11, 6.5, 6.5], [13.5, 6, 6], [20, 6, 4.6], [26.5, 6, 7.5], [46.5, 6, 6.5], [62, 6.5, 5], [69, 6, 7.5], [76, 7, 5.5], [84, 7, 8], [92, 7, 6], [100, 7, 7], [108, 7, 5]];
  fronts.forEach(([x, w, h], i) => { const g = building(world, 'Shop' + i, x, -8.6, w, h, 7, cols[(i * 3 + 1) % cols.length], { cols: Math.round(w / 1.5), rows: Math.max(2, Math.round(h / 1.7)), roof: i % 2 ? PAL.white : '#ffe9b8' });
    box('Awning' + i, w * 0.8, 0.14, 1.0, [PAL.coral, PAL.teal, PAL.yellow, PAL.pink][i % 4], 0, 2.25, 3.9, 0.05, g).rotation.x = 0.22; box('Door' + i, 0.9, 1.7, 0.08, '#3a2f4a', 0, 0.95, 3.52, 0.03, g); });

  // Mama Lu's Diner
  const diner = group('Diner', 6, 0, -8.2, world);
  box('DinerBody', 7.4, 3.3, 6, PAL.pink, 0, 1.75, 0, 0.25, diner); box('DinerBand', 7.5, 0.42, 6.1, PAL.teal, 0, 2.55, 0, 0.12, diner); box('DinerRoof', 7.8, 0.3, 6.4, PAL.white, 0, 3.5, 0, 0.12, diner);
  box('DinerWin', 5.2, 1.15, 0.1, mat('#bfefff', { emissive: '#ffe2a8', emissiveIntensity: 0.3, roughness: 0.2 }), -0.7, 1.6, 3.0, 0.04, diner); box('DinerDoor', 1.0, 2.0, 0.1, PAL.teal, 2.8, 1.12, 3.0, 0.05, diner);
  box('DinerAwn', 7.4, 0.14, 1.3, PAL.white, 0, 2.3, 3.6, 0.05, diner).rotation.x = 0.2;
  for (let i = 0; i < 7; i++) box('DinerStripe' + i, 0.52, 0.15, 1.31, PAL.coral, -3.12 + i * 1.04, 2.3, 3.6, 0.05, diner).rotation.x = 0.2;
  const ds = sign("MAMA LU'S", { w: 5.2, h: 1.15, bg: '#2a1038', color: '#ffe36e', emissive: 2.0 }); ds.position.set(0, 4.35, 2.2); diner.add(ds); box('DinerSignBack', 5.5, 1.4, 0.18, '#2a1038', 0, 4.35, 2.08, 0.06, diner);
  const dd = sign('DINER', { w: 1.6, h: 0.45, bg: '#14a39a', color: '#fff', px: 512, emissive: 1.4 }); dd.position.set(-0.7, 2.56, 3.07); diner.add(dd);
  // donut shop on the corner (giant donut on the roof)
  const donut = group('DonutShop', 33.6, 0, -8.2, world);
  box('DonutBody', 6.4, 3.2, 6, PAL.yellow, 0, 1.7, 0, 0.25, donut); box('DonutRoof', 6.8, 0.3, 6.4, PAL.white, 0, 3.4, 0, 0.12, donut);
  box('DonutWin', 4.4, 1.2, 0.1, mat('#bfefff', { emissive: '#ffe2a8', emissiveIntensity: 0.3, roughness: 0.2 }), -0.5, 1.6, 3.0, 0.04, donut); box('DonutDoor', 0.95, 1.9, 0.1, PAL.coral, 2.4, 1.07, 3.0, 0.05, donut);
  const dn = sign('DONUTS', { w: 3.6, h: 0.7, bg: '#ff5fa2', color: '#fff', emissive: 1.6 }); dn.position.set(-0.4, 2.72, 3.07); donut.add(dn);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.5, 14, 28), mat('#e9a25a')); ring.name = 'BigDonut'; ring.position.set(0, 5.1, 0.6); donut.add(ring);
  const ice = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.44, 12, 28, Math.PI * 2), mat('#ff78b4', { roughness: 0.35 })); ice.name = 'BigDonutIcing'; ice.position.set(0, 5.1, 0.76); ice.scale.z = 0.7; donut.add(ice);
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, sp = box('Sprinkle' + i, 0.2, 0.06, 0.06, ['#fff', '#ffe36e', '#59d3ff', '#7dff8a'][i % 4], Math.cos(a) * 1.05, 5.1 + Math.sin(a) * 1.05, 1.1, 0.02, donut); sp.rotation.z = rnd() * 3; }
  cyl('DonutPole', 0.12, 1.1, '#d9dde6', 0, 3.95, 0.6, donut);

  // billboard + bus stop
  const bb = group('Billboard', -5, 0, -6.4, world); for (const sx of [-2.2, 2.2]) cyl('BillPole', 0.12, 4.2, '#d9dde6', sx, 2.1, 0, bb);
  box('BillBack', 6.2, 2.4, 0.2, '#22264a', 0, 4.9, 0, 0.08, bb);
  const bs = sign(['WELCOME TO', 'BLOX CITY'], { w: 5.8, h: 2.0, bg: '#ff5f7e', color: '#fff', emissive: 0.8, sub: (c, cv) => { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(cv.width * 0.88, cv.height * 0.22, cv.height * 0.13, 0, 7); c.fill(); } }); bs.position.set(0, 4.9, 0.11); bb.add(bs);
  const stop = group('BusStop', -1.2, 0.12, -4.3, world); box('BusRoof', 2.6, 0.1, 1.1, PAL.teal, 0, 2.1, 0, 0.04, stop); box('BusBack', 2.6, 1.6, 0.06, mat('#bfefff', { roughness: 0.2, transparent: true, opacity: 0.55 }), 0, 1.25, -0.5, 0.02, stop); box('BusBench', 2.0, 0.1, 0.45, '#ffd166', 0, 0.48, -0.2, 0.04, stop);
  for (const sx of [-1.2, 1.2]) cyl('BusPole', 0.05, 2.1, '#d9dde6', sx, 1.05, -0.5, stop);

  // street furniture
  for (let x = -34; x < 118; x += 9) { if (x > 46 && x < 61) continue; const lp = group('Lamp', x + 2, 0.12, -3.5, world); cyl('LampPole', 0.07, 3.6, '#3a3f55', 0, 1.8, 0, lp); box('LampArm', 0.08, 0.08, 1.2, '#3a3f55', 0, 3.6, 0.5, 0.03, lp); ball('LampBulb', 0.16, glow('#ffe2a8', 3), 0, 3.5, 1.05, lp); }
  for (const [x, z] of [[11, -3.6], [44, 3.6], [61, -3.6]]) { const h = group('Hydrant', x, 0.12, z, world); cyl('HydBody', 0.13, 0.5, '#ff4b3e', 0, 0.25, 0, h); ball('HydTop', 0.14, '#ff4b3e', 0, 0.52, 0, h); box('HydArm', 0.42, 0.1, 0.1, '#ff4b3e', 0, 0.32, 0, 0.04, h); }
  for (const [x, z] of [[2.2, -3.7], [16.5, 3.7], [45, -3.7]]) { cyl('Bin', 0.24, 0.7, '#3aa76d', x, 0.47, z, world, 0.28); }
  for (let i = 0, x = -36; x < 47; x += 5.5, i++) palm(world, 'Palm' + i, x, 6.2 + (i % 2) * 1.6, 4.2 + (i % 3) * 0.5, i % 2 ? 0.14 : -0.1);
  for (let i = 0; i < 6; i++) palm(world, 'PalmN' + i, [-22, -8, 11.2, 47.5, 60, 81][i], -4.4, 3.8 + (i % 2) * 0.6, i % 2 ? 0.08 : -0.08);
  // beach bits
  for (const [x, z, c] of [[3, 9, PAL.coral], [9.5, 10.5, PAL.yellow], [24, 9.2, PAL.teal], [31, 11, PAL.pink]]) { const u = group('Umbrella', x, 0.08, z, world); cyl('UmbPole', 0.04, 2.0, '#fff', 0, 1.0, 0, u); const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.5, 12), mat(c)); cone.name = 'UmbTop'; cone.position.y = 2.1; u.add(cone); box('Towel', 1.7, 0.03, 0.8, c === PAL.yellow ? PAL.teal : PAL.white, 0.9, 0.02, 0.5, 0.01, u); }

  // street market (x 18..32): pennant lines, a fruit stand (south) and a hot dog cart (north)
  for (const x of [17, 24.5, 32]) { for (const z of [-3.4, 3.4]) cyl('FlagPole', 0.06, 3.4, '#fff', x, 1.8, z, world); box('FlagLine', 0.03, 0.03, 6.8, '#fff', x, 3.4, 0, 0, world);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 3), mat([PAL.coral, PAL.yellow, PAL.teal, PAL.pink][i % 4])); f.name = 'Flag'; f.rotation.set(Math.PI, 0, 0); f.rotation.y = Math.PI / 2; f.position.set(x, 3.12, -2.8 + i * 0.7); f.scale.z = 0.15; world.add(f); } }
  const fs = group('FruitStand', 22, 0, 2.35); box('FruitTable', 2.0, 0.12, 1.0, '#c98a4b', 0, 0.8, 0, 0.04, fs); for (const [sx, sz] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) box('FruitLeg', 0.1, 0.8, 0.1, '#a8703a', sx, 0.4, sz, 0.02, fs);
  for (const sx of [-0.95, 0.95]) cyl('FruitPole', 0.04, 1.4, '#fff', sx, 1.55, 0.45, fs); box('FruitAwn', 2.3, 0.1, 1.3, PAL.white, 0, 2.25, 0, 0.04, fs).rotation.x = -0.15; for (let i = 0; i < 4; i++) box('FruitAwnS' + i, 0.3, 0.11, 1.31, '#3cc46c', -0.86 + i * 0.58, 2.25, 0, 0.04, fs).rotation.x = -0.15;
  for (let i = 0; i < 3; i++) box('Crate' + i, 0.56, 0.2, 0.7, '#e2b072', -0.64 + i * 0.64, 0.96, 0, 0.03, fs);
  s.add(fs);
  const fruits = []; for (let i = 0; i < 18; i++) { const k = Math.floor(i / 6), f = ball('Fruit' + i, 0.11, ['#ff4b3e', '#ffb02e', '#8bd13f'][k], 22 - 0.64 + k * 0.64 - 0.14 + (i % 2) * 0.28, 1.13 + (i % 6 > 3 ? 0.14 : 0), 2.35 - 0.2 + ((i >> 1) % 3) * 0.2); fruits.push(f); s.add(f); }
  const cart = group('HotdogCart', 30, 0, -2.3); box('CartBody', 1.5, 0.7, 0.8, '#ff4b3e', 0, 0.75, 0, 0.08, cart); box('CartTop', 1.6, 0.08, 0.9, '#f3f0e8', 0, 1.13, 0, 0.03, cart);
  for (const sx of [-0.5, 0.5]) wheel('CartW' + sx, 0.26, sx, 0.26, 0.42, cart, 0.08); cyl('CartPole', 0.04, 1.5, '#fff', 0, 1.9, 0, cart);
  const um = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 12), mat(PAL.yellow)); um.name = 'CartUmb'; um.position.y = 2.7; cart.add(um);
  const hs = sign('HOT DOGS', { w: 1.3, h: 0.36, bg: '#fff', color: '#e23b2e', px: 512, emissive: 0.3 }); hs.position.set(0, 0.76, 0.41); cart.add(hs);
  s.add(cart);
  for (let i = 0; i < 6; i++) { const h = group('Hotdog' + i, 30 - 0.5 + i * 0.2, 1.22, -2.3 + (i % 2) * 0.16 - 0.08); const bun = cyl('HotdogBun' + i, 0.06, 0.3, '#e9b872', 0, 0, 0, h, 0.06, 10); bun.rotation.z = Math.PI / 2; const sa = cyl('HotdogSaus' + i, 0.04, 0.36, '#c5482f', 0, 0.035, 0, h, 0.04, 10); sa.rotation.z = Math.PI / 2; s.add(h); }

  // traffic light over the avenue at the crossing (x 37.5)
  const tlg = group('TrafficLight', 36.6, 0.12, 3.5, world); cyl('TLPole', 0.09, 4.4, '#3a3f55', 0, 2.2, 0, tlg); box('TLArm', 0.1, 0.1, 3.6, '#3a3f55', 0, 4.3, -1.75, 0.03, tlg);
  const tlb = group('TLBox', 0, 3.75, -2.6, tlg); box('TLCase', 0.36, 1.05, 0.34, '#22232b', 0, 0, 0, 0.06, tlb);
  s.tl = {}; [['Red', '#ff2d2d', 0.33], ['Yellow', '#ffc531', 0], ['Green', '#35e06a', -0.33]].forEach(([n, c, y]) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.1, roughness: 0.4 }); for (const sx of [-1, 1]) ball('TL' + n + sx, 0.13, m, 0.15 * sx, y, 0, tlb); s.tl[n] = m; });

  // drawbridge: two leaves hinged at x 50 and x 58
  for (const [n, x, dir] of [['BridgeL', 50, 1], ['BridgeR', 58, -1]]) { const b = group(n, x, 0, 0); const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 10), await asphalt(1.3, 3.3)); deck.name = n + 'Deck'; deck.position.set(2 * dir, -0.15, 0); b.add(deck);
    for (const z of [-4.9, 4.9]) box(n + 'Rail', 4, 0.5, 0.14, PAL.coral, 2 * dir, 0.35, z, 0.05, b); box(n + 'Lip', 0.16, 0.06, 6, '#ffd166', 3.9 * dir, 0.02, 0, 0.02, b); s.add(b); }
  for (const [x, z] of [[49.3, -5.6], [49.3, 5.6], [58.7, -5.6], [58.7, 5.6]]) { const t = group('BridgeTower', x, 0, z, world); box('BTBody', 1.1, 3.4, 1.1, PAL.white, 0, 1.7, 0, 0.12, t); box('BTCap', 1.4, 0.3, 1.4, PAL.coral, 0, 3.55, 0, 0.1, t); ball('BTLamp', 0.2, glow('#ff4b3e', 2.5), 0, 3.95, 0, t); }
  const gate = group('BridgeGate', 48.6, 0.12, -3.3); cyl('GatePost', 0.1, 1.2, '#f3f0e8', 0, 0.6, 0, gate); const arm = group('GateArm', 0, 1.1, 0, gate); for (let i = 0; i < 6; i++) box('GateSeg' + i, 0.14, 0.14, 1.0, i % 2 ? '#fff' : '#ff3b30', 0, 0, 0.55 + i * 1.0, 0.03, arm); s.add(gate);

  // the pier: birthday party
  const party = group('Party', 72, 0.12, 11, world);
  box('PartyTable', 2.6, 0.1, 1.1, PAL.white, 0, 0.8, 0, 0.04, party); for (const [sx, sz] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4]]) box('PartyLeg', 0.1, 0.8, 0.1, '#d9dde6', sx, 0.4, sz, 0.02, party);
  box('PartyCloth', 2.7, 0.03, 1.2, PAL.teal, 0, 0.86, 0, 0.01, party);
  for (const sx of [-1.95, 1.95]) cyl('BannerPole', 0.07, 4.0, '#fff', sx, 2.0, 2.4, party);
  const ban = sign(['HAPPY BIRTHDAY', 'CHIEF!'], { w: 3.7, h: 1.3, bg: '#ff5f7e', color: '#fff', emissive: 0.7 }); ban.name = 'Banner'; ban.position.set(0, 3.2, 2.4); ban.rotation.y = Math.PI; party.add(ban);
  for (let i = 0; i < 12; i++) ball('PartyBulb' + i, 0.08, glow(['#ffe36e', '#ff7fa0', '#59d3ff'][i % 3], 3), -1.87 + i * 0.34, 2.42 - Math.sin(i / 11 * Math.PI) * 0.16, 2.4, party);
  for (const [n, x, z, c] of [['Gift0', -0.9, 0.1, PAL.yellow], ['Gift1', 0.95, -0.15, PAL.lilac]]) { box(n, 0.34, 0.28, 0.34, c, x, 1.02, z, 0.04, party); box(n + 'R', 0.36, 0.08, 0.08, '#fff', x, 1.18, z, 0.02, party); }
  s.balloons = []; for (let i = 0; i < 10; i++) { const b = group('Balloon' + i, 72 + [-2.3, 2.3][i % 2] + (rnd() - 0.5) * 0.7, 2.4 + rnd() * 1.6, 13.4 + (rnd() - 0.5) * 0.6); const sp = ball('BalloonBall' + i, 0.32, mat([PAL.coral, PAL.yellow, PAL.teal, PAL.pink, PAL.lilac][i % 5], { roughness: 0.25 }), 0, 0, 0, b); sp.scale.y = 1.2; cyl('BalloonStr' + i, 0.008, 1.6, '#fff', 0, -1.15, 0, b, 0.008, 5); s.add(b, s.scene, false); s.balloons.push(b); }
  for (const [x, z] of [[65, 6.5], [79, 6.5], [65, 17], [79, 17]]) { cyl('PierLampPole', 0.07, 2.6, '#fff', x, 1.4, z, world); ball('PierLamp', 0.2, glow('#ffe2a8', 3), x, 2.8, z, world); }
  const ps = sign('THE PIER', { w: 3.4, h: 0.8, bg: '#14a39a', color: '#fff', emissive: 1.1 }); ps.position.set(72, 3.3, 5.14); ps.rotation.y = Math.PI; world.add(ps); for (const sx of [-1.9, 1.9]) cyl('PierSignPole', 0.08, 3.6, '#fff', 72 + sx, 1.9, 5.3, world); box('PierSignBack', 3.7, 1.0, 0.12, '#14a39a', 72, 3.3, 5.22, 0.05, world);

  s.add(world);

  // ---------------------------------------------------------------- vehicles + props (all movable from shots.js)
  s.add(scooter('Scooter', '#ffd166')); s.add(scooter('Bike', '#6c3fd1', { big: true }));
  for (let i = 0; i < 3; i++) s.add(car('Cop' + i, '#f4f6fb', { cop: true }));
  [['Taxi', '#ffc531', { taxi: true }], ['CarRed', '#ff5a4d', {}], ['CarBlue', '#3f8cff', {}], ['CarMint', '#58d6b0', {}]].forEach(([n, c, o]) => s.add(car(n, c, o)));
  s.copLights = [0, 1, 2].map(i => ({ r: s.obj(`Cop${i}LightR`).material, b: s.obj(`Cop${i}LightB`).material }));
  // the mystery box (lid + cake inside)
  const pk = group('Package'); box('PkgBody', 0.44, 0.3, 0.44, '#ff8fb8', 0, 0.15, 0, 0.04, pk); box('PkgRibA', 0.46, 0.31, 0.08, '#fff', 0, 0.15, 0, 0.02, pk); box('PkgRibB', 0.08, 0.31, 0.46, '#fff', 0, 0.15, 0, 0.02, pk);
  const lid = group('PkgLid', 0, 0.3, 0, pk); box('PkgLidTop', 0.48, 0.08, 0.48, '#ff6fa5', 0, 0.04, 0, 0.03, lid); box('PkgLidRibA', 0.5, 0.09, 0.08, '#fff', 0, 0.04, 0, 0.02, lid); box('PkgLidRibB', 0.08, 0.09, 0.5, '#fff', 0, 0.04, 0, 0.02, lid);
  for (const sx of [-1, 1]) { const bw = ball('PkgBow' + sx, 0.07, '#fff', 0.07 * sx, 0.12, 0, lid); bw.scale.set(1.3, 0.8, 0.7); }
  s.add(pk);
  const cake = group('BirthdayCake'); cyl('CakeBase', 0.3, 0.2, '#fff4e6', 0, 0.1, 0, cake, 0.3, 28); cyl('CakeIcing', 0.31, 0.06, '#ff8fb8', 0, 0.2, 0, cake, 0.31, 28); cyl('CakeTop', 0.21, 0.16, '#fff4e6', 0, 0.31, 0, cake, 0.21, 28); cyl('CakeIcing2', 0.22, 0.05, '#59d3ff', 0, 0.39, 0, cake, 0.22, 28);
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; cyl('Candle' + i, 0.018, 0.14, ['#ffd166', '#ff7fa0', '#7dff8a'][i % 3], Math.cos(a) * 0.13, 0.48, Math.sin(a) * 0.13, cake, 0.018, 8); ball('Flame' + i, 0.03, glow('#ffb347', 4), Math.cos(a) * 0.13, 0.58, Math.sin(a) * 0.13, cake); }
  const star = sign('★', { w: 0.2, h: 0.2, bg: '#1f3f8f', color: '#ffd166', px: 128, emissive: 0.6 }); star.rotation.x = -Math.PI / 2; star.position.y = 0.416; cake.add(star);
  s.add(cake);
  // small hand props
  const phone = box('Phone', 0.07, 0.14, 0.02, '#15161c', 0, 0, 0, 0.01); s.add(phone);
  const ticket = group('Ticket'); const tk = sign(['TICKET', '$10'], { w: 0.2, h: 0.26, bg: '#fff8c9', color: '#c0392b', px: 256, emissive: 0.15 }); ticket.add(tk); s.add(ticket, s.scene, false);
  const cash = group('Cash'); const cs = sign('$9', { w: 0.26, h: 0.14, bg: '#7ed99a', color: '#145c2c', px: 256, emissive: 0.15 }); cash.add(cs); s.add(cash, s.scene, false);
  const dn2 = group('Donut'); const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 10, 18), mat('#e9a25a')); t1.name = 'DonutRing'; dn2.add(t1); const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.03, 8, 18), mat('#ff78b4')); t2.name = 'DonutIce'; t2.position.z = 0.012; dn2.add(t2); s.add(dn2);
  s.gulls = []; for (let i = 0; i < 4; i++) { const g = group('Gull' + i); box('GullBody' + i, 0.3, 0.1, 0.12, '#fff', 0, 0, 0, 0.04, g); for (const sd of [-1, 1]) { const w = group('GullWing' + i + sd, 0, 0.03, 0.05 * sd, g); box('GullW' + i + sd, 0.16, 0.03, 0.44, '#e9edf5', 0, 0, 0.22 * sd, 0.01, w); } s.add(g, s.scene, false); s.gulls.push(g); }
  s.palms = []; s.scene.traverse(o => { if (/^Palm(N)?\d+Top$/.test(o.name)) s.palms.push(o); });

  // ---------------------------------------------------------------- character accessories (head-space: y 0 = neck, face toward +z)
  const head = n => s.chars[n]?.head;
  const acc = (n, o) => { if (!head(n)) return; head(n).add(o); o.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); };
  { const h = group('Helmet'); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.178, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat('#ff5a4d', { roughness: 0.3 })); dome.name = 'HelmetDome'; dome.position.y = 0.2; h.add(dome); cyl('HelmetRim', 0.181, 0.03, '#fff', 0, 0.205, 0, h, 0.181, 24); box('HelmetStripe', 0.06, 0.02, 0.3, '#fff', 0, 0.372, 0, 0.008, h); acc('dash', h); s.helmet = h; }
  for (const n of ['cop']) { const h = group('Cap_' + n); cyl('CapBand_' + n, 0.158, 0.07, '#1b2f6b', 0, 0.255, 0, h, 0.158); cyl('CapTop_' + n, 0.165, 0.05, '#1b2f6b', 0, 0.31, 0, h, 0.185); box('CapBrim_' + n, 0.24, 0.02, 0.12, '#10162e', 0, 0.235, 0.16, 0.008, h); ball('CapBadge_' + n, 0.03, mat('#ffd166', { metalness: 0.6, roughness: 0.3 }), 0, 0.285, 0.165, h); box('Stache_' + n, 0.11, 0.028, 0.03, '#4a2c1a', 0, 0.086, 0.148, 0.012, h); acc(n, h); }
  { const h = group('Shades'); for (const sx of [-1, 1]) box('ShadeLens' + sx, 0.105, 0.06, 0.03, mat('#0b0c12', { roughness: 0.15, metalness: 0.4 }), 0.062 * sx, 0.128, 0.142, 0.014, h).rotation.y = 0.22 * sx; box('ShadeBridge', 0.04, 0.016, 0.02, '#0b0c12', 0, 0.14, 0.152, 0.006, h); acc('slick', h); }
  { const h = group('StrawHat'); cyl('HatBrim', 0.27, 0.02, '#f0d58a', 0, 0.245, 0, h, 0.27); cyl('HatTop', 0.16, 0.1, '#f0d58a', 0, 0.3, 0, h, 0.13); cyl('HatBand', 0.162, 0.03, '#3cc46c', 0, 0.265, 0, h, 0.16); acc('vendorF', h); }
  { const h = group('PaperHat'); box('PaperHatBody', 0.24, 0.1, 0.12, '#fff', 0, 0.3, 0, 0.02, h); box('PaperHatStripe', 0.245, 0.03, 0.125, '#ff4b3e', 0, 0.28, 0, 0.01, h); acc('vendorH', h); }
  { const h = group('Headband'); cyl('HeadbandRing', 0.158, 0.035, '#ff5a4d', 0, 0.2, 0, h, 0.158); acc('jog', h); }
}
