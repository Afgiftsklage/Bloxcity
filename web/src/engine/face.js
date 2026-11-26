// 2D canvas face decal, wrapped onto the front of the cylinder head.
// Swappable parts: eyes, brows, mouth (+ pupils "look", blush, sweat, frosting smear).
import * as THREE from 'three';
import { clamp } from './util.js';

export const FACE_W = 1024, FACE_H = 512;
const INK = '#2a1d1a';

// eyes: open = sclera height factor, lid = top-lid coverage 0..1, pupil = pupil size factor
const EYES = {
  open:   { open: 1.0, lid: 0.0, pupil: 1.0 },
  wide:   { open: 1.25, lid: 0.0, pupil: 0.62 },
  shock:  { open: 1.35, lid: 0.0, pupil: 0.42 },
  half:   { open: 1.0, lid: 0.45, pupil: 1.0 },
  squint: { open: 0.55, lid: 0.3, pupil: 1.0, lower: 0.25 },
  sad:    { open: 1.0, lid: 0.25, pupil: 1.05, tilt: 0.28 },
  angry:  { open: 0.95, lid: 0.3, pupil: 0.9, tilt: -0.3 },
  closed: { arc: 'down' },
  happy:  { arc: 'up' },
  wince:  { arc: 'wince' },
};
// brows: [height offset px (negative = higher), tilt (positive = inner end down = angry)]
const BROWS = {
  none: null, neutral: [0, 0], raised: [-26, -0.05], angry: [22, 0.42], worried: [-12, -0.42], sad: [-4, -0.3],
  skeptic: [[-30, -0.1], [18, 0.3]],          // left brow up, right brow down (viewer's left/right)
};

export class Face {
  constructor(skin, headR, y0, height, arc = 62) {
    this.skin = skin;
    this.canvas = document.createElement('canvas'); this.canvas.width = FACE_W; this.canvas.height = FACE_H;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const a = arc * Math.PI / 180;
    const geo = new THREE.CylinderGeometry(headR + 0.0025, headR + 0.0025, height, 48, 1, true, -a, 2 * a);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));   // un-mirror
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, roughness: 0.6, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.position.y = y0 + height / 2; this.mesh.renderOrder = 2; this.mesh.name = 'FaceDecal';
    this.key = ''; this.state = {};
  }
  // state: { eyes, brows, mouth, open (0..1 talk openness), look:[x,y] (-1..1), blush, sweat, frosting, blink }
  set(st) {
    const s = { eyes: 'open', brows: 'neutral', mouth: 'smile', open: 0, look: [0, 0], blush: 0, sweat: false, frosting: false, blink: false, ...st };
    s.open = Math.round(clamp(s.open, 0, 1) * 6) / 6;
    s.look = [Math.round(s.look[0] * 8) / 8, Math.round(s.look[1] * 8) / 8];
    const key = JSON.stringify(s);
    if (key === this.key) return;
    this.key = key; this.state = s; this.draw(s); this.tex.needsUpdate = true;
  }
  draw(s) {
    const c = this.ctx, cx = FACE_W / 2;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, FACE_W, FACE_H);
    c.translate(cx, 270); c.scale(1.22, 1.22); c.translate(-cx, -270);      // big, readable features
    c.lineCap = 'round'; c.lineJoin = 'round';
    const eyeY = 205, dx = 128, ew = 54, eh = 70;
    if (s.blush > 0) for (const sx of [-1, 1]) {
      const g = c.createRadialGradient(cx + sx * 215, 318, 4, cx + sx * 215, 318, 62);
      g.addColorStop(0, `rgba(255,95,110,${0.55 * s.blush})`); g.addColorStop(1, 'rgba(255,95,110,0)');
      c.fillStyle = g; c.fillRect(cx + sx * 215 - 70, 248, 140, 140);
    }
    const e = s.blink ? EYES.closed : (EYES[s.eyes] || EYES.open);
    for (const sx of [-1, 1]) {
      const x = cx + sx * dx;
      if (e.arc) {
        c.strokeStyle = INK; c.lineWidth = 15; c.beginPath();
        if (e.arc === 'down') c.arc(x, eyeY - 6, ew * 0.82, 0.12 * Math.PI, 0.88 * Math.PI);
        else if (e.arc === 'up') c.arc(x, eyeY + 30, ew * 0.9, 1.14 * Math.PI, 1.86 * Math.PI);
        else { c.moveTo(x - sx * ew * 0.8, eyeY - 26); c.lineTo(x + sx * ew * 0.5, eyeY + 4); c.lineTo(x - sx * ew * 0.8, eyeY + 30); }
        c.stroke(); continue;
      }
      const h = eh * e.open;
      c.save(); c.beginPath(); c.ellipse(x, eyeY, ew, h, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#fff'; c.fillRect(x - ew, eyeY - h, ew * 2, h * 2);
      const pr = 34 * e.pupil, px = x + s.look[0] * (ew - pr * 0.75), py = eyeY + s.look[1] * (h - pr * 0.8) + 4;
      c.fillStyle = INK; c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(px - pr * 0.32, py - pr * 0.36, pr * 0.3, 0, Math.PI * 2); c.fill();
      if (e.lid || e.tilt) {                               // skin-coloured upper lid
        c.fillStyle = this.skin; c.beginPath();
        const ly = eyeY - h + 2 * h * (e.lid || 0), t = (e.tilt || 0) * sx * 60;
        c.moveTo(x - ew - 6, eyeY - h - 8); c.lineTo(x + ew + 6, eyeY - h - 8); c.lineTo(x + ew + 6, ly + t); c.lineTo(x - ew - 6, ly - t); c.closePath(); c.fill();
        c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.moveTo(x - ew - 6, ly - t); c.lineTo(x + ew + 6, ly + t); c.stroke();
      }
      if (e.lower) { c.fillStyle = this.skin; c.fillRect(x - ew - 6, eyeY + h - 2 * h * e.lower, ew * 2 + 12, h); }
      c.restore();
      c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.ellipse(x, eyeY, ew, h, 0, 0, Math.PI * 2); c.stroke();
    }
    let b = BROWS[s.brows];
    if (b) {
      if (!Array.isArray(b[0])) b = [b, b];
      [-1, 1].forEach((sx, i) => {
        const [oy, tilt] = b[i], x = cx + sx * dx, y = eyeY - 104 + oy;
        c.strokeStyle = INK; c.lineWidth = 17; c.beginPath();
        c.moveTo(x - sx * 54, y + 54 * tilt); c.quadraticCurveTo(x, y - 9, x + sx * 58, y - 58 * tilt + 6); c.stroke();
      });
    }
    this.mouth(c, s, cx, 372);
    if (s.sweat) { c.fillStyle = '#8fd4ff'; c.strokeStyle = '#4aa3df'; c.lineWidth = 5; const x = cx + 300, y = 120;
      c.beginPath(); c.moveTo(x, y - 34); c.quadraticCurveTo(x + 26, y + 6, x, y + 22); c.quadraticCurveTo(x - 26, y + 6, x, y - 34); c.fill(); c.stroke(); }
    if (s.frosting) {
      c.fillStyle = '#ff9ec4';
      for (const [x, y, r] of [[-150, 368, 34], [-112, 398, 26], [138, 352, 30], [170, 380, 20], [-40, 452, 22], [60, 458, 18], [-196, 334, 16]]) {
        c.beginPath(); c.arc(cx + x, y, r, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffd0e2'; for (const [x, y, r] of [[-158, 358, 10], [130, 344, 9]]) { c.beginPath(); c.arc(cx + x, y, r, 0, Math.PI * 2); c.fill(); }
    }
  }
  mouth(c, s, cx, y) {
    const o = s.open, m = s.mouth;
    c.strokeStyle = INK; c.lineWidth = 13; c.fillStyle = '#6b1f2a';
    const openShape = (w, h, teeth = true, tongue = true) => {
      c.save(); c.beginPath(); c.ellipse(cx, y, w, h, 0, 0, Math.PI * 2); c.fill(); c.clip();
      if (teeth) { c.fillStyle = '#fff'; c.fillRect(cx - w, y - h, w * 2, Math.min(h * 0.42, 20)); }
      if (tongue && h > 20) { c.fillStyle = '#ff7d8e'; c.beginPath(); c.ellipse(cx, y + h * 0.8, w * 0.62, h * 0.55, 0, 0, Math.PI * 2); c.fill(); }
      c.restore(); c.strokeStyle = INK; c.lineWidth = 11; c.beginPath(); c.ellipse(cx, y, w, h, 0, 0, Math.PI * 2); c.stroke();
    };
    if (m === 'scream') return openShape(58 + 14 * o, 62 + 26 * o);
    if (m === 'o') return openShape(26 + 8 * o, 30 + 14 * o, false, false);
    if (o > 0.08 && m !== 'teeth' && m !== 'wobble') {                // talking: openness follows the voice envelope
      const wide = m === 'grin' || m === 'smile' ? 1.15 : m === 'frown' || m === 'whisper' ? 0.8 : 1;
      return openShape((34 + 26 * o) * wide, 8 + 46 * o * (m === 'whisper' ? 0.7 : 1), o > 0.3);
    }
    c.beginPath();
    if (m === 'smile') { c.arc(cx, y - 36, 62, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    else if (m === 'smirk') { c.moveTo(cx - 50, y + 4); c.quadraticCurveTo(cx + 10, y + 26, cx + 62, y - 22); c.stroke(); }
    else if (m === 'frown') { c.arc(cx, y + 58, 62, 1.22 * Math.PI, 1.78 * Math.PI); c.stroke(); }
    else if (m === 'flat' || m === 'whisper') { c.moveTo(cx - 40, y + 2); c.lineTo(cx + 40, y + 2); c.stroke(); }
    else if (m === 'wobble') { c.moveTo(cx - 66, y + 4); for (let i = 0; i <= 6; i++) c.lineTo(cx - 66 + i * 22, y + (i % 2 ? -14 : 12) * (1 + o)); c.stroke(); }
    else if (m === 'grin' || m === 'teeth') {                         // big toothy grin (teeth = nervous, clenched)
      const w = 84, h = m === 'teeth' ? 40 : 46;
      c.beginPath(); c.moveTo(cx - w, y - 18); c.quadraticCurveTo(cx, y - 2, cx + w, y - 18); c.quadraticCurveTo(cx + w * 0.72, y + h, cx, y + h); c.quadraticCurveTo(cx - w * 0.72, y + h, cx - w, y - 18); c.closePath();
      c.fillStyle = '#fff'; c.fill(); c.stroke();
      if (m === 'teeth') { c.lineWidth = 6; c.beginPath(); c.moveTo(cx - w * 0.8, y + 12); c.lineTo(cx + w * 0.8, y + 12); for (const t of [-0.5, -0.17, 0.17, 0.5]) { c.moveTo(cx + w * t, y - 6); c.lineTo(cx + w * t, y + 34); } c.stroke(); }
    }
    else { c.arc(cx, y - 36, 62, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  }
}
