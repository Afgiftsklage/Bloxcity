// Renders caption-free PNG frames (1080x1920 @ 30 fps) from the Three.js scene with headless Chromium.
//   node tools/render-frames.mjs ep01                 full render -> episodes/ep01/frames/f_00000.png …
//   node tools/render-frames.mjs ep01 --contact       one still per shot + framing lint -> episodes/ep01/contact_sheet.jpg
//   options: --workers 3   --shots 4,7,12 (only these shots)   --from 0 --to 300   --force   --frame 123 (single test frame -> test.png)
//            --query look=graphics&time=night (extra URL parameters, e.g. to test a look)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2), ep = args.find(a => !a.startsWith('--') && !/^[\d,]+$/.test(a)) || 'ep01';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const dir = `episodes/${ep}`, workers = +opt('workers', 3);
const server = await createServer({ configFile: 'web/vite.config.js', server: { port: 5173, strictPort: false }, logLevel: 'error' });
await server.listen(); const url = `http://localhost:${server.config.server.port}/?ep=${ep}` + (typeof opt('query') === 'string' ? '&' + opt('query') : '');
const launch = () => chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const browsers = [];
async function openPage() {            // one browser process per worker: software GL is single-process, so this is what scales across cores
  const browser = await launch(); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message)); page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url); await page.waitForFunction(() => window.BT?.ready, null, { timeout: 90000 });
  return page;
}
const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
const first = await openPage(); const tl = await first.evaluate(() => ({ frames: BT.frames, fps: BT.fps, shots: BT.timeline.shots }));

if (opt('frame') !== undefined) {
  const t0 = Date.now(); save(opt('out', 'test.png'), await first.evaluate(f => BT.png(f), +opt('frame'))); console.log('frame', opt('frame'), 'rendered in', Date.now() - t0, 'ms');
} else if (opt('contact')) {
  const sharp = (await import('sharp')).default; fs.mkdirSync(`${dir}/contact`, { recursive: true });
  const only = typeof opt('shots') === 'string' ? opt('shots').split(',').map(Number) : null, report = [], at = +opt('at', 0.5);
  for (const s of tl.shots) {
    const f = Math.min(tl.frames - 1, Math.floor((s.start + (s.end - s.start) * at) * tl.fps)), file = `${dir}/contact/shot_${String(s.i).padStart(2, '0')}.jpg`;
    const issues = [...new Set((await Promise.all([0.1, 0.5, 0.9].map(a => first.evaluate(f2 => BT.lint(f2), Math.floor((s.start + (s.end - s.start) * a) * tl.fps))))).flat())];
    if (!only || only.includes(s.i)) save(file, await first.evaluate(f2 => BT.jpg(f2, 0.92), f));
    report.push({ shot: s.i, beat: s.beat, frame: f, issues }); console.log(`shot ${String(s.i).padStart(2)} ${s.beat.padEnd(10)} frame ${String(f).padStart(4)}  ${issues.length ? 'ISSUES: ' + issues.join('; ') : 'ok'}`);
  }
  fs.writeFileSync(`${dir}/contact/report.json`, JSON.stringify(report, null, 1));
  const cols = 7, tw = 270, th = 480, rows = Math.ceil(tl.shots.length / cols);
  const tiles = await Promise.all(tl.shots.map(async (s, k) => {
    const bad = report[k].issues.length > 0, label = `<svg width="${tw}" height="${th}"><rect x="0" y="0" width="${tw}" height="30" fill="${bad ? '#c0392b' : '#000'}" fill-opacity="0.75"/><text x="8" y="21" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="bold" fill="#fff">${s.i} · ${s.beat} · ${(s.end - s.start).toFixed(1)}s</text></svg>`;
    return { input: await sharp(`${dir}/contact/shot_${String(s.i).padStart(2, '0')}.jpg`).resize(tw, th).composite([{ input: Buffer.from(label) }]).jpeg().toBuffer(), left: (k % cols) * (tw + 6) + 6, top: Math.floor(k / cols) * (th + 6) + 6 };
  }));
  await sharp({ create: { width: cols * (tw + 6) + 6, height: rows * (th + 6) + 6, channels: 3, background: '#15151a' } }).composite(tiles).jpeg({ quality: 88 }).toFile(`${dir}/contact_sheet.jpg`);
  console.log('wrote', `${dir}/contact_sheet.jpg`, ' shots with issues:', report.filter(r => r.issues.length).length);
} else {
  fs.mkdirSync(`${dir}/frames`, { recursive: true });
  let list = [...Array(tl.frames).keys()];
  if (typeof opt('shots') === 'string') { const ids = opt('shots').split(',').map(Number); list = list.filter(f => { const t = (f + 0.5) / tl.fps, s = tl.shots.find(x => t < x.end) || tl.shots.at(-1); return ids.includes(s.i); }); }
  list = list.filter(f => f >= +opt('from', 0) && f <= +opt('to', 1e9));
  const file = f => `${dir}/frames/f_${String(f).padStart(5, '0')}.png`;
  if (!opt('force')) list = list.filter(f => !fs.existsSync(file(f)));
  console.log(`rendering ${list.length} frames with ${workers} workers`);
  const pages = [first, ...await Promise.all(Array.from({ length: workers - 1 }, openPage))]; let done = 0, next = 0; const t0 = Date.now();
  await Promise.all(pages.map(async page => {
    while (next < list.length) { const f = list[next++]; save(file(f), await page.evaluate(f2 => BT.png(f2), f)); done++;
      if (done % 30 === 0 || done === 5) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${list.length}  ${(el / done).toFixed(2)} s/frame  eta ${((list.length - done) * el / done / 60).toFixed(1)} min`); } }
  }));
  console.log('done in', ((Date.now() - t0) / 60000).toFixed(1), 'min');
}
await Promise.all(browsers.map(b => b.close())); await server.close(); process.exit(0);
