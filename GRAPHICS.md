# GRAPHICS.md — look & graphic-design notes

Tested presets from a sister pipeline (same idea: Blender → Three.js → ElevenLabs → code-synth audio → Remotion)
that produced two approved story shorts (cozy haunted-house interior, storm night) and a city crime-caper
(sunset street, garage interior, night chase). Everything here is plain numbers and techniques, so it can be
ported into `web/src/quality.js` / `shots.js` / `tools/*` as needed. Original designs only — no third-party assets.

---

## 1. Post stack (approved "cozy" look)
| Setting | Value | Notes |
|---|---|---|
| Tone mapping | ACES Filmic, exposure **1.05** | per-lighting-state multiplier (night 0.78–0.8) |
| AA | 4× MSAA, half-float target | |
| GTAO | radius **0.9**, distance exp **1.4**, thickness **2**, scale **1.2**, 16 samples, denoise radius 6, blend **0.95** | (units: character ≈ 5.3 tall) |
| Depth of field | Bokeh, focus = camera → subject's **head + 0.64**, maxblur **0.012**, aperture **0.0004–0.0012 (wides)** → **0.0022–0.003 (close-ups)** | recompute every frame |
| Bloom | strength **0.32**, radius **0.55**, threshold **0.92** | |
| Grade | saturation **1.12**, warm tint **(1.04, 1.00, 0.93)**, vignette **0.32** | |
| Night grade | tint **(0.92, 0.97, 1.12)** | cooler, applied per shot |
| Storm / dread grade | **(0.90, 0.97, 1.14)**; red-menace shots **(1.02, 0.93, 1.00)** | |

## 2. Lighting presets (all values tested on renders)
### Cozy interior (night, warm)
- HDRI `warm_reception_dinner` 1k, environment **0.42**.
- Key: spot `#ffd6a8` **3.2**, front-right-high, angle 0.62, penumbra 0.85, 2048² soft shadows (bias −0.0003, normal bias 0.02, radius 6).
- Rim: spot `#ffb070` **2.2** from behind-left. Moon fill: directional `#8fa8ff` **0.35** from the window side.
- Hemisphere `#ffe3c4` / `#5a3a24` **0.55**. Practical lamp: point `#ffa24f` **22** + small glow point 6; shade emissive **3.2**.
- States used in the same set: `dim` (key 0.55, lamp 0), `dark` (key 0.1, env 0.05, moon 0.8), `dusk` (key 1.1, lamp 9).

### Storm / lightning
- `storm` state: key 0.16, rim 0.45, moon 1.0, hemi 0.07, env 0.07.
- Lightning = deterministic **double flash** per strike: `k·(e^(−14d) + 0.6·e^(−(d−0.16)²/0.002))` for d ∈ [0, 0.6] s.
  Drive a cold directional `#c8d8ff` at **9·L**, add **0.5·L** to the hemisphere and **0.35·L** to the environment.
- Use the same strike list for the thunder SFX (crack on close strikes, rolling rumble 2.6·k + 0.6 s) so sound and light always match.
- "Whiteout" transition: exposure × (1 + 7·w), w ramps 0→1 over 0.45 s then back over 0.6 s.

### City exterior (sky visible)
| State | Sky | sky I | env | sun (dir light, follow-shadow) | street lamps (pool of 4 nearest) | windows emissive | signs | exposure | fog |
|---|---|---|---|---|---|---|---|---|---|
| **sunset** | `industrial_sunset_puresky` 2k | 1.0 | 0.70 | `#ffa060` **3.4**, low from the west | 0 | 0.12 | 1.0 | 1.0 | `#f3a37a` 80→320 |
| **garage** (interior, door open) | same | 0.9 | 0.35 | 1.2 | — + garage point **34** (shadows) | 0.2 | 1.4 | 1.0 | — |
| **night** | `qwantani_night_puresky` 2k | **0.10** | **0.06** | moon `#8aa6ff` 0.18 | **46** (`#ffc98a`, decay 1.6, 34 range) | 1.2 | 2.2 | **0.78** | `#101a33` 70→260 |
| **alley** | night | 0.08 | 0.05 | 0.12 | 30 | 1.0 | 2.0 | 0.80 | `#0b1224` 40→200 |

- **Sun shadow follows the subject**: target = focus point, position = target + offset; ortho shadow camera ±32, 2048², bias −0.0004, normal bias 0.04.
- Point-light intensities need care in physical units: a garage light of 260 or street lamps of 220 blew every frame out; 34 / 46 were right.
- Night that still looks like dusk = sky + env too high. Drop sky intensity to ~0.1 and env to ~0.06 before touching exposure.

## 3. Materials
- Poly Haven 1k CC0, box-projected world-unit UVs, tile size in world units:
  stone wall `stacked_stone_wall` 7 (tint `#fff1df`, normal 1.4), floor `wooden_floor_02` 9, wood `wood_table_001` 3, plaster `plastered_wall_04` 6,
  fabric normals `quatrefoil_jacquard_fabric` with a flat colour; city: `asphalt_02` 10, `concrete_pavers` 4, `red_brick_03` 5, `garage_floor` 8, `corrugated_iron` 5.
- **Procedural facades** (cheap + great at night): one canvas texture per pastel colour = stucco noise + a window grid; a matching **emissive map** lights ~55 % of windows warm `#ffcf8a`.
  Intensity per lighting state (0.12 day → 1.2 night). Buildings stay single boxes → a few draw calls.
- **Storefronts**: warm gradient glass + mullions, emissive ×1.4 of the windows. **Distant towers**: dark glass grid, ~38 % lit.
- **Neon signs**: a box whose front/back faces get a canvas sign (dark board, glow-coloured text with two shadowBlur passes, border); emissive map = the same canvas, 1.0 day / 2.2 night → bloom does the glow.
- **Car paint**: MeshPhysical, metalness 0.35, roughness 0.28, **clearcoat 1**, clearcoat roughness 0.08. Glass: opacity 0.32.
- Clothes are never flat: procedural gingham with thread noise, knit stitches (bump), fuzzy bump for slippers, streaked bump + sheen for hair.
- **Translucent ghost**: unlit fresnel shader (core `#d3e6ff`, rim white ×1.6, alpha 0.74 → 0.96), inflated white outline hull 0.05, depth pre-pass so it reads as one volume.
  Gotcha: the pre-pass must use **the same `projectionMatrix * modelViewMatrix` math** as the colour pass or it z-fights. Tints swap via uniforms (angry red `#ff5a48` / soft `#a9c2ea`).
- Merge static set geometry per material in Blender (one mesh per material) — a whole street exports as ~40 meshes.

## 4. Faces (canvas decals) — extra options that paid off
- `tears` (blue streaks + a drop under each eye) for the emotional twist.
- `lashes` + lip-tint colour for female characters; per-style brow thickness (`browW`) and lift.
- Characters with **3D sunglasses**: hide the eyes in the decal and lift the brows above the lenses — the brows + mouth still act.
- Coloured moustache option (same shape, outline darkened).
- Cue faces to the beat, not just the line: *before* (reaction), *on the word*, *after* (the button).

## 5. Vehicles & riders
- Pivots: `Root` (ground centre, faces stage +z), `Body`, `Wheel{L,R}{F,R}`, `TrunkLid` (hinged), `SeatDriver` / `SeatPassenger`, `HeadlightTipL/R`, `LightBar`.
- Drive by animating `Root.z` (forward); **wheel roll = path length / radius** (use z + x so drift paths keep rolling).
- Headlights: one spot per car between the two tips, intensity 260 × night factor; emissive head/tail lights 2.5 + 3·night.
- Police: siren materials alternate at **3 Hz** (`floor(t·6) % 2`), plus two coloured point lights at the light bar (26 / 3).
- **Riders**: place characters relative to a seat node every frame (node world matrix × local offset), scale **0.86** so two fit side by side,
  legs angled **−45°** into the footwell (at −88° the feet poke through the hood in front views).
- Drift: rotate `Root.ry` 0→90° while moving along local x after the straight.

## 6. Camera & framing
- `follow` cameras: from/to/look offsets added to an actor's Root world position (tracking shots at speed).
- `shake` amplitude per shot for chases (0.02–0.06): sum of two sines on x, one on y.
- Contact-sheet every shot **before** the full render; the misses we actually hit: camera inside a building/sofa/ghost,
  arms raised in front of the face, bus/vehicle blocking the subject, feet through the hood, lights too bright.

## 7. Editing tricks (Remotion, no 3D re-render needed)
- **Cold open**: 5 flash-forward clips (1.0 / 1.4 / 0.7 / 1.2 / 1.4 s) with a white flash (0.9 → 0 over 3 frames), 1.12 → 1.0 punch-zoom, 8-frame shake,
  red edge vignette, a boom + whoosh per cut over a rising riser, a brass "BRAAM" on the best image, then a black card **"12 HOURS EARLIER…"** typed over clock ticks.
- **Re-cut from plates**: keep the caption-free plates + un-ducked music/SFX stems; an edit list of `[a, b, fx]` slices (fx `p` = 2D punch-in ×1.18 with a slow push)
  rebuilds the episode at any tempo. Voices are placed per beat and the bed is **ducked live** under every word (music 0.4, SFX 0.42, 60 ms attack, ~170 ms release).
- Tempo that matched the house rule: ~0.9 s per shot on screen at 1.5×, speech ~60 % of the runtime.
- Speed-ups (1.5× / 2× / 2.5×) with Remotion `OffthreadVideo playbackRate` keep voice pitch.

## 8. Voice & mix notes
- Record **one take per character** with `[long pause]` between lines, then cut per line on measured silence (or the transcription word times) —
  far fewer generations on the free tier, which often runs **one job at a time** ("busy" otherwise).
- Normalise lines to −17 dB RMS; voice ≥ 6 dB over music + SFX on every line (we measured 9–28 dB).
