// Scene, lighting and the post-processing stack (ACES, soft shadows, HDRI, GTAO, DOF, bloom, grade + vignette).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { QUALITY as Q } from '../quality.js';
import { Character } from './rig.js';
import { lerp, rad } from './util.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, warmth: { value: Q.grade.warmth }, saturation: { value: Q.grade.saturation }, contrast: { value: Q.grade.contrast },
    lift: { value: Q.grade.lift }, tint: { value: [1, 1, 1] }, vignette: { value: Q.grade.vignette }, softness: { value: Q.grade.vignetteSoftness } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float warmth, saturation, contrast, lift, vignette, softness; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c += lift * (1.0 - c);
      c *= vec3(1.0 + warmth, 1.0 + warmth * 0.3, 1.0 - warmth * 0.9);                      // warm white balance
      c *= tint;                                                                            // GRAPHICS.md colour tint (sunset warm / night cool)
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c += vec3(0.022, 0.008, -0.02) * smoothstep(0.45, 1.0, l) + vec3(-0.012, 0.002, 0.018) * (1.0 - smoothstep(0.0, 0.4, l));   // warm highlights, cool shadows
      float d = length((vUv - 0.5) * vec2(1.0, 1.0)) / 0.7071;
      c *= 1.0 - vignette * smoothstep(1.0 - softness, 1.05, d);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export class Stage {
  // set = { model: 'room.glb', lighting: 'night' | 'day', noCast: RegExp, materials(mats) }  (default: the EP01 cozy room at night)
  async init(canvas, charDefs, set = {}) {
    const W = Q.width, H = Q.height, day = set.lighting === 'day'; this.day = day;
    const D = this.D = { ...Q.day }, merge = o => { for (const k in o ?? {}) D[k] = typeof D[k] === 'object' ? { ...D[k], ...o[k] } : o[k]; };
    merge(set.day);                                                                     // set.day = per-episode overrides of the daylight preset
    const G = this.G = set.look === 'graphics' ? { ...Q.graphics, ...Q.graphics[set.time ?? 'sunset'], time: set.time ?? 'sunset' } : null;
    if (G && day) merge(G.day);                                                         // GRAPHICS.md lighting state wins over the episode's own values
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = this.exposure = day ? D.exposure : Q.exposure; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color('#05060c');
    this.camera = new THREE.PerspectiveCamera(Q.camera.fov, W / H, Q.camera.near, Q.camera.far);

    const gl = new GLTFLoader(), load = f => f === null ? Promise.resolve({ scene: new THREE.Group() }) : gl.loadAsync('/models/' + f);      // model: null = the set is built in code (set.builder)
    const [room, hdr, ...chars] = await Promise.all([load(set.model === null ? null : set.model ?? 'room.glb'), new RGBELoader().loadAsync('/' + (day ? D.hdri.file : Q.hdri.file)), ...Object.entries(charDefs).map(([n, d]) => load(`${d.model ?? 'char_' + n}.glb`))]);
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromEquirectangular(hdr).texture; pm.dispose();
    if (day) { hdr.mapping = THREE.EquirectangularReflectionMapping; scene.background = hdr; scene.backgroundIntensity = D.hdri.background; scene.backgroundRotation.y = scene.environmentRotation.y = D.hdri.rotation; scene.environmentIntensity = D.hdri.intensity; }
    else { hdr.dispose(); scene.environmentIntensity = Q.hdri.intensityNight; }

    // room
    this.room = room.scene; scene.add(this.room); this.props = new Map(); this.rest = new Map();
    const noCast = set.noCast ?? /^(StringWire|CurtainRod|WinFrame|Curtain|Skirting|Wall_|Ceiling|MoonGlass|Moon|Star|DoorGlow|StringBulb|LampShade|CeilingLamp|LumpEye)/;
    this.room.traverse(o => {
      this.props.set(o.name, o); this.rest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: o.visible });
      if (o.isMesh) { o.castShadow = !noCast.test(o.name) && !noCast.test(o.parent?.name || ''); o.receiveShadow = true;
        const m = o.material; if (m.map) m.map.anisotropy = 8; const tint = Q.tints[m.name]; if (tint?.noMap) { m.map = null; m.color.set(tint.color); m.needsUpdate = true; } else if (tint) m.color.set(tint); if (m.normalMap) m.normalScale.set(0.9, 0.9); }
    });
    this.mats = {}; this.room.traverse(o => { if (o.isMesh) this.mats[o.material.name] = o.material; });
    set.materials?.(this.mats);

    // characters
    this.chars = {}; Object.entries(charDefs).forEach(([n, def], i) => { const c = new Character(n, chars[i], def); this.chars[n] = c; this[n] = c; scene.add(c.group); });

    // lights
    if (day) {
      const sun = this.key = new THREE.DirectionalLight(D.sun.color, D.sun.intensity); sun.castShadow = true;
      sun.shadow.mapSize.set(D.sun.mapSize, D.sun.mapSize); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.012;
      const h = D.sun.shadowHalf; Object.assign(sun.shadow.camera, { left: -h, right: h, top: h, bottom: -h, near: 0.5, far: 40 });
      this.rim = new THREE.DirectionalLight(D.rim.color, D.rim.intensity);
      this.hemi = new THREE.HemisphereLight(D.hemi.sky, D.hemi.ground, D.hemi.intensity);
      scene.add(sun, sun.target, this.rim, this.rim.target, this.hemi);
      this.extraLights = (set.lights ?? []).map(l => { const p = new THREE.PointLight(l.color, l.intensity, l.distance ?? 6, 2); p.position.set(...l.pos); scene.add(p); return p; });
    } else {
      const key = this.key = new THREE.SpotLight(Q.key.color, Q.key.intensity, 0, Q.key.angle, Q.key.penumbra, 2);
      key.position.set(...Q.key.pos); key.target.position.set(...Q.key.target); key.castShadow = true;
      key.shadow.mapSize.set(Q.shadows.mapSize, Q.shadows.mapSize); key.shadow.bias = Q.shadows.bias; key.shadow.normalBias = Q.shadows.normalBias; key.shadow.camera.near = 0.5; key.shadow.camera.far = 9;
      const rim = this.rim = new THREE.DirectionalLight(Q.rim.color, Q.rim.intensity);
      rim.position.set(...Q.rim.pos); rim.target.position.set(...Q.rim.target); rim.castShadow = true;
      rim.shadow.mapSize.set(Q.shadows.mapSize, Q.shadows.mapSize); rim.shadow.bias = Q.shadows.bias; rim.shadow.normalBias = Q.shadows.normalBias;
      Object.assign(rim.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 0.5, far: 12 });
      this.practical = new THREE.PointLight(Q.practical.color, Q.practical.intensity, Q.practical.distance, 2); this.practical.position.set(...Q.practical.pos);
      this.hemi = new THREE.HemisphereLight(Q.hemi.sky, Q.hemi.ground, Q.hemi.night);
      this.ceiling = new THREE.PointLight(Q.ceiling.color, 0, 0, 2); this.ceiling.position.set(...Q.ceiling.pos);
      const ds = this.doorSpill = new THREE.SpotLight(Q.doorSpill.color, 0, 0, Q.doorSpill.angle, Q.doorSpill.penumbra, 2); ds.position.set(...Q.doorSpill.pos); ds.target.position.set(...Q.doorSpill.target);
      scene.add(key, key.target, rim, rim.target, this.practical, this.hemi, this.ceiling, ds, ds.target);

    }
    // clock display (canvas decal on the ClockFace empty)
    if (this.props.get('ClockFace')) {
    const cc = this.clockCanvas = document.createElement('canvas'); cc.width = 512; cc.height = 200;
    this.clockTex = new THREE.CanvasTexture(cc); this.clockTex.colorSpace = THREE.SRGBColorSpace;
    const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.098), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff', emissiveMap: this.clockTex, emissiveIntensity: 3.2, roughness: 0.3 }));
    this.props.get('ClockFace').add(clock); this.clockText = null; this.setClock('2:59');
    }

    // a spare cake slice that characters can hold
    if (this.props.get('CakeSlice6')) this.makeSlice = () => { const g = new THREE.Group(), sl = this.props.get('CakeSlice6').clone(true); sl.visible = true; sl.position.set(0.035, -0.03, -0.07); g.add(sl); g.position.set(0, -0.26, 0.05); g.rotation.set(-0.3, 0, 0); g.scale.setScalar(1.15); return g; };

    // post chain
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: Q.msaa });
    const comp = this.composer = new EffectComposer(r, rt); comp.setPixelRatio(1); comp.setSize(W, H);
    comp.addPass(new RenderPass(scene, this.camera));
    const AO = G ? G.gtao : Q.gtao, gtao = this.gtao = new GTAOPass(scene, this.camera, W, H); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = AO.blendIntensity;
    gtao.updateGtaoMaterial({ radius: AO.radius, distanceExponent: AO.distanceExponent, thickness: AO.thickness, scale: AO.scale, samples: AO.samples });
    comp.addPass(gtao);
    this.bokeh = new BokehPass(scene, this.camera, { focus: 2, aperture: Q.dof.aperture, maxblur: Q.dof.maxblur }); comp.addPass(this.bokeh);
    const bl = day ? D.bloom : Q.bloom; this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), bl.strength, bl.radius, bl.threshold); comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader); comp.addPass(this.grade);
    if (G) { const gu = this.grade.uniforms; gu.warmth.value = G.grade.warmth; gu.saturation.value = G.grade.saturation; gu.vignette.value = G.grade.vignette; gu.tint.value = G.tint; }
    this.fx = { ao: true, dof: true, bloom: true }; this.THREE = THREE;
    return this;
  }
  obj(name) { return this.props.get(name); }
  // episode-built props (shots.js setup): registers the object and its children so reset() restores them every frame
  add(o, parent = this.scene, cast = true) {
    parent.add(o);
    o.traverse(x => { if (x.name) this.props.set(x.name, x); this.rest.set(x, { p: x.position.clone(), q: x.quaternion.clone(), s: x.scale.clone(), v: x.visible }); if (x.isMesh) { x.castShadow = cast; x.receiveShadow = true; } });
    return o;
  }
  reset() {
    for (const [o, r] of this.rest) { o.position.copy(r.p); o.quaternion.copy(r.q); o.scale.copy(r.s); o.visible = r.v; }
    for (const c of Object.values(this.chars)) c.reset();
    if (!this.day) { this.setLights(0); this.setDoor(0); this.practical.intensity = Q.practical.intensity; this.key.intensity = Q.key.intensity; }
    this.renderer.toneMappingExposure = this.exposure;
  }
  setClock(text) {
    if (text === this.clockText) return; this.clockText = text;
    const c = this.clockCanvas.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 512, 200);
    c.fillStyle = '#ff5a2a'; c.font = 'bold 170px "DejaVu Sans Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 108);
    this.clockTex.needsUpdate = true;
  }
  setCake(slices, crumbs = false) { for (let i = 0; i < 8; i++) this.obj('CakeSlice' + i).visible = slices.includes(i); this.obj('Crumbs').visible = crumbs; }
  setLights(v) {                       // 0 = night (lamp + moon), 1 = ceiling light on
    this.lit = v; this.ceiling.intensity = Q.ceiling.intensity * v; this.scene.environmentIntensity = lerp(Q.hdri.intensityNight, Q.hdri.intensityLit, v);
    this.hemi.intensity = lerp(Q.hemi.night, Q.hemi.lit, v); this.rim.intensity = Q.rim.intensity * (1 - 0.6 * v);
    if (this.mats.ceilinglamp) this.mats.ceilinglamp.emissiveIntensity = 0.02 + 3 * v;
    if (this.mats.hallglow) this.mats.hallglow.emissiveIntensity = 2.2;
  }
  setDoor(open) { this.obj('DoorPivot').rotation.y = -rad(105) * open; this.doorSpill.intensity = Q.doorSpill.intensity * open; }
  // text sign on an empty (shop signs, mailbox labels, cards): returns the mesh
  label(target, lines, { w = 1, h = 0.3, bg = null, color = '#fff', font = 'bold 120px "DejaVu Sans", sans-serif', px = 1024, draw = null, emissive = 0 } = {}) {
    const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w); const c = cv.getContext('2d');
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); }
    c.fillStyle = color; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    [].concat(lines).forEach((t, i, a) => c.fillText(t, cv.width / 2, cv.height * (i + 0.5) / a.length + 6));
    draw?.(c, cv);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: !bg, roughness: 0.6, emissive: '#fff', emissiveMap: tex, emissiveIntensity: emissive }));
    (typeof target === 'string' ? this.obj(target) : target).add(m); return m;
  }
  // independent copy of a prop (for hands / placing on the ground); registered so reset() restores it every frame
  clone(name, parent = this.scene) {
    const o = this.obj(name).clone(true); o.position.set(0, 0, 0); parent.add(o);
    this.rest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: true }); return o;
  }
  render(focusDist, focus) {
    if (this.day && focus) {                       // the sun's shadow frustum follows the action
      this.key.target.position.copy(focus); this.key.position.copy(focus).add(new THREE.Vector3(...this.D.sun.offset));
      this.rim.target.position.copy(focus); this.rim.position.copy(focus).add(new THREE.Vector3(...this.D.rim.offset));
    }
    this.gtao.enabled = this.fx.ao; this.bokeh.enabled = this.fx.dof; this.bloom.enabled = this.fx.bloom;
    this.onRender?.(focus);                        // set builders can follow the action (e.g. the night street-lamp pool)
    const u = this.bokeh.uniforms; u.focus.value = focusDist; u.aperture.value = Q.dof.aperture; u.maxblur.value = Q.dof.maxblur; u.aspect.value = this.camera.aspect;
    if (this.G) { const g = this.G.dof, k = Math.min(1, Math.max(0, (focusDist - g.near) / (g.far - g.near)));      // GRAPHICS.md: aperture by shot width
      u.focus.value = focusDist + g.focusOffset; u.aperture.value = lerp(g.apertureClose, g.apertureWide, k); u.maxblur.value = g.maxblur; }
    u.nearClip.value = this.camera.near; u.farClip.value = this.camera.far;
    this.composer.render();
  }
}
