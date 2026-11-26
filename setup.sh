#!/usr/bin/env bash
# One-time setup for macOS / Linux.
set -euo pipefail
cd "$(dirname "$0")"
need() { command -v "$1" >/dev/null 2>&1; }
if [[ "$(uname)" == "Darwin" ]]; then
  need brew || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
  need node || brew install node
  need ffmpeg || brew install ffmpeg
  need python3 || brew install python
  if ! need blender; then
    brew install --cask blender
    mkdir -p "$HOME/bin" && ln -sf /Applications/Blender.app/Contents/MacOS/Blender "$HOME/bin/blender"
    echo 'Add ~/bin to your PATH if "blender" is not found.'
  fi
else
  need node && need ffmpeg && need python3 || { echo "Install node, ffmpeg and python3 with your package manager."; exit 1; }
  need blender || echo "Install Blender 4.2 LTS from https://www.blender.org/download/ and put 'blender' on the PATH."
fi
ffmpeg -hide_banner -filters 2>/dev/null | grep -q rubberband || echo "WARNING: this ffmpeg has no rubberband filter (needed for the pitched-up voices)."
npm install
npx playwright install chromium
python3 -m pip install --user faster-whisper numpy
node tools/fetch-assets.mjs
need blender && npm run assets
echo "Setup done. See README.md."
