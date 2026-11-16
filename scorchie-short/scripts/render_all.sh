#!/bin/bash
# Full 2K render in 4 resumable segments, then concat + mux with the mix. Log: out/scorchie/final/render.log
cd "$(dirname "$0")/.."
D=out/scorchie/final; mkdir -p $D
export REMOTION_TMP=${REMOTION_TMP:-/tmp/remotion-tmp}
for r in 0-549 550-1099 1100-1649 1650-2189; do
  f=$D/part_$r.mp4
  [ -f $f ] && { echo "skip $r"; continue; }
  echo "start $r $(date +%T)"
  node scripts/render.mjs $f.tmp.mp4 1.3333333333333333 $r 2 || { echo "FAILED $r"; exit 1; }
  mv $f.tmp.mp4 $f; echo "done $r $(date +%T)"
done
ls $D/part_*.mp4 | sort -t_ -k2 -n | sed "s/^/file '/;s/$/'/" | sed "s|file '$D/|file '|" > $D/list.txt
(cd $D && ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy video.mp4) || { echo "FAILED concat"; exit 1; }
ffmpeg -v error -y -i $D/video.mp4 -i audio/out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest $D/scorchie_final.mp4 || { echo "FAILED mux"; exit 1; }
echo "ALL DONE $(date +%T)"
