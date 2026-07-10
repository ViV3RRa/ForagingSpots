#!/usr/bin/env bash
# Resize + compress spot-type illustrations (subtask 4.3).
#
# Source PNGs are ~900px / ~800 KB each; the app renders them at <=76 px
# (welcome-screen badge cluster), so 256px covers 3x devicePixelRatio.
# Palette quantization (PNG8 with full-alpha palette) shrinks the flat
# illustrations to ~5-12 KB each with no visible quality loss.
#
# Requires ImageMagick (`magick`). Usage:
#   ./scripts/optimize-spot-images.sh <source-dir> [dest-dir]
# dest-dir defaults to public/spot_types. Pass a directory of full-size
# originals as source; files are written with the same basenames.
set -euo pipefail

SRC="${1:?usage: optimize-spot-images.sh <source-dir> [dest-dir]}"
DEST="${2:-public/spot_types}"

for f in "$SRC"/*.png; do
  name=$(basename "$f")
  magick "$f" -resize 256x256 -strip -dither FloydSteinberg -colors 255 \
    -define png:compression-level=9 -define png:format=png8 "$DEST/$name"
  echo "$name -> $(du -h "$DEST/$name" | cut -f1)"
done
