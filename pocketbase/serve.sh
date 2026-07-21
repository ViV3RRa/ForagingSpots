#!/usr/bin/env bash
#
# Local PocketBase dev server. Downloads the pinned binary on first run and
# execs `pocketbase serve` against the local pb_data / pb_migrations /
# pb_hooks directories.
#
# Usage:
#   ./pocketbase/serve.sh           # boots on http://127.0.0.1:8090
#   ./pocketbase/serve.sh --http=0.0.0.0:8090
#
# Bump PB_VERSION below to upgrade. Releases:
# https://github.com/pocketbase/pocketbase/releases

set -euo pipefail

PB_VERSION="0.37.5"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$DIR/.bin"
BIN="$BIN_DIR/pocketbase"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64)  ARCH="amd64" ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac
case "$OS" in
  darwin|linux) ;;
  *) echo "unsupported os: $OS (use a Linux/macOS shell)" >&2; exit 1 ;;
esac

needs_download=1
if [ -x "$BIN" ]; then
  if "$BIN" --version 2>/dev/null | grep -q "$PB_VERSION"; then
    needs_download=0
  fi
fi

if [ "$needs_download" = "1" ]; then
  mkdir -p "$BIN_DIR"
  ZIP="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
  URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${ZIP}"
  echo "Downloading PocketBase $PB_VERSION ($OS/$ARCH)"
  echo "  $URL"
  curl -fsSL -o "$BIN_DIR/$ZIP" "$URL"
  unzip -oq "$BIN_DIR/$ZIP" -d "$BIN_DIR"
  rm "$BIN_DIR/$ZIP"
  chmod +x "$BIN"
fi

cd "$DIR"
exec "$BIN" serve \
  --dir=pb_data \
  --migrationsDir=pb_migrations \
  --hooksDir=pb_hooks \
  "$@"
