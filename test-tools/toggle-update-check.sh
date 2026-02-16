#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CACHE_FILE="$ROOT_DIR/data/update-check-cache.json"
VERSION_FILE="$ROOT_DIR/version.json"

MODE="${1:-status}"
LATEST_VERSION="${2:-1.0.1}"
RELEASE_URL="${3:-https://github.com/r0b0tan/fourteenkilobytes-web-php/releases/latest}"
API_URL="${2:-http://localhost:8000/api/check-updates}"

function usage() {
  cat << EOF
Usage: ./toggle-update-check.sh [mode] [args]

Modes:
  on [latestVersion] [releaseUrl]
      Enable mock update cache with explicit version.

  on-auto [releaseUrl]
      Enable mock update cache with current patch+1 version.

  off
      Disable mock update cache (delete cache file).

  status
      Show current mock state and expected banner behavior.

  check [apiUrl]
      Call /api/check-updates and print response for quick verification.

Examples:
  ./toggle-update-check.sh on 1.0.1
  ./toggle-update-check.sh on-auto
  ./toggle-update-check.sh check http://localhost:8000/api/check-updates
  ./toggle-update-check.sh off
EOF
}

function read_current_version() {
  if [[ -f "$VERSION_FILE" ]]; then
    python3 - << 'PY' "$VERSION_FILE"
import json, sys
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(str(data.get('version', '0.0.0')))
except Exception:
    print('0.0.0')
PY
  else
    echo "0.0.0"
  fi
}

function calculate_next_patch_version() {
  local current
  current="$(read_current_version)"
  python3 - << 'PY' "$current"
import re
import sys

current = sys.argv[1].strip()
match = re.match(r'^(\d+)\.(\d+)\.(\d+)$', current)
if not match:
    print('1.0.1')
    raise SystemExit(0)
major, minor, patch = map(int, match.groups())
print(f"{major}.{minor}.{patch + 1}")
PY
}

function write_cache_file() {
  local timestamp
  timestamp="$(date +%s)"

  mkdir -p "$(dirname "$CACHE_FILE")"

  cat > "$CACHE_FILE" << EOF
{
  "timestamp": $timestamp,
  "latest": "$LATEST_VERSION",
  "releaseUrl": "$RELEASE_URL",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

function print_status() {
  local current
  current="$(read_current_version)"

  if [[ -f "$CACHE_FILE" ]]; then
    echo "Update mock: ON"
    echo "Cache file: $CACHE_FILE"
    echo "Current version (version.json): $current"
    python3 - << 'PY' "$CACHE_FILE" "$current"
import json, sys
cache_path = sys.argv[1]
current = sys.argv[2]
with open(cache_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
latest = str(data.get('latest', '0.0.0'))
print(f"Cached latest: {latest}")
print(f"Release URL: {data.get('releaseUrl', '')}")
def parse_version(v):
    try:
        return tuple(int(x) for x in str(v).split('.'))
    except Exception:
        return (0, 0, 0)
print(f"Update available (expected): {'yes' if parse_version(latest) > parse_version(current) else 'no'}")
PY
  else
    echo "Update mock: OFF"
    echo "Cache file not found: $CACHE_FILE"
  fi
}

function check_api_response() {
  local url="$1"
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl not found"
    exit 1
  fi

  local response
  if ! response="$(curl -fsSL "$url")"; then
    echo "Failed to reach API: $url"
    exit 1
  fi

  python3 - << 'PY' "$response"
import json
import sys

raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    print(raw)
    raise SystemExit(0)

print(json.dumps(data, indent=2, ensure_ascii=False))
flag = data.get('updateAvailable')
print(f"\nBanner expected: {'yes' if flag else 'no'}")
PY
}

case "$MODE" in
  on)
    write_cache_file
    echo "Enabled update-check mock."
    print_status
    ;;
  on-auto)
    LATEST_VERSION="$(calculate_next_patch_version)"
    if [[ -n "${2:-}" ]]; then
      RELEASE_URL="$2"
    fi
    write_cache_file
    echo "Enabled update-check mock (auto version: $LATEST_VERSION)."
    print_status
    ;;
  off)
    rm -f "$CACHE_FILE"
    echo "Disabled update-check mock (cache file removed)."
    print_status
    ;;
  status)
    print_status
    ;;
  check)
    check_api_response "$API_URL"
    ;;
  *)
    usage
    exit 1
    ;;
esac