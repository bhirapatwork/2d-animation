# Scorchie short — progress notes

## Done (2026-11-16)
1. Topic + facts: Walkie-Talkie tower (20 Fenchurch St) melting a Jaguar, 2013. All facts verified, see SCRIPT.md.
2. Script v1 locked (SCRIPT.md).
3. Voice: user's ElevenLabs take -> voice/voice_src.mp3, voice/voice.wav (48 kHz mono), 72.9 s.
   Word timings: voice/words.json (206 words, s/e seconds + f/ef frames @30fps), forced-aligned with pocketsphinx
   (HF/whisper blocked in this env). Cross-checked against silencedetect pauses: matches.
   Hand-fix TODO: "and" before "what did they put" should start ~68.08 s (after the pause), not 67.44.
4. Remotion project set up here (remotion 4, three 0.169, r3f 8). Bridge template copied to src/videos/bridge,
   registered as BridgeShort; test still renders (out/bridge_test/x_400.jpg, ~45 s incl. bundle, CPU swangle).

## Environment notes
- Render: BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
  REMOTION_TMP=<scratch>/rtmp node scripts/bridge-stills.mjs out/<name>/x_ <frames> 0.5   (GL defaults to swangle, COMP env picks composition)
- No GPU: final 2K render will be slow (estimate hours).
- Kenney GLB props missing (public/bridge/kenney/*.glb 404) — template falls back to none.

## Next
5. Copy src/videos/bridge -> src/videos/scorchie, new composition ScorchieShort, TOTAL = 2188 f (72.9 s).
   Shot plan: hook (melted Jaguar), City skyline + curved tower, man parks, mirror/badge/panels melt inserts,
   shops scorch, reporter fries egg, luckily/unluckily (cheque vs tower), flat window vs spoon diagram,
   giant spoon tower beam on parking space, sunshade fins bolted on, crane up to glass-roof garden.
6-11. World, characters, post, sound, look checks, final render (per skill pipeline).
