// Deterministic frame renderer: window.BT.renderFrame(n) poses everything for frame n and draws it.
import * as THREE from 'three';
import { Stage } from './engine/stage.js';
import { resolveShot, applyShot } from './engine/camera.js';
import { QUALITY as Q } from './quality.js';

const params = new URLSearchParams(location.search), ep = params.get('ep') || 'ep01';
const shotMods = import.meta.glob('../../episodes/*/shots.js'), tlMods = import.meta.glob('../../episodes/*/timeline.json');
const episode = await shotMods[`../../episodes/${ep}/shots.js`]();
const timeline = (await tlMods[`../../episodes/${ep}/timeline.json`]()).default;
const canvas = document.getElementById('c');
const stage = await new Stage().init(canvas, episode.characters, episode.set);
episode.setup?.(stage);
const beatDefs = Object.fromEntries(episode.beats.map(b => [b.id, b])), beatTimes = Object.fromEntries(timeline.beats.map(b => [b.id, b]));
const fps = timeline.fps, V = THREE.Vector3;

function runAct(t) {
  stage.reset();
  const bt = timeline.beats.find(b => t < b.end) || timeline.beats.at(-1), def = beatDefs[bt.id];
  const tl = t - bt.start, dur = bt.end - bt.start, f = Math.min(timeline.frames - 1, Math.max(0, Math.round(t * fps)));
  const level = n => timeline.mouth[n]?.[f] ?? 0;
  const ctx = { id: bt.id, t: tl, u: tl / dur, dur, T: t, vt: tl - (bt.vo ?? 0), vdur: bt.vdur ?? dur, level,
    w: (word, nth = 0) => { const ws = (bt.words || []).filter(x => x.text.toLowerCase().replace(/[^a-z0-9]/g, '') === word.toLowerCase()); return ws[nth] ? ws[nth].start : 0; } };
  episode.base?.(stage, ctx); def.act?.(stage, ctx);
  for (const [n, c] of Object.entries(stage.chars)) if (c.group.visible) c.finish(t, level(n));
  stage.syncShadows(t);
  return { bt, def };
}
function setFrame(f) {
  const t = (f + 0.5) / fps;
  const shot = timeline.shots.find(s => t < s.end) || timeline.shots.at(-1), def = beatDefs[shot.beat];
  const spec = def.shots[shot.setup];
  let res;
  if (spec.track) { runAct(t); res = resolveShot(spec, stage); }
  else { runAct((spec.anchor != null ? beatTimes[shot.beat].start + spec.anchor : shot.start) + 0.5 / fps); res = resolveShot(spec, stage); runAct(t); }
  applyShot(stage.camera, res, (t - shot.start) / (shot.end - shot.start), t, shot.i, shot.rep);
  let focusName = res.focus ?? def.focus ?? def.speaker ?? beatTimes[shot.beat].speaker, fp;
  if (Array.isArray(focusName)) fp = new V(...focusName); else if (stage.chars[focusName]) fp = stage.chars[focusName].headPos(new V()); else fp = res.look;
  const focusDist = typeof focusName === 'number' ? focusName : fp.distanceTo(stage.camera.position);
  return { shot, focusDist, focus: fp, res };
}
function renderFrame(f) { const info = setFrame(f); stage.render(info.focusDist, info.focus); return info; }

// automatic framing lint used by the contact sheet: camera inside the room / not inside objects, speaker's head in frame and not occluded
function lint(f) {
  const { shot, focus } = setFrame(f), cam = stage.camera, issues = [];
  const p = cam.position, B = episode.set?.bounds ?? { x: [-2.33, 2.33], y: [0.08, 2.62], z: [-2.33, 2.33] };
  if (p.x < B.x[0] || p.x > B.x[1] || p.z < B.z[0] || p.z > B.z[1] || p.y < B.y[0] || p.y > B.y[1]) issues.push('camera outside the set');
  stage.scene.updateMatrixWorld(true);
  const solids = []; stage.scene.traverse(o => { if (o.isMesh && o.visible && o.name !== 'FaceDecal') { let v = true; o.traverseAncestors(a => { if (!a.visible || a.name.endsWith('_shadow')) v = false; }); if (v) solids.push(o); } });
  const box = new THREE.Box3(), SKIP = /^(Wall|Floor|Ceiling|Grass|Sidewalk|Road|Curb|Fan(Floor|Back|Side)|House(Interior|Roof)|Shop(Ceil|Floor)|Hill|PorchStep)/;
  for (const o of solids) { box.setFromObject(o); if (box.containsPoint(p) && !SKIP.test(o.name)) issues.push('camera inside ' + o.name); if (box.distanceToPoint(p) < 0.06 && !SKIP.test(o.name)) issues.push('camera touching ' + o.name); }
  const def = beatDefs[shot.beat], spec = def.shots[shot.setup];
  const names = (spec.on ? [spec.on] : typeof spec.focus === 'string' ? [spec.focus] : typeof spec.look === 'string' ? [spec.look] : []).filter(n => stage.chars[n]);   // lint the subject of the shot
  for (const n of names) {
    const c = stage.chars[n]; if (!c.group.visible) continue;
    const h = c.headPos(new V()), ndc = h.clone().project(cam), r = c.headR * c.scale, d = h.distanceTo(p);
    const rn = r / (d * Math.tan(rad(cam.fov / 2)));           // head radius in NDC (vertical)
    if (ndc.z > 1 || Math.abs(ndc.x) + rn / cam.aspect > 1.0 || Math.abs(ndc.y) + rn > 1.0) issues.push(`${n} head cut off`);
    if (ndc.y - rn < -0.42 + 0.0) { /* overlaps caption band (68% height = ndc -0.36) */ if (ndc.y < -0.2) issues.push(`${n} head behind captions`); }
    const ray = new THREE.Raycaster(p, h.clone().sub(p).normalize(), 0.01, d - r * 1.2);
    const hit = ray.intersectObjects(solids, false).find(x => { let own = false; x.object.traverseAncestors(a => { if (a === c.group) own = true; }); return !own || /Arm|Hand/.test(x.object.name); });
    if (hit) issues.push(`${n} face blocked by ${hit.object.name}`);
  }
  return issues;
}
const rad = d => d * Math.PI / 180;

window.BT = { ready: true, frames: timeline.frames, fps, timeline, stage, renderFrame, lint,
  png: f => { renderFrame(f); return canvas.toDataURL('image/png'); },
  jpg: (f, q = 0.9) => { renderFrame(f); return canvas.toDataURL('image/jpeg', q); } };

if (params.has('preview')) {                       // simple scrub/play preview (npm run dev -> http://localhost:5173/?preview)
  document.body.classList.add('preview'); Object.assign(stage.fx, { ao: !params.has('fast'), dof: !params.has('fast') });
  const scrub = document.getElementById('scrub'), info = document.getElementById('info'); scrub.max = timeline.frames - 1;
  let playing = false, f = +(params.get('frame') || 0), t0 = 0;
  const draw = () => { const i = renderFrame(f); scrub.value = f; info.textContent = `frame ${f} / ${timeline.frames}  shot ${i.shot.i} (${i.shot.beat})`; };
  scrub.oninput = () => { f = +scrub.value; draw(); };
  document.getElementById('play').onclick = () => { playing = !playing; t0 = performance.now() - f / fps * 1000; if (playing) loop(); };
  const loop = () => { if (!playing) return; f = Math.floor((performance.now() - t0) / 1000 * fps) % timeline.frames; draw(); requestAnimationFrame(loop); };
  draw();
}
