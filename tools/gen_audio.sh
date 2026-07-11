#!/bin/bash
# gen_audio.sh — build-time audio asset generation via ElevenLabs.
# Run from Git Bash. Reads ELEVENLABS_API_KEY from .env at project root.
# Never prints the key. Max 2 API calls per manifest file (1 attempt + 1 retry).

ROOT="/c/Users/University/Documents/Claude/Alice in Thunderland"
OUT="$ROOT/assets/audio"
ENVFILE="$ROOT/.env"
mkdir -p "$OUT"

KEY=$(grep -E '^ELEVENLABS_API_KEY=' "$ENVFILE" | cut -d= -f2- | tr -d '\r" ')
if [ -z "$KEY" ]; then
  echo "FATAL: ELEVENLABS_API_KEY not found in .env"
  exit 1
fi

# Deep, cinematic, masculine voice chosen from /v1/voices:
# "Adam - American, Dark and Tough" (male, middle_aged, characters_animation)
VOICE_ID="IRHApOXLvnW57QJPQH2P"

# validate <file> <min_bytes> -> 0 ok / 1 bad
validate() {
  local f="$1" min="$2"
  [ -f "$f" ] || { echo "  missing"; return 1; }
  local sz first
  sz=$(wc -c < "$f" | tr -d ' ')
  if [ "$sz" -le "$min" ]; then
    echo "  too small ($sz bytes) body-head: $(head -c 200 "$f" | tr -d '\0')"
    return 1
  fi
  first=$(head -c 1 "$f")
  if [ "$first" = "{" ]; then
    echo "  JSON error body: $(head -c 300 "$f" | tr -d '\0')"
    return 1
  fi
  echo "  OK ($sz bytes)"
  return 0
}

# gen_sfx <file> <duration> <prompt>
gen_sfx() {
  local file="$1" dur="$2" prompt="$3" target="$OUT/$1" attempt
  for attempt in 1 2; do
    echo "[sfx] $file attempt $attempt"
    curl.exe -s --max-time 180 -X POST "https://api.elevenlabs.io/v1/sound-generation" \
      -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
      -d "{\"text\":\"$prompt\",\"duration_seconds\":$dur,\"prompt_influence\":0.5}" \
      --output "$target"
    if validate "$target" 10240; then return 0; fi
  done
  return 1
}

# gen_tts <file> <text>
gen_tts() {
  local file="$1" text="$2" target="$OUT/$1" attempt
  for attempt in 1 2; do
    echo "[tts] $file attempt $attempt"
    curl.exe -s --max-time 120 -X POST \
      "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID?output_format=mp3_44100_128" \
      -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
      -d "{\"text\":\"$text\",\"model_id\":\"eleven_multilingual_v2\"}" \
      --output "$target"
    if validate "$target" 5120; then return 0; fi
  done
  return 1
}

FAILED=""

gen_sfx "sfx_click.mp3"     1.0 "short crisp sci-fi interface click" || FAILED="$FAILED sfx_click.mp3"
gen_sfx "sfx_spin.mp3"      2.5 "mechanical slot reels spinning up, whirring servo motors, sci-fi hum" || FAILED="$FAILED sfx_spin.mp3"
gen_sfx "sfx_reelstop.mp3"  0.8 "single heavy metallic clunk, robotic latch engaging" || FAILED="$FAILED sfx_reelstop.mp3"
gen_sfx "sfx_win_small.mp3" 2.0 "bright short victorious synth jingle with metallic chime" || FAILED="$FAILED sfx_win_small.mp3"
gen_sfx "sfx_win_big.mp3"   4.0 "triumphant epic orchestral-synth fanfare with electric guitar hit and thunder" || FAILED="$FAILED sfx_win_big.mp3"
gen_sfx "sfx_transform.mp3" 3.0 "complex mechanical transformation, rapid ratcheting gears, servo whines, pneumatic locks" || FAILED="$FAILED sfx_transform.mp3"
gen_sfx "sfx_freespins.mp3" 3.5 "rising energy surge climaxing in a thunderclap, epic sci-fi stinger" || FAILED="$FAILED sfx_freespins.mp3"
gen_sfx "music_loop.mp3"   20.0 "brooding epic ambient sci-fi loop, distant thunder, low synth pulse, heroic undertone, designed to loop seamlessly" || FAILED="$FAILED music_loop.mp3"

gen_tts "vo_engage.mp3" "Skybound protocol... engaged." || FAILED="$FAILED vo_engage.mp3"
gen_tts "vo_bigwin.mp3" "Maximum power! Colossal win!"  || FAILED="$FAILED vo_bigwin.mp3"

echo "-----"
if [ -n "$FAILED" ]; then
  echo "FAILED:$FAILED"
  exit 2
fi
echo "ALL OK"
