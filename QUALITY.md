# QUALITY.md — Blocky Tales house style

Every episode must match these settings. The machine-readable copies live in `web/src/quality.js` (render look),
`tools/*.mjs` (audio / timing constants) and `remotion/src/Episode.tsx` (captions). Change the code and this file together.

## Format
| | |
|---|---|
| Canvas | 1080 × 1920 (9:16), 30 fps |
| Length | ~60 s (EP01: 57.6 s) |
| Cuts | hard cuts only, every 1–2 s (target 1.5 s), snapped to word starts; no dissolves |
| Structure | hook in the first 2 s → escalation → twist/reveal → button that loops back to the hook |
| Characters | blocky avatars, cylinder head, 2D face decal; original designs (no third-party names, logos or assets) |

## 1. Blender (headless) — `blender/build_assets.py`
- Blender 4.2 LTS, run with `blender -b --python blender/build_assets.py`; exports GLB (`export_apply`, Y-up) to `web/public/models/`.
- Pivot rig (empties, no armature): `Root > Torso > Head / LeftArm / RightArm / LeftLeg / RightLeg`. Pivots sit at hip, neck, shoulders and hips.
- Proportions (m, before scale): leg 0.115×0.115×0.30, torso 0.27×0.16×0.30, arm 0.095×0.095×0.29, head cylinder r 0.145 × h 0.25.
  Character scale: kid 1.0, big sibling 1.12, adult 1.65.
- Every box/cylinder gets a 3-segment bevel + weighted normals (soft toy edges). Characters face stage +z.
- Real PBR textures (Poly Haven, CC0, 1k: base colour + GL normal + roughness) on floor, walls, wood, rug, couch, bedding;
  fetched by `tools/fetch-assets.mjs`. Box-projected UVs at real-world scale. Flat colours for toys/characters.
- Set dressing rule: a cozy room needs a window (cool light source), a warm practical lamp, string lights (bloom), and soft furniture.

## 2. Three.js animation — `web/` + `episodes/<ep>/shots.js`
- Frames are a pure function of time (`BT.renderFrame(n)`), so they can render in any order / in parallel.
- Poses are keyframed per beat in `shots.js` (degrees): arms `[forward, out, twist]`, legs `forward`, head `[up, left, tilt]`, torso `[lean, twist, side]`.
- Automatic secondary motion on every character: breathing, blinking, talk-bob.
- Camera, every shot: default lens 38° vertical FOV; slow dolly (push-in 7 % of the subject distance unless the shot sets its own move);
  handheld drift ±12 mm position, ±0.35° roll; a repeated setup inside a beat punches in ×0.84.
- Faces: 1024×512 canvas decal wrapped ±62° on the head. Swappable **eyes** (open, wide, shock, half, squint, sad, angry, closed, happy, wince),
  **brows** (neutral, raised, angry, worried, sad, skeptic), **mouths** (smile, smirk, frown, flat, whisper, o, grin, teeth, wobble, scream)
  plus pupils "look", blush, sweat drop, frosting.
- Lip sync: mouth openness = the speaker's voice envelope (per frame, from the processed clip), quantised to 6 steps.
  Expression cues are timed to words with `c.w('word')`.
- Framing rules (checked by the contact-sheet lint): camera inside the room and ≥ 6 cm from any object, the subject's head fully in frame,
  nothing between lens and face (including the character's own arms), head above the caption band.

## 3. Render look — `web/src/quality.js`
| Setting | Value |
|---|---|
| Tone mapping | ACES Filmic, exposure 1.05, sRGB output |
| Anti-aliasing | 4× MSAA on a half-float target |
| Shadows | PCF soft, 2048² maps, bias −0.0012 / normal bias 0.003; walls, window dressing and emissives never cast |
| HDRI | Poly Haven `lebombo` 1k, intensity 0.16 (night) → 0.30 (ceiling light on) |
| Key | warm spot `#ffc089`, 50 cd, from front-right-above (motivated by the floor lamp), penumbra 0.85 |
| Rim | cool "moon" directional `#7fa4ff`, 2.6, from behind through the window |
| Fill | hemisphere `#6477b8` / `#2b2233`, 0.7 ; lamp practical point `#ffae5e`, 3 |
| Ambient occlusion | GTAO: radius 0.22, exponent 1.6, scale 1.15, 16 samples |
| Depth of field | Bokeh, aperture 0.0042, max blur 0.0085; focus distance = camera → **speaker's head**, recomputed every frame |
| Bloom | strength 0.32, radius 0.65, threshold 0.92 (only emissives and hot highlights glow) |
| Grade | warmth +0.06, saturation 1.12, contrast 1.06, lift 0.012, warm highlights / cool shadows split-tone |
| Vignette | 0.42, softness 0.62 |
| Output | caption-free PNG, 1080×1920, 30 fps → `episodes/<ep>/frames/f_00000.png` |

## 4. Voices — ElevenLabs connector
- Model **`eleven_v4`**, direction tags in square brackets (`[whispers]`, `[screaming]`, `[trembling voice]`, `[deep voice]`, `[giggles]` …).
- **One take per line** (`generations_count: 1`), one line per generation, a different voice per character. Raw takes → `episodes/<ep>/voices_raw/Lxx.mp3`.
- Cast (premade voices): Bean = Liam `TX3LPaxmHKxFdv7VOQHJ`, Dottie = Jessica `cgSgspJ2msm6clMCkdW9`, Mom = Sarah `EXAVITQu4vr4xnSDxMaL`.
- High-pitched cartoon voices: add `[high voice]` to kid lines **and** pitch up in post with formants shifted (rubberband):
  kids +3 to +3.5 semitones, adults +1.5; a kid "doing a monster voice" is −1.5. Duration is not changed.
- Processing (`tools/process-voices.mjs`): 70 Hz high-pass → trim silence (−45 dBFS; keep 40 ms pre-roll, 120 ms tail)
  → normalise every line to **−17 dBFS** (gated RMS of the spoken part, ±1 dB) → soft-limit peaks at −3 dBFS (leaves headroom so voice + bed never clips in the final mix).
- Word timings: `tools/transcribe.py` (faster-whisper `small.en`) aligned to the script text; also proves each take says the right words.

## 5. Music & sound effects — `tools/synth-audio.mjs`
- 100 % synthesised in JavaScript (oscillators, noise, filters, Karplus-Strong plucks). No samples, no generated audio.
- Music sections and effects are triggered by cue points in the timeline (`music:` / `sfx:` on each beat; `at: 'w:word'` pins an effect to a spoken word).
- Music bed ≈ −24 dBFS RMS before ducking; effects peak ≈ −4 dBFS.
- Ducking: under each line the bed is pulled to 9 dB below speech level, then tightened per word until
  **every spoken word is ≥ 6 dB above music + effects** (measured on the louder stereo channel). `tools/check-mix.mjs` fails the build otherwise.

## 6. Assembly — Remotion (`remotion/`, `tools/render-video.mjs`; every audio layer plays at 0.89 = −1 dB so the encoded true peak stays below 0 dBFS)
- Layers: PNG frames + individual voice clips + ducked bed.
- Captions: `@remotion/captions` (`createTikTokStyleCaptions`, `combineTokensWithinMilliseconds: 0`) → **one word at a time**.
  Fredoka Bold, 136 px (long words shrink to fit), white, 28 px black outline (`paint-order: stroke fill`), soft drop shadow,
  centred at **68 %** of the height, spring pop-in (scale 0.55 → 1 in ~8 frames).
  A word disappears 250 ms after it was spoken, so silent beats stay caption-free.
- Encode: H.264, **CRF 12**, yuv420p, BT.709, PNG intermediate frames, AAC 320 kb/s.

## Episode workflow
1. **Script** → `episodes/<ep>/script.json` (lines, speaker, TTS text with tags, caption text).
2. **Voices** → ElevenLabs, one take per line → `voices_raw/` → `npm run voices -- <ep>` → `npm run captions -- <ep>`.
3. **Retime** → `npm run retime -- <ep>` fits every beat and cut to the real voice lengths (prints any shot outside 1–2 s).
4. **Audio** → `npm run audio -- <ep>` then `npm run check -- <ep>` (must print `MIX CHECK PASSED`).
5. **Contact sheet** → `npm run contact -- <ep>`: one still per shot + framing lint. Fix every flagged shot
   (camera inside objects, arms covering faces, characters cut off) **before** the full render.
6. **Frames** → `npm run frames -- <ep>`.
7. **Video** → `npm run video -- <ep>` → `episodes/<ep>/out/<ep>.mp4`.
8. **Final check** → still frames across the video (captions, framing) + the mix check, then deliver the MP4.

## Character styles
- **v1 "toy"** (EP01): cylinder head, wrapped face decal, 3-segment soft bevels. Models `char_*.glb`, built by `blender/build_assets.py`.
- **v2 "block"** (EP02 onward, the default): box head 0.25 × 0.22 × 0.22 m, torso 0.30 × 0.30 × 0.15, arms 0.12 square, legs 0.147 × 0.15, 9 mm bevels,
  flat face decal on the front of the head. Models `char2_*.glb`, built by `blender/build_ep02.py`. Same pivot rig and pose API.
  In `shots.js`: `{ model: 'char2_bean', scale, skin, head: { type: 'box', w: 0.25, h: 0.22, d: 0.22 } }`.
- Original designs only: no third-party names, logos, faces or assets.

## Sets and lighting presets
- An episode picks its set in `shots.js`: `export const set = { model, lighting, noCast, bounds, lights, materials }`.
- `lighting: 'night'` (default, EP01 cozy room): values in sections 3 above.
- `lighting: 'day'` (EP02 street): Poly Haven `kloofendal_48d_partly_cloudy_puresky` 2k as environment (0.7) **and** visible sky (0.85);
  sun key `#fff0d4` 3.3 from the camera side with a 4096² shadow map that follows the focus point; cool sky rim `#cfe2ff` 1.5 from behind;
  hemisphere 0.55; exposure 0.92; bloom 0.22 / threshold 0.95. Everything else (ACES, GTAO, DOF, grade, vignette) is unchanged.
- One set can hold several locations (EP02: park, house door, candy shop, candy fantasy along one street); cut between them with hard cuts.
- Multi-location stories run 60–90 s; keep the same cut rhythm (1–2 s).

## Deliverables
- Final MP4s are sent to the user and are **not** committed (GitHub's 100 MB file limit); frames are never committed.

## Speed and voices (EP03 onward)
- **Voices at natural pitch** (`pitch_semitones: 0`, no `[high voice]` tag). EP01–02 used pitched-up voices; that style is retired.
- **1.5× episodes**: `"speed": 1.5` in `script.json`. Voices are time-stretched 1.5× with pitch preserved (rubberband `tempo=1.5`);
  everything else is authored in final on-screen time, so music, effects and animation are composed at the fast pace rather than sped up afterwards.
- Cut rhythm scales with speed: 1–2 s of story = **0.67–1.33 s on screen** (target 1.0 s). Line padding 0.07 s before / 0.13 s after.
- Target length: about 135 s of story → **~85–90 s finished** (EP03: 83.5 s, 85 shots, 31 lines).
- Bigger plots need three acts and 4+ voices; budget roughly 65 ElevenLabs credits per line.

## Music (feedback after EP03)
- The code-synthesised music used in EP01–03 (plucked "sneak / comedy / happy / panic" loops) was judged **bad** by the owner. Do not reuse it.
- Until a replacement is agreed: keep the synthesised **sound effects**, and decide the music approach with the owner before making the episode
  (options: no music bed, a much simpler and quieter bed, or generated music from the ElevenLabs music model).

## EP04 onward — Blox City (open world), generated music
- **Format the owner asked for (Nov 2026):** EP01's toy look (v1 models, soft bevels, wrapped face decal) + 1.5x speed + natural-pitch voices, about 80–90 s,
  an original story in an open-world style city, silent background characters that only make sound effects. GTA-style *vibe* only: original names, places and plot.
- **Set built in code:** `web/src/sets/bloxcity.js` (no Blender needed). An episode selects it with `set = { model: null, builder: 'bloxcity', lighting: 'day', day: {…overrides} }`.
  One avenue along x: beach + Mama Lu's Diner (x 0–16), street market (16–34), downtown crossing + donut shop (34–46), drawbridge (50–58), the pier (62–80).
  Every vehicle and prop is a named object (`Scooter`, `Bike`, `Cop0..2`, `Taxi`, `Package`, `BirthdayCake`, `BridgeL/R`, …) that `shots.js` moves per frame.
  The builder uses a seeded random generator, so all render workers build the identical city. Camera far plane 320 m, pink distance fog, painted sunset sky
  (the Poly Haven `belfast_sunset_puresky` 2k HDRI only lights the scene).
- **Sunset preset** (`episodes/ep04/cast.js`): exposure 0.78, sun `#ffb884` 2.5 from the camera side, pink rim 1.5, hemisphere 0.55, bloom 0.16 / threshold 1.0.
- **Cast = recoloured v1 models:** `characters.<name> = { model, scale, skin, colors: { hair, top, pants, shoe, accent }, hide: [nodes] }` plus accessories added by the set builder
  (helmet, police cap + moustache, sunglasses, hats). Adults are scale 1.45–1.62, so character cameras sit 1.38x further back than in EP01.
- **Vertical framing:** a 9:16 frame is narrow; stage chases in depth (camera ahead of the rider, pursuers behind), keep signs/banners under ~3.7 m wide,
  and in dialogue put the camera on the open side of each speaker (±45° yaw) so the other character is never between lens and face.
- **Music = ElevenLabs music model** (`eleven_music_v2_5`, instrumental, one take per track, prompts stored in `script.json`). Tracks live in `episodes/<ep>/audio/music_<name>.mp3`;
  `script.json` → `music.tracks`. A beat's `music:` cue names a track or `'stop'`; each track keeps its own play-head. Level −24 dBFS RMS before ducking.
  Check a new track for vocals (run whisper over it) before using it. `sfx_gain` in `script.json` trims all effects for busy episodes.
- **Voices:** generate at most two lines at a time on the free plan (more are rejected as "busy", which is not charged).
- **Playwright:** the renderer needs the Playwright version that matches the installed Chromium (cloud sessions: `npm install --no-save playwright@1.63.0`).

## Tension in the middle (owner feedback after EP04, 27 Nov 2026)
- **What the owner said:** EP04 is "the best one you've made", but it "doesn't really keep the attention span throughout the entire thing. It kinda falls off in the middle."
  The episode was left as it is; fix this from the next episode on.
- **Likely cause (Claude's reading, not the owner's words):** roughly 25–55 s of EP04 is one unbroken chase with the same picture (Dash on the scooter, front close-up)
  and no new stakes, and four silent beats (`city`, `weave`, `copstart`, `beach`) were added only to reach the target length.
- **Rules for the next episode:**
  - Never pad for length. If the voices run short, write more story (new lines) rather than adding silent filler.
  - Something must change every 8–10 s in the middle: a new threat, a new location, a reversal, or a new question. Each chase beat needs its own gag or set piece.
  - Re-hook around the halfway mark with a second question on top of the first (EP04 idea that was planned but not built: the box starts ticking).
  - Keep a visible ticking clock when the story has a deadline (EP04 idea: an on-screen delivery countdown from "Don't be late" until "You're late, kid").
  - Escalate visibly: pursuers should pile up over time (rival, then vendors, then police), so the payoff line ("the whole city chased me") is earned on screen.
  - Vary the shots in a long action stretch; do not return to the same close-up of the lead more than twice in a row.
- **Posting text used for EP04:** title "She said 'don't open the box'… so the whole city chased me"; no GTA hashtags (original story and city).

## GRAPHICS.md look (test, 27 Nov 2026)
- `GRAPHICS.md` (contributed by nmbiv-tech) holds tested look presets from a sister pipeline. Part of it is now wired in as an **opt-in look**:
  `set.look = 'graphics'` + `set.time = 'sunset' | 'night'` in an episode's set, or `?look=graphics&time=night` in the URL
  (`npm run frames -- ep04 --frame 1298 --query "look=graphics&time=night"`). Values live in `QUALITY.graphics` in `web/src/quality.js`. EP01–04 are unchanged by default.
- Wired in: GTAO, depth of field by shot width (shallow on close-ups, deep on wides, focus just behind the head), bloom, colour tint + vignette,
  clear-coat car paint, neon signs (glow text + border), window glow per time of day, night sky + blue fog, and a pool of 4 street-lamp lights that follows the action.
- **Units:** GRAPHICS.md's character is ≈ 5.3 units tall, ours ≈ 1.35 m, so lengths were scaled ×0.25 and point-light intensities re-tuned.
- **Sunset:** the literal values (exposure 1.0, sun 3.4, bloom threshold 0.92) blew the Blox City frames out; tuned to exposure 0.78, sun `#ffa060` 2.8, bloom threshold 1.8.
  Result is close to EP04's own look: slightly warmer, softer backgrounds on close-ups, stronger glow on candles and lamps.
- **Night:** works well on wides (lit windows, neon, lamps, stars). In close-ups faces get too dark: a night episode needs a soft key on the speaker before it is used.
- Comparison of 8 EP04 shots (before / sunset / night): `episodes/ep04/graphics_test.jpg`.
