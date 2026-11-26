// Quick montage of rendered frames (or video stills) for review: node tools/montage.mjs out.jpg file1.png file2.png …
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2), w = 360, h = 640;
const t = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(w, h).toBuffer(), left: (i % 6) * w, top: Math.floor(i / 6) * h })));
await sharp({ create: { width: Math.min(6, files.length) * w, height: Math.ceil(files.length / 6) * h, channels: 3, background: '#000' } }).composite(t).jpeg({ quality: 88 }).toFile(out);
