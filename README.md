# Blocky Tales — 3D story shorts pipeline

Vertical (9:16) one-minute 3D story videos with blocky avatar characters, built entirely from code:
Blender (headless) → Three.js → ElevenLabs voices → synthesised music/SFX → Remotion.
House style and every quality setting: see [QUALITY.md](QUALITY.md).

```
blender/build_assets.py     EP01: toy-style characters + cozy room        -> web/public/models/*.glb
blender/build_ep02.py       block-style characters + street set (park, house, candy shop, candy fantasy)
blender/bt.py               shared Blender helpers
web/                        Three.js renderer (Vite): rig, canvas faces, camera, lights, post stack
episodes/ep01/              script.json, shots.js (blocking + cameras), voices, timeline, audio, frames, out/
tools/                      fetch-assets, process-voices, transcribe, retime, synth-audio, check-mix, render-frames, render-video
remotion/                   frames + voices + bed + word-by-word captions -> MP4
```

## Setup (macOS or Linux)
```bash
./setup.sh
```
Needs Node 20+, Python 3.10+, ffmpeg (with rubberband) and Blender 4.2+ on the PATH; the script checks and installs what it can.

## Make an episode
```bash
npm run assets                 # only when models change (EP02 set: blender -b --python blender/build_ep02.py)
npm run voices -- ep01         # after the raw ElevenLabs takes are in episodes/ep01/voices_raw/
npm run captions -- ep01
npm run retime -- ep01
npm run audio -- ep01 && npm run check -- ep01
npm run contact -- ep01        # review episodes/ep01/contact_sheet.jpg, fix flagged shots
npm run frames -- ep01
npm run video -- ep01          # -> episodes/ep01/out/ep01.mp4
```
Preview and scrub in a browser: `npm run dev`, then open http://localhost:5173/?preview&ep=ep01 (add `&fast` to skip AO/DOF).

Voices are generated with the ElevenLabs connector from inside a Claude session (model `eleven_v4`, one take per line);
Claude saves the takes to `episodes/<ep>/voices_raw/Lxx.mp3`.

## What works on short-form right now (research notes, Nov 2026)
- Roblox-style content is one of the largest short-form categories; story/"rant" narration and surprise reveals outperform plain gameplay.
- What the pipeline bakes in: a spoken hook in the first two seconds, a cut every 1–2 s, one-word captions, a twist near the end,
  and a last beat that loops into the first line.
- Sources (vendor blogs, treat numbers as directional): rolearn.dev trend report and TikTok case study, ghostshorts.com, blog.youtube "Block party".
