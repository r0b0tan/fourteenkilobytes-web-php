#!/bin/bash

set -euo pipefail

BASE_DIR="/var/www/fourteenkilobytes"
TARGET_VERSION=""
HEALTH_URL="http://127.0.0.1/api/health"
LIST_ONLY=false

function usage() {
  cat << EOF
Usage: ./rollback.sh [options]

Options:
  --base-dir PATH      Base deploy directory (default: $BASE_DIR)
  --to VERSION         Roll back to a specific version directory name
  --health-url URL     Health check URL after switch (default: $HEALTH_URL)
  --no-health-check    Skip health check
  --list               List available releases
  -h, --help           Show this help

Example:
  ./rollback.sh --base-dir /var/www/fourteenkilobytes
  ./rollback.sh --base-dir /var/www/fourteenkilobytes --to 1.0.0
EOF
}

SKIP_HEALTH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-dir)
      BASE_DIR="$2"
      shift 2
      ;;
    --to)
      TARGET_VERSION="$2"
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
    --list)
      LIST_ONLY=true
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

RELEASES_DIR="$BASE_DIR/releases"
if [[ ! -d "$RELEASES_DIR" ]]; then
  echo "Releases directory not found: $RELEASES_DIR"
  exit 1
fi

CURRENT_TARGET=""
if [[ -L "$BASE_DIR/current" ]]; then
  CURRENT_TARGET="$(readlink -f "$BASE_DIR/current" || true)"
fi

mapfile -t RELEASE_LIST < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | awk '{print $2}')

if [[ "$LIST_ONLY" == "true" ]]; then
  if [[ ${#RELEASE_LIST[@]} -eq 0 ]]; then
    echo "No releases found"
    exit 0
  fi

  echo "Available releases:"
  for REL in "${RELEASE_LIST[@]}"; do
    MARK=""
    if [[ "$REL" == "$CURRENT_TARGET" ]]; then
      MARK=" (current)"
    fi
    echo "- $(basename "$REL")$MARK"
  done
  exit 0
fi

TARGET_PATH=""
if [[ -n "$TARGET_VERSION" ]]; then
  CANDIDATE_1="$RELEASES_DIR/$TARGET_VERSION"
  CANDIDATE_2="$RELEASES_DIR/${TARGET_VERSION#v}"
  if [[ -d "$CANDIDATE_1" ]]; then
    TARGET_PATH="$CANDIDATE_1"
  elif [[ -d "$CANDIDATE_2" ]]; then
    TARGET_PATH="$CANDIDATE_2"
  else
    echo "Target release not found for version: $TARGET_VERSION"
    exit 1
  fi
else
  for REL in "${RELEASE_LIST[@]}"; do
    if [[ "$REL" != "$CURRENT_TARGET" ]]; then
      TARGET_PATH="$REL"
      break
    fi
  done
fi

if [[ -z "$TARGET_PATH" || ! -d "$TARGET_PATH" ]]; then
  echo "No rollback target found"
  exit 1
fi

if [[ -n "$CURRENT_TARGET" && "$TARGET_PATH" == "$CURRENT_TARGET" ]]; then
  echo "Target release is already active: $(basename "$TARGET_PATH")"
  exit 0
fi

PREVIOUS_TARGET="$CURRENT_TARGET"
echo "Switching current symlink to $(basename "$TARGET_PATH")..."
ln -sfn "$TARGET_PATH" "$BASE_DIR/current"

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
    echo "Health check failed after rollback switch"
    if [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
      echo "Restoring previous current target..."
      ln -sfn "$PREVIOUS_TARGET" "$BASE_DIR/current"
    fi
    exit 1
  fi
fi

echo "Rollback successful: current -> $(basename "$TARGET_PATH")"