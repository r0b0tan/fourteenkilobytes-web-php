#!/bin/bash

set -euo pipefail

REPO="r0b0tan/fourteenkilobytes-web-php"
BASE_DIR="/var/www/fourteenkilobytes"
VERSION="latest"
KEEP_RELEASES=5
HEALTH_URL="http://127.0.0.1/api/health"

function usage() {
  cat << EOF
Usage: ./upgrade.sh [options]

Options:
  --repo OWNER/REPO      GitHub repository (default: $REPO)
  --base-dir PATH        Base deploy directory (default: $BASE_DIR)
  --version TAG|latest   Release tag to deploy (default: latest)
  --keep-releases N      Keep latest N releases (default: $KEEP_RELEASES)
  --health-url URL       Health check URL after switch (default: $HEALTH_URL)
  --no-health-check      Skip health check
  -h, --help             Show this help

Example:
  ./upgrade.sh --base-dir /var/www/fourteenkilobytes --version v1.0.0
EOF
}

SKIP_HEALTH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --base-dir)
      BASE_DIR="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --keep-releases)
      KEEP_RELEASES="$2"
      shift 2
      ;;
    --health-url)
      HEALTH_URL="$2"
      shift 2
      ;;
    --no-health-check)
      SKIP_HEALTH=true
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

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required"
  exit 1
fi
if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required"
  exit 1
fi
if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required"
  exit 1
fi

TAG="$VERSION"
if [[ "$VERSION" == "latest" ]]; then
  TAG="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  if [[ -z "$TAG" ]]; then
    echo "Could not resolve latest release tag for $REPO"
    exit 1
  fi
fi

RELEASE_VERSION="${TAG#v}"
RELEASE_DIR="$BASE_DIR/releases/$RELEASE_VERSION"

if [[ -e "$RELEASE_DIR" ]]; then
  echo "Release already exists: $RELEASE_DIR"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ARCHIVE="$TMP_DIR/release.tar.gz"
echo "Downloading $REPO $TAG..."
curl -fsSL "https://github.com/$REPO/archive/refs/tags/$TAG.tar.gz" -o "$ARCHIVE"

echo "Extracting archive..."
tar -xzf "$ARCHIVE" -C "$TMP_DIR"
SOURCE_DIR="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n1)"

if [[ -z "$SOURCE_DIR" || ! -f "$SOURCE_DIR/build.sh" ]]; then
  echo "Could not find extracted source or build.sh"
  exit 1
fi

echo "Building release artifact..."
(cd "$SOURCE_DIR" && ./build.sh)

DIST_DIR="$SOURCE_DIR/dist"
if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build failed: dist directory missing"
  exit 1
fi

echo "Preparing release directories..."
mkdir -p "$BASE_DIR/releases" "$BASE_DIR/data/posts" "$BASE_DIR/data/sources" "$RELEASE_DIR"

echo "Syncing dist to $RELEASE_DIR..."
rsync -a --delete --exclude='data/**' "$DIST_DIR/" "$RELEASE_DIR/"

if [[ -d "$DIST_DIR/data/seeds" && ! -d "$BASE_DIR/data/seeds" ]]; then
  cp -r "$DIST_DIR/data/seeds" "$BASE_DIR/data/"
fi

ln -sfn "$BASE_DIR/data" "$RELEASE_DIR/data"

PREVIOUS_TARGET=""
if [[ -L "$BASE_DIR/current" ]]; then
  PREVIOUS_TARGET="$(readlink -f "$BASE_DIR/current" || true)"
fi

echo "Switching current symlink to $RELEASE_DIR..."
ln -sfn "$RELEASE_DIR" "$BASE_DIR/current"

if [[ "$SKIP_HEALTH" != "true" && -n "$HEALTH_URL" ]]; then
  echo "Running health check: $HEALTH_URL"
  HEALTH_OK=false
  for _ in 1 2 3 4 5; do
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
      HEALTH_OK=true
      break
    fi
    sleep 1
  done

  if [[ "$HEALTH_OK" != "true" ]]; then
    echo "Health check failed, rolling back..."
    if [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
      ln -sfn "$PREVIOUS_TARGET" "$BASE_DIR/current"
    fi
    exit 1
  fi
fi

if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] && [[ "$KEEP_RELEASES" -gt 0 ]]; then
  mapfile -t ALL_RELEASES < <(find "$BASE_DIR/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | awk '{print $2}')
  INDEX=0
  CURRENT_TARGET="$(readlink -f "$BASE_DIR/current" || true)"
  for REL in "${ALL_RELEASES[@]}"; do
    INDEX=$((INDEX + 1))
    if [[ "$INDEX" -le "$KEEP_RELEASES" ]]; then
      continue
    fi
    if [[ "$REL" != "$CURRENT_TARGET" ]]; then
      rm -rf "$REL"
    fi
  done
fi

echo "Upgrade successful: $TAG -> $RELEASE_DIR"