#!/usr/bin/env bash
# Builds everything needed for an itch.io release: the web zip (build.sh)
# plus Linux and Windows desktop packages. Slower than build.sh since it
# downloads platform electron binaries and runs wine for the Windows
# build -- run this before a release, not on every core/ edit.
set -euo pipefail
cd "$(dirname "$0")"

./build.sh

echo "installing desktop build deps (first run only)"
cd desktop
npm install --no-audit --no-fund

echo "building linux AppImage"
npx electron-builder --linux AppImage --publish never

echo "building windows portable exe (via wine)"
npx electron-builder --win portable --publish never

cd ..
echo ""
echo "done. release artifacts:"
echo "  web:     dist/zahl-tamagotchi-web.zip"
echo "  linux:   desktop/dist/Zahl-*.AppImage"
echo "  windows: desktop/dist/Zahl*.exe"
