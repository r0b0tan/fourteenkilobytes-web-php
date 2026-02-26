#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
VERSION_JSON="$SCRIPT_DIR/version.json"
OUTPUT_DIR="$SCRIPT_DIR/release-assets"
VERSION=""
SKIP_BUILD=false

function usage() {
  cat << EOF
Usage: ./release-assets.sh [options]

Options:
  --version VALUE       Version/tag label for filenames (e.g. v1.0.0-beta)
                        Default: value from version.json
  --output-dir PATH     Output directory for ZIP + checksum (default: ./release-assets)
  --skip-build          Do not run ./build.sh before packaging
  -h, --help            Show this help

Examples:
  ./release-assets.sh
  ./release-assets.sh --version v1.0.0-beta
  ./release-assets.sh --version v1.0.0 --output-dir /tmp/release-assets
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  VERSION="$(python3 - "$VERSION_JSON" << 'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    data = json.load(f)

print((data.get('version') or '').strip())
PY
)"
fi

if [[ -z "$VERSION" ]]; then
  echo "Could not determine version. Use --version VALUE."
  exit 1
fi

if [[ ! "$VERSION" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid version '$VERSION'. Allowed characters: letters, numbers, dot, underscore, hyphen."
  exit 1
fi

if [[ "$SKIP_BUILD" != "true" ]]; then
  echo "Running build.sh..."
  "$SCRIPT_DIR/build.sh"
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "dist directory not found: $DIST_DIR"
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip is required (install: sudo apt install zip)"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

ARCHIVE_NAME="fourteenkilobytes-${VERSION}-dist.zip"
ARCHIVE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"
CHECKSUM_PATH="$ARCHIVE_PATH.sha256"

rm -f "$ARCHIVE_PATH" "$CHECKSUM_PATH"

echo "Creating archive: $ARCHIVE_PATH"
(
  cd "$DIST_DIR"
  zip -r "$ARCHIVE_PATH" . >/dev/null
)

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$OUTPUT_DIR"
    sha256sum "$ARCHIVE_NAME" > "$(basename "$CHECKSUM_PATH")"
  )
elif command -v shasum >/dev/null 2>&1; then
  (
    cd "$OUTPUT_DIR"
    shasum -a 256 "$ARCHIVE_NAME" > "$(basename "$CHECKSUM_PATH")"
  )
elif command -v openssl >/dev/null 2>&1; then
  HASH="$(openssl dgst -sha256 "$ARCHIVE_PATH" | awk '{print $NF}')"
  echo "$HASH  $ARCHIVE_NAME" > "$CHECKSUM_PATH"
else
  echo "No SHA256 tool found (sha256sum/shasum/openssl)."
  exit 1
fi

echo "Release assets created:"
echo "- $ARCHIVE_PATH"
echo "- $CHECKSUM_PATH"
