export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sat = x => clamp(x, 0, 1);
export const smooth = t => { t = sat(t); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - sat(t), 3);
export const easeIn = t => Math.pow(sat(t), 3);
export const easeInOut = t => { t = sat(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = t => { t = sat(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// progress of a sub-interval [a,b] of t
export const seg = (t, a, b) => sat((t - a) / (b - a));
export const rad = d => d * Math.PI / 180;
// deterministic smooth noise in [-1,1] (sum of incommensurate sines) — used for handheld drift
export const wobble = (t, seed = 0) => (Math.sin(t * 1.31 + seed * 12.9898) + Math.sin(t * 2.17 + seed * 78.233) * 0.6 + Math.sin(t * 3.71 + seed * 37.719) * 0.3) / 1.9;
export const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
