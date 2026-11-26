// Shot camera: resolves a shot spec to a camera pose, adds the dolly move and the handheld drift.
import * as THREE from 'three';
import { QUALITY } from '../quality.js';
import { rad, wobble, smooth } from './util.js';
const C = QUALITY.camera, V = THREE.Vector3;

// Resolve a spec against the stage (characters posed at the shot's anchor time).
// spec A (free):      { pos:[x,y,z], look:[x,y,z] | 'bean', fov, dolly:[dx,dy,dz], focus }
// spec B (on a char): { on:'bean', dist, yaw, pitch, up, side, fov, dolly, focus }   yaw 0 = straight in front of the character
export function resolveShot(spec, stage) {
  let pos, look;
  const headOf = n => stage.chars[n].headPos(new V());
  if (spec.on) {
    const ch = stage.chars[spec.on], head = headOf(spec.on), sc = ch.scale;
    const dist = (spec.dist ?? 1.3) * C.onDistScale, yaw = ch.facing() + rad(spec.yaw ?? 0), pitch = rad(spec.pitch ?? 4);
    look = head.clone().add(new V(0, (spec.up ?? -0.085 * dist), 0));
    const dir = new V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    pos = head.clone().addScaledVector(dir, dist);
    if (spec.side) { const r = new V(Math.cos(yaw), 0, -Math.sin(yaw)); pos.addScaledVector(r, spec.side); look.addScaledVector(r, spec.side); }
  } else {
    pos = new V(...spec.pos);
    look = typeof spec.look === 'string' ? headOf(spec.look) : new V(...spec.look);
  }
  const fwd = look.clone().sub(pos).normalize();
  const dolly = spec.dolly ? new V(...spec.dolly) : fwd.clone().multiplyScalar(pos.distanceTo(look) * C.dollyPush);   // default: slow push-in
  return { pos, look, dolly, fov: spec.fov ?? C.fov, focus: spec.focus ?? spec.on ?? null, shake: spec.shake ?? 0, track: spec.track ?? null };
}

// u = 0..1 progress through the shot, t = absolute time (s), seed = shot index, rep = how many times this setup was already used in the beat
export function applyShot(cam, r, u, t, seed, rep = 0) {
  const pos = r.pos.clone(), look = r.look.clone();
  if (rep > 0) pos.lerp(look, 1 - Math.pow(C.punchIn, rep));          // jump-cut punch-in when a setup repeats
  pos.addScaledVector(r.dolly, u - 0.5);                              // dolly: linear move through the whole shot
  const k = 1 + r.shake * 6;
  pos.x += wobble(t * 1.1, seed + 1) * C.driftPos * k; pos.y += wobble(t * 1.3, seed + 2) * C.driftPos * 0.8 * k; pos.z += wobble(t * 0.9, seed + 3) * C.driftPos * k;
  look.x += wobble(t * 0.8, seed + 4) * C.driftPos * 1.2 * k; look.y += wobble(t * 1.0, seed + 5) * C.driftPos * 1.2 * k;
  if (r.shake) { look.x += Math.sin(t * 47 + seed) * 0.012 * r.shake; look.y += Math.sin(t * 53 + seed * 2) * 0.016 * r.shake; }
  cam.position.copy(pos); cam.fov = r.fov; cam.up.set(0, 1, 0); cam.lookAt(look);
  cam.rotateZ(rad(wobble(t * 0.7, seed + 6) * C.driftRot * k));
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
}
