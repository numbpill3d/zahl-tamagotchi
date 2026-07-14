#!/usr/bin/env bash
# Syncs the shared core/ engine into both build targets, then zips the
# browser build for itch.io upload. core/ is the single source of truth —
# always edit there, never edit browser/core or desktop/core directly.
set -euo pipefail
cd "$(dirname "$0")"

echo "syncing core -> browser/core, desktop/core"
rm -rf browser/core desktop/core
mkdir -p browser/core desktop/core
cp core/*.js browser/core/
cp core/*.js desktop/core/

echo "zipping itch.io web build"
rm -f dist/zahl-tamagotchi-web.zip
mkdir -p dist
cd browser
zip -r -q ../dist/zahl-tamagotchi-web.zip . -x '.*'
cd ..

echo "done -> dist/zahl-tamagotchi-web.zip"
echo "desktop app: cd desktop && npm install && npm start"
