// Blocky character with a pivot rig:  Root > Torso > Head / LeftArm / RightArm / LeftLeg / RightLeg
import * as THREE from 'three';
import { Face } from './face.js';
import { rad, wobble, hash } from './util.js';

export const DIM = { LEG_H: 0.30, TORSO_H: 0.30, HEAD_R: 0.145, HEAD_H: 0.25 };   // keep in sync with blender/build_assets.py

export class Character {
  constructor(name, gltf, { scale = 1, skin = '#F7C59A', head = null } = {}) {
    this.name = name; this.scale = scale;
    this.headH = head ? head.h : DIM.HEAD_H; this.headR = head ? Math.max(head.w, head.h) * 0.62 : 0.16;      // head = { type:'box', w, h, d } for block-style characters
    this.group = new THREE.Group(); this.group.name = 'char_' + name; this.group.add(gltf.scene); this.group.scale.setScalar(scale);
    const g = n => gltf.scene.getObjectByName(n);
    this.root = g('Root'); this.torso = g('Torso'); this.head = g('Head');
    this.armL = g('LeftArm'); this.armR = g('RightArm'); this.legL = g('LeftLeg'); this.legR = g('RightLeg');
    this.rest = new Map(); gltf.scene.traverse(o => { this.rest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.face = head ? new Face(skin, { type: 'box', w: head.w * 0.96, d: head.d, y0: 0.012, height: head.h * 0.64 }) : new Face(skin, DIM.HEAD_R, 0.022, 0.16);
    this.head.add(this.face.mesh);
    this.held = {}; this.seed = hash(name.length * 7.3 + name.charCodeAt(0));
    this.reset();
  }
  reset() {
    for (const [o, r] of this.rest) { o.position.copy(r.p); o.quaternion.copy(r.q); o.scale.copy(r.s); }
    this.group.visible = true; this.group.position.set(0, 0, 0); this.group.rotation.set(0, 0, 0); this.group.scale.setScalar(this.scale);
    this.faceState = {}; this.auto = { idle: 1, blink: true, talk: 1 };
    for (const k in this.held) this.held[k].visible = false;
    return this;
  }
  hide() { this.group.visible = false; return this; }
  // position on the floor (x, z), facing angle in degrees (0 = toward camera/+z, 90 = toward +x), optional height
  at(x, z, facing = 0, y = 0) { this.group.position.set(x, y, z); this.group.rotation.y = rad(facing); return this; }
  // Pose in degrees. arms: [forward, out, twist]  legs: forward  head: [up, left, tilt]  torso: [lean fwd, twist left, lean side]
  pose(p = {}) {
    const E = (o, x, y, z) => { if (o) o.rotation.set(rad(x), rad(y), rad(z), 'YXZ'); };
    if (p.torso) E(this.torso, p.torso[0] || 0, p.torso[1] || 0, -(p.torso[2] || 0));
    if (p.head) E(this.head, -(p.head[0] || 0), p.head[1] || 0, -(p.head[2] || 0));
    if (p.armL) E(this.armL, -(p.armL[0] || 0), p.armL[2] || 0, p.armL[1] || 0);
    if (p.armR) E(this.armR, -(p.armR[0] || 0), -(p.armR[2] || 0), -(p.armR[1] || 0));
    if (p.arms) { this.pose({ armL: p.arms, armR: p.arms }); }
    if (p.legL != null) E(this.legL, -p.legL, 0, 0);
    if (p.legR != null) E(this.legR, -p.legR, 0, 0);
    if (p.lift) this.group.position.y += p.lift;
    if (p.squash) { const s = p.squash; this.group.scale.set(this.scale * (1 + (1 - s) * 0.5), this.scale * s, this.scale * (1 + (1 - s) * 0.5)); }
    if (p.auto) Object.assign(this.auto, p.auto);
    return this;
  }
  sit() { return this.pose({ legL: 88, legR: 88 }); }
  expr(st) { Object.assign(this.faceState, st); return this; }
  hold(key, obj, on = true, hand = 'R') {   // attach a prop to a hand (right by default)
    if (!this.held[key] && obj) { this.held[key] = obj; (hand === 'L' ? this.armL : this.armR).add(obj); }
    if (this.held[key]) this.held[key].visible = on; return this;
  }
  headPos(target = new THREE.Vector3()) { this.group.updateWorldMatrix(true, true); return this.head.localToWorld(target.set(0, this.headH * 0.5, 0)); }
  facing() { return this.group.rotation.y; }
  // automatic secondary motion: breathing, blinking, talk-bob + lip sync from the voice envelope
  finish(t, level = 0) {
    const a = this.auto, s = this.seed * 10;
    if (a.idle) {
      this.torso.rotation.z += Math.sin(t * 1.7 + s) * 0.012 * a.idle; this.torso.position.y += Math.sin(t * 2.3 + s) * 0.004 * a.idle;
      this.head.rotation.y += wobble(t * 0.9, s) * 0.035 * a.idle; this.head.rotation.x += wobble(t * 0.7, s + 3) * 0.02 * a.idle;
    }
    if (level > 0.05 && a.talk) {
      this.head.rotation.x += -level * 0.07 * a.talk + Math.sin(t * 11 + s) * 0.018 * level * a.talk;
      this.head.rotation.z += Math.sin(t * 6.3 + s) * 0.03 * level * a.talk; this.torso.rotation.x += -level * 0.02 * a.talk;
    }
    const period = 2.6 + this.seed * 1.4, ph = (t + this.seed * 5) % period;
    const st = { ...this.faceState };
    if (a.blink && ph < 0.1 && !['closed', 'happy', 'wince', 'shock', 'wide'].includes(st.eyes)) st.blink = true;
    if (level > 0.05 && st.open == null) st.open = Math.pow(level, 0.65);
    this.face.set(st);
  }
}
