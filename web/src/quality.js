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
  // daylight exterior preset (EP02+). Episodes pick a preset with `set.lighting`.
  day: {
    exposure: 0.92,
    hdri: { file: 'hdri/kloofendal_48d_partly_cloudy_puresky_2k.hdr', intensity: 0.7, background: 0.85, rotation: 2.2 },
    sun:  { color: '#fff0d4', intensity: 3.3, offset: [5, 10, 8], shadowHalf: 5.5, mapSize: 4096 },      // warm key: the sun, from the camera side
    rim:  { color: '#cfe2ff', intensity: 1.5, offset: [-5, 6, -9] },                                      // cool sky rim from behind
    hemi: { sky: '#bcd9ff', ground: '#86a865', intensity: 0.55 },
    bloom: { strength: 0.22, radius: 0.6, threshold: 0.95 },
  },
  // GRAPHICS.md look (nmbiv-tech, Nov 2026). Opt-in per episode with `set.look = 'graphics'` and `set.time = 'sunset' | 'night'`.
  // Their scenes use a character ≈ 5.3 units tall, ours ≈ 1.35 m, so lengths are ×0.25 and point-light intensities are rescaled for the shorter distances.
  graphics: {
    gtao: { radius: 0.23, distanceExponent: 1.4, thickness: 0.5, scale: 1.2, samples: 16, blendIntensity: 0.95 },
    dof: { focusOffset: 0.16, near: 3, far: 12, apertureClose: 0.0088, apertureWide: 0.0016, maxblur: 0.012 },   // shallow focus on close-ups, deep on wides
    grade: { warmth: 0, saturation: 1.12, vignette: 0.32 },
    carPaint: { metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 },
    sunset: {
      day: { exposure: 0.78, sun: { color: '#ffa060', intensity: 2.8 }, hdri: { intensity: 0.7, background: 1.0 }, bloom: { strength: 0.32, radius: 0.55, threshold: 1.8 } },      // tuned: GRAPHICS.md's exposure 1.0 / sun 3.4 / threshold 0.92 blew out this set (painted sky, bright stucco)
      tint: [1.04, 1.0, 0.93], windows: 0.12, signs: 1.0,
    },
    night: {
      day: { exposure: 0.78, sun: { color: '#8aa6ff', intensity: 0.18 }, rim: { color: '#8aa6ff', intensity: 0.3 }, hemi: { sky: '#3a4a7a', ground: '#1a1420', intensity: 0.07 },
        hdri: { intensity: 0.06, background: 0.1 }, bloom: { strength: 0.32, radius: 0.55, threshold: 0.92 } },
      tint: [0.92, 0.97, 1.12], windows: 1.2, signs: 2.2, fog: '#101a33',
      lamps: { color: '#ffc98a', intensity: 5, decay: 1.6, distance: 8.5, pool: 4 },      // street lamps: a pool of the 4 nearest real lights follows the action
    },
  },
  tints: { wall: '#9fc3c9', blanket: { color: '#8c7ae6', noMap: true }, duvet: '#8fc0ee', rug: '#f0a184', couch: '#ffd58a', wood: '#ffe9d2', floor: '#ffeedd' },
};
