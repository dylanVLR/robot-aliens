# SKYBOUND PROTOCOL

A browser slot game with an original sky-mecha theme — transforming robot
guardians, storm citadels, and energon-blue lightning. Pure HTML/CSS/JS,
no frameworks, no build step, fully playable offline.

![Genre](https://img.shields.io/badge/genre-slot%20game-blue)
![Stack](https://img.shields.io/badge/stack-vanilla%20JS-yellow)

## Play

Open `index.html` in any modern browser — that's it. Or serve it
(nicer for some browsers' media policies):

```powershell
powershell -File tools/serve.ps1 -Port 4173   # then open http://localhost:4173
```

Space bar spins.

## Features

- 5×3 reels, 10 fixed paylines, weighted reel strips
- Wilds (reels 2–4), scatter pays, 8 free spins at ×2 with retrigger
- Big-win overlay with mech-transform animation and announcer voice
- Autoplay, mute, bet selector, persistent balance (localStorage)
- AI-generated art (Gemini), SFX/voice (ElevenLabs), animated storm
  background (Runway image-to-video) with a seamless two-player crossfade loop
- Fully resilient: runs with zero assets present (canvas fallback tiles)

## Project layout

```
index.html  css/  js/        the game (no runtime network calls, no keys)
assets/                      generated images, audio, video
tools/                       build-time asset generation + dev server scripts
DESIGN.md                    design doc / asset manifest (source of truth)
```

## Regenerating assets

The scripts in `tools/` read API keys from a `.env` file at the project root
(`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ELEVENLABS_API_KEY`, `RUNWAYML_API_SECRET`).
`.env` is git-ignored — never commit it. Shipped game files contain no keys
and make no network calls.

```powershell
powershell -File tools/generate_images.ps1 -Provider gemini
bash tools/gen_audio.sh
powershell -File tools/generate_bg_video.ps1
```

All characters and art are original; no relation to any existing franchise.
