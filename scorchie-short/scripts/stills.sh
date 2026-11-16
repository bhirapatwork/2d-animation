#!/bin/bash
# usage: scripts/stills.sh <outPrefix> <frames> [scale]
export BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
export REMOTION_TMP=${REMOTION_TMP:-/tmp/remotion-tmp}
export COMP=${COMP:-ScorchieShort}
exec node "$(dirname "$0")/bridge-stills.mjs" "$@"
