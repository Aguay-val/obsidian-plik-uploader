#!/usr/bin/env bash
set -euo pipefail

DEST="/home/valentin/Dev/Vibe/MyBrain/.obsidian/plugins/plik-uploader"

rtk rsync -r --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.superpowers' \
  --exclude 'data.json' \
  ./ "$DEST"
