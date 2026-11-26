// Downloads CC0 PBR textures + HDRI from Poly Haven (1k). Run once: node tools/fetch-assets.mjs
import fs from 'node:fs'; import path from 'node:path';
const TEX = { floor:'laminate_floor_02', wall:'beige_wall_001', wood:'oak_veneer_01', blanket:'knitted_fleece', rug:'wool_boucle', couch:'curly_teddy_natural',
  grass:'leafy_grass', pavement:'concrete_pavement', brick:'red_brick_03', asphalt:'asphalt_02', planks:'wood_planks', roof:'clay_roof_tiles_02' };
const HDRIS = [['lebombo', '1k'], ['kloofendal_48d_partly_cloudy_puresky', '2k']];
const j = async u => (await fetch(u, {headers:{'User-Agent':'asset-fetch'}})).json();
const dl = async (u, f) => { if (fs.existsSync(f)) return; const r = await fetch(u); if(!r.ok) throw new Error(u+' '+r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); console.log('saved', f); };
fs.mkdirSync('assets_src/textures', {recursive:true}); fs.mkdirSync('web/public/hdri', {recursive:true});
for (const [name, id] of Object.entries(TEX)) {
  const f = await j(`https://api.polyhaven.com/files/${id}`);
  const maps = { diff: f.Diffuse, nor: f.nor_gl, rough: f.Rough };
  for (const [k, m] of Object.entries(maps)) { if (!m) { console.log('missing', id, k); continue; } await dl(m['1k'].jpg.url, path.join('assets_src/textures', `${name}_${k}.jpg`)); }
}
for (const [id, res] of HDRIS) { const h = await j(`https://api.polyhaven.com/files/${id}`); await dl(h.hdri[res].hdr.url, `web/public/hdri/${id}_${res}.hdr`); }
