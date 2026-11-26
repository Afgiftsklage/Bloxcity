// Single source of truth for the render look. Mirrors QUALITY.md — change both together.
export const QUALITY = {
  width: 1080, height: 1920, fps: 30,
  toneMapping: 'ACESFilmic', exposure: 1.05,
  msaa: 4,
  shadows: { type: 'PCFSoft', mapSize: 2048, bias: -0.0012, normalBias: 0.003 },
  hdri: { file: 'hdri/lebombo_1k.hdr', intensityNight: 0.16, intensityLit: 0.3 },
  key:  { color: '#ffc089', intensity: 50, pos: [2.2, 2.35, 2.1], target: [0.3, 0.5, -0.9], angle: 0.95, penumbra: 0.85 },   // warm key (motivated by the floor lamp)
  rim:  { color: '#7fa4ff', intensity: 2.6, pos: [-1.4, 3.3, -4.2], target: [0.3, 0.4, -0.6] },                           // cool moon rim through the window
  practical: { color: '#ffae5e', intensity: 3, pos: [2.12, 1.32, -0.95], distance: 5.5 },
  hemi: { sky: '#6477b8', ground: '#2b2233', night: 0.7, lit: 0.7 },
  ceiling: { color: '#fff1dc', intensity: 6, pos: [0, 2.35, -0.3] },                                                     // only when "lights on"
  doorSpill: { color: '#ffd9a0', intensity: 16, pos: [-2.25, 1.5, 1.05], target: [0.6, 0.4, -0.8], angle: 0.8, penumbra: 0.9 },
  gtao: { radius: 0.22, distanceExponent: 1.6, thickness: 1.0, scale: 1.15, samples: 16, blendIntensity: 1.0 },
  dof:  { aperture: 0.0042, maxblur: 0.0085 },                 // focus distance = camera -> speaker's head, every frame
  bloom: { strength: 0.32, radius: 0.65, threshold: 0.92 },
  grade: { warmth: 0.06, saturation: 1.12, contrast: 1.06, lift: 0.012, vignette: 0.42, vignetteSoftness: 0.62 },
  camera: { fov: 38, onDistScale: 1.55, near: 0.05, far: 40, dollyPush: 0.07, driftPos: 0.012, driftRot: 0.35, punchIn: 0.84 },
  tints: { wall: '#9fc3c9', blanket: { color: '#8c7ae6', noMap: true }, duvet: '#8fc0ee', rug: '#f0a184', couch: '#ffd58a', wood: '#ffe9d2', floor: '#ffeedd' },
};
