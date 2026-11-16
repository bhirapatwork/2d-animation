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

5. Shot plan + world: src/videos/scorchie/ (story.ts shots/cams/DOF timed to words.json, world.ts street + tower +
   car melt + beam + plaza + fins + roof garden, cast.ts characters, Scorchie.tsx composition "ScorchieShort", 2190 f).
   Reused unchanged from the bridge template: ink.ts, lensblur.ts, grade.ts, shade.ts, lights.ts, cardshade.ts, paint.ts;
   toon.ts gained props (cup, egg, pan, envelope, spanner); build.ts exports setSight/inTheWay.
6. Sound: audio/score_s.py (original score), audio/sfx_s.py (84 synthesized events), audio/mix_s.py
   (voice unchanged, music -10 LU / SFX -16 LU vs voice, -3 dB duck, master -15 LUFS / -1.2 dBTP) -> audio/out/mix.wav.
   Run with the scratch venv python (numpy + scipy).

## Commands
- Stills: scripts/stills.sh out/scorchie/x_ 20,450 0.5
- Video:  REMOTION_TMP=<tmp> node scripts/render.mjs out/scorchie/video.mp4 1.3333 [from-to] [concurrency]
- Mux:    ffmpeg -i video.mp4 -i audio/out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k final.mp4

## Next
- Look checks on all shots, fix framing; final render; QA (scripts/short_qa.py); deliver.
