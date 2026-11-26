// Remotion assembly: frames + voice clips + ducked music/effects + word-by-word captions -> H.264 CRF 12 MP4.
// usage: node tools/render-video.mjs ep01 [--from 0 --to 89] [--still 120]
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { bundle } from '@remotion/bundler'; import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
const args = process.argv.slice(2), ep = args.find(a => !a.startsWith('--') && isNaN(+a)) || 'ep01', dir = path.resolve(`episodes/${ep}`);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
// serve the episode folder to the Remotion browser (avoids copying ~4 GB of PNG frames into the bundle)
const types = { '.png': 'image/png', '.wav': 'audio/wav', '.json': 'application/json' };
const server = http.createServer((req, res) => { const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(f), range = req.headers.range, h = { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' };
  if (range) { const [a, b] = range.replace('bytes=', '').split('-'), s = +a, e = b ? +b : st.size - 1; res.writeHead(206, { ...h, 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Content-Length': e - s + 1 }); fs.createReadStream(f, { start: s, end: e }).pipe(res); }
  else { res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(f).pipe(res); } });
await new Promise(r => server.listen(4599, r));
// Remotion normally downloads its own Chrome Headless Shell; reuse a pre-installed one when present (CHROME_PATH overrides)
const pw = '/opt/pw-browsers'; let browserExecutable = process.env.CHROME_PATH;
if (!browserExecutable && fs.existsSync(pw)) { const d = fs.readdirSync(pw).find(n => /^chromium_headless_shell-\d+/.test(n));
  if (d) browserExecutable = fs.readdirSync(`${pw}/${d}`).map(x => `${pw}/${d}/${x}/headless_shell`).find(fs.existsSync) ?? fs.readdirSync(`${pw}/${d}`).map(x => `${pw}/${d}/${x}/chrome-headless-shell`).find(fs.existsSync); }
const common = { browserExecutable, chromiumOptions: { disableWebSecurity: true } };
const serveUrl = await bundle({ entryPoint: path.resolve('remotion/src/index.ts'), publicDir: path.resolve('remotion/public') });
const timeline = JSON.parse(fs.readFileSync(`${dir}/timeline.json`)), inputProps = { base: 'http://localhost:4599', timeline, v: String(Date.now()) };   // v = cache-buster for audio assets
const composition = await selectComposition({ serveUrl, id: 'Episode', inputProps, ...common });
fs.mkdirSync(`${dir}/out`, { recursive: true });
if (opt('still') !== undefined) {
  const out = opt('out', `${dir}/out/still_${opt('still')}.png`); await renderStill({ composition, serveUrl, inputProps, frame: +opt('still'), output: out, ...common }); console.log('wrote', out);
} else {
  const out = `${dir}/out/${ep}${opt('from') !== undefined ? '_preview' : ''}.mp4`, t0 = Date.now(); let last = 0;
  await renderMedia({ composition, serveUrl, inputProps, codec: 'h264', crf: 12, pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'png', audioCodec: 'aac', audioBitrate: '320k', outputLocation: out, concurrency: 4,
    frameRange: opt('from') !== undefined ? [+opt('from'), +opt('to')] : null, ...common,
    onProgress: p => { if (p.progress - last > 0.1) { last = p.progress; console.log(`${Math.round(p.progress * 100)}%`); } } });
  console.log('wrote', out, `in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
server.close(); process.exit(0);
