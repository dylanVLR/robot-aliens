# SKYBOUND PROTOCOL — Browser Slot Game
## Design Doc & Asset Manifest (single source of truth)

Theme: an ORIGINAL "sky-titan transforming mecha" universe — an homage to the gritty,
kinetic Energon-era comic aesthetic. **Do NOT use any Hasbro/Skybound IP**: no character
names (Optimus, Megatron, etc.), no faction logos, no "Transformers" wordmark anywhere
in art prompts, code, or UI. All characters below are original.

Original cast:
- **AERION** — azure/silver sky sentinel (hero, top symbol)
- **VOLTRIX** — crimson/orange storm-charger
- **NIMBUS** — ivory/gold cloud carrier
- **RAZORWING** — violet/black interceptor (villain)

## File layout (project root = this folder)
```
index.html
css/style.css
js/game.js
assets/images/*.png
assets/audio/*.mp3
assets/video/bg_loop.mp4   (optional, may not exist)
tools/*.ps1|*.sh           (build-time generation scripts — never shipped to client)
```
**API keys live in `.env` at project root. They are read ONLY by build-time scripts in
`tools/`. Never embed keys or key values in index.html/css/js, logs, or agent output.**

---

## Image manifest → `assets/images/`
All symbols: 1024x1024 PNG, **transparent background** if the API supports it
(gpt-image-1 `background:"transparent"`); otherwise solid very dark navy (#0b1020) background.
Shared style suffix for every symbol prompt:
"glossy comic-book mecha style, bold ink linework, dramatic rim lighting, dark storm-sky
palette accents, centered emblem composition, high detail, no text, no watermark,
original robot design"

| file | subject prompt (prepend to shared style) |
|---|---|
| symbol_aerion.png | Head-and-shoulders portrait of an original heroic transforming robot sky-sentinel, azure blue and brushed-silver armor, glowing cyan eyes, jet-intake shoulders |
| symbol_voltrix.png | Head-and-shoulders portrait of an original rugged transforming robot storm-charger, crimson and burnt-orange armor, crackling amber eyes, turbine chest |
| symbol_nimbus.png | Head-and-shoulders portrait of an original noble transforming robot cloud-carrier, ivory-white and gold armor, warm golden eyes, winged helm |
| symbol_razorwing.png | Head-and-shoulders portrait of an original sinister villain transforming robot interceptor, violet and gunmetal-black angular armor, piercing red eyes, blade-like wing crest |
| symbol_crystal.png | A jagged glowing cyan energy crystal cluster radiating power, faceted, inner light |
| symbol_gear.png | A heavy golden mechanical gear cog with worn metal teeth, subtle energy glow in the hub |
| symbol_wings.png | A silver mechanical winged emblem, twin swept metal wings around a small turbine core |
| symbol_thruster.png | A single jet thruster engine nozzle with blue afterburner flame, angled dynamically |
| symbol_wild.png | A glowing cube artifact mid-transformation, panels unfolding, radiant teal energy seams, the word WILD engraved in bold metallic letters on its face |
| symbol_scatter.png | A swirling storm vortex portal ringed with lightning, deep purple and electric blue |
| background.png (1536x1024) | Vast floating sky citadel above roiling storm clouds at dusk, distant lightning, epic comic splash-page style, deep indigo and teal palette with orange dusk highlights, painterly, no characters, no text |
| logo.png (1536x1024, transparent) | Metallic chrome game-logo lettering reading "SKYBOUND PROTOCOL" in bold angular sci-fi typeface with lightning accents and subtle blue glow, comic-book style, on transparent background, nothing else |

Validation: file exists, PNG magic bytes (89 50 4E 47), size > 20 KB. Retry once on failure.

### Optional motion background (Runway) → `assets/video/bg_loop.mp4`
Only after `background.png` exists: image-to-video, 5 s, ratio 1280:720, prompt
"slow drifting storm clouds, subtle lightning flickers, gentle ambient motion, cinematic,
static camera". If the API errors (auth/credits) or takes > 6 min: skip gracefully — the
game must look complete with the static background.

---

## Audio manifest → `assets/audio/`
ElevenLabs. SFX via sound-generation; voice lines via TTS (pick a deep, cinematic voice
from /v1/voices). Validation: file > 10 KB, plausible MP3 header. Retry once.

| file | type | duration | prompt / text |
|---|---|---|---|
| sfx_click.mp3 | sfx | 1.0 | short crisp sci-fi interface click |
| sfx_spin.mp3 | sfx | 2.5 | mechanical slot reels spinning up, whirring servo motors, sci-fi hum |
| sfx_reelstop.mp3 | sfx | 0.8 | single heavy metallic clunk, robotic latch engaging |
| sfx_win_small.mp3 | sfx | 2.0 | bright short victorious synth jingle with metallic chime |
| sfx_win_big.mp3 | sfx | 4.0 | triumphant epic orchestral-synth fanfare with electric guitar hit and thunder |
| sfx_transform.mp3 | sfx | 3.0 | complex mechanical transformation, rapid ratcheting gears, servo whines, pneumatic locks (an ORIGINAL sound — do not imitate any trademarked transformation sound) |
| sfx_freespins.mp3 | sfx | 3.5 | rising energy surge climaxing in a thunderclap, epic sci-fi stinger |
| music_loop.mp3 | sfx | 20.0 | brooding epic ambient sci-fi loop, distant thunder, low synth pulse, heroic undertone, designed to loop seamlessly |
| vo_engage.mp3 | tts | — | "Skybound protocol... engaged." |
| vo_bigwin.mp3 | tts | — | "Maximum power! Colossal win!" |

---

## Game spec
Static site, **no frameworks, no build step, no network calls at runtime, no fetch()**
(must also work from file://). Vanilla HTML/CSS/JS. Asset paths relative.

### Reels & symbols
- 5 reels x 3 rows. Symbol ids: `AER, VOL, NIM, RAZ, CRY, GEA, WIN, THR, WLD, SCT`.
- Weighted reel strips (~40 entries per reel). Low symbols heavier. `WLD` on reels 2–4 only.
  1–2 `SCT` per strip. Exact RTP tuning not required; aim "generous fun", roughly 92–97%.

### Paylines (10, fixed; row index 0=top,1=mid,2=bottom per reel)
```
1:[1,1,1,1,1] 2:[0,0,0,0,0] 3:[2,2,2,2,2] 4:[0,1,2,1,0] 5:[2,1,0,1,2]
6:[0,0,1,2,2] 7:[2,2,1,0,0] 8:[1,0,0,0,1] 9:[1,2,2,2,1] 10:[0,1,1,1,0]
```

### Paytable (multiplier x line-bet; line-bet = totalBet/10) for 3/4/5-of-a-kind, left-to-right
```
AER 25/100/500   VOL 20/75/300   NIM 15/50/200   RAZ 15/50/200
CRY 10/30/100    GEA 5/15/60     WIN 5/15/60     THR 4/10/40
WLD substitutes every symbol except SCT; 3/4/5 WLD on a line pays 50/200/1000
SCT pays scattered (any positions) 3/4/5 = 2/10/50 x TOTAL bet
```
Only the highest win per line counts; scatter wins add on top.

### Features
- Balance starts 5000 credits, persisted in `localStorage("skybound_balance")`
  (guard against NaN/corrupt values; "Reset credits" option in paytable modal).
- Total-bet selector: 10 / 20 / 50 / 100 / 200. Block spin if balance < bet.
- Spin: staggered reel stops (~250 ms apart), motion-blur effect while spinning,
  `sfx_reelstop` per reel. "Anticipation" slow-down on reel 5 when 2 scatters already landed.
- Wins: highlight winning lines + symbols, credit count-up animation, `sfx_win_small`.
- **Big win** (win >= 10x total bet): full-screen overlay, transform-style animation on the
  winning robot symbols (CSS keyframes: flip/scale/glow panel-shift), `sfx_transform` +
  `sfx_win_big` + `vo_bigwin`.
- **Free spins**: 3+ SCT anywhere → 8 free spins, all wins x2, `sfx_freespins` + `vo_engage`,
  distinct visual state (storm intensifies). Retrigger allowed (+8). Show remaining count.
- Autoplay toggle (10 spins, stops on free-spins trigger or balance < bet). Mute toggle
  (persisted). Space bar = spin. Paytable modal showing symbols + values.
- Ambient `music_loop` looping; **audio must unlock on first user gesture** (browser
  autoplay policy): start muted-silent until first click, then play. No console errors.

### Resilience (critical — assets are generated in parallel with the code)
- Inline the asset manifest in JS (no fetch). Preload with `Image()`/`Audio()`.
- Every image that fails to load → canvas-drawn fallback tile (symbol initials + themed
  color) swapped in seamlessly. Every audio that fails → no-op sound. The game must be
  fully playable with ZERO generated assets present.
- If `assets/video/bg_loop.mp4` exists, use it as looping muted background video behind
  `background.png`; otherwise just the image; missing both → CSS gradient sky.

### Debug hooks (for automated testing; harmless in production)
`window.SKYBOUND = { state(), spin(), forceNext(kind) }` where `forceNext('scatter3')`
rigs the next spin to land 3 scatters, `forceNext('bigwin')` rigs a 5-of-a-kind AER line,
`setBalance(n)` sets balance.

### Look & feel
Dark storm sky, indigo/teal with orange accents, chunky metallic UI bezels, subtle
lightning flash animation in background, responsive: fits 1280x800 down to ~380px wide.
