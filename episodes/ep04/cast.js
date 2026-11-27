// EP04 cast + set (shared so test scenes can reuse it). Original characters built from the v1 toy models with new colours and accessories.
const C = (model, scale, skin, colors, hide = []) => ({ model, scale, skin, colors: { skin, ...colors }, hide });
export const characters = {
  dash:    C('char_bean', 1.5, '#F2B88F', { top: '#19b5a5', pants: '#2d3352', hair: '#3a2416', accent: '#ffd166', shoe: '#ffffff' }, ['Tuft0', 'Tuft1', 'Tuft2']),
  lu:      C('char_mom', 1.5, '#E9B48C', { hair: '#dcdce6', top: '#e0457b', pants: '#3a2f4a', accent: '#ffffff', shoe: '#ffffff' }),
  cop:     C('char_bean', 1.62, '#F0B58A', { hair: '#4a2c1a', top: '#24418f', pants: '#1b2f6b', accent: '#ffd166', shoe: '#15161c' }, ['Tuft0', 'Tuft1', 'Tuft2']),
  slick:   C('char_bean', 1.55, '#E8B08A', { hair: '#101018', top: '#23232b', pants: '#4b2d7a', accent: '#ff3b6b', shoe: '#101018' }, ['Tuft0', 'Tuft2']),
  vendorF: C('char_mom', 1.5, '#C98D62', { hair: '#6b3a1e', top: '#3cc46c', pants: '#f3f0e8', accent: '#ffffff', shoe: '#8a5a36' }, ['Bun']),
  vendorH: C('char_bean', 1.55, '#F2B88F', { hair: '#2b1a12', top: '#ffffff', pants: '#ff4b3e', accent: '#ff4b3e', shoe: '#15161c' }, ['Tuft0', 'Tuft1', 'Tuft2']),
  jog:     C('char_dottie', 1.45, '#D99A6C', { hair: '#7a3b12', top: '#ffd166', pants: '#3f8cff', accent: '#ffffff', shoe: '#ffffff' }),
  ped1:    C('char_bean', 1.5, '#F5C9A3', { hair: '#d9a441', top: '#c9a9e9', pants: '#5a4630', accent: '#ffffff', shoe: '#3a2f4a' }),
  ped2:    C('char_dottie', 1.48, '#B97A56', { hair: '#15161c', top: '#7cc6fe', pants: '#ff7fa0', accent: '#ffffff', shoe: '#ffffff' }),
};
export const set = {
  model: null, builder: 'bloxcity', lighting: 'day', bounds: { x: [-40, 120], y: [0.12, 40], z: [-40, 60] },
  day: { exposure: 0.78, bloom: { strength: 0.16, radius: 0.5, threshold: 1.0 }, hdri: { file: 'hdri/belfast_sunset_puresky_2k.hdr', intensity: 0.75, background: 1.0, rotation: 0 },
    sun: { color: '#ffb884', intensity: 2.5, offset: [-4, 6.5, 9] }, rim: { color: '#ff9fd0', intensity: 1.5, offset: [7, 5, -8] }, hemi: { sky: '#ffd0b0', ground: '#8a7a9a', intensity: 0.55 } },
};
