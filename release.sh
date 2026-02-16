#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_JSON="$SCRIPT_DIR/version.json"
PACKAGE_JSON="$SCRIPT_DIR/package.json"

VERSION=""
MESSAGE=""
RUN_TESTS=true
RUN_BUILD=true
CREATE_GH_RELEASE=true
RUN_REMOTE_UPGRADE=false
UPGRADE_HOST=""
UPGRADE_BASE_DIR="/var/www/fourteenkilobytes"
UPGRADE_SCRIPT_DIR=""
UPGRADE_HEALTH_URL="http://127.0.0.1/api/health"
ALLOW_DIRTY=false

function usage() {
  cat << EOF
Usage: ./release.sh --version X.Y.Z [options]

Required:
  --version X.Y.Z              Release version (without leading v)

Optional:
  --message TEXT               Commit message body suffix
  --skip-tests                 Do not run npm test
  --skip-build                 Do not run ./build.sh
  --no-gh-release              Do not create GitHub release
  --allow-dirty                Allow uncommitted changes

Remote upgrade (optional):
  --upgrade-host USER@HOST     Trigger remote upgrade after push
  --upgrade-base-dir PATH      Remote base dir for upgrade.sh (default: $UPGRADE_BASE_DIR)
  --upgrade-script-dir PATH    Remote directory containing upgrade.sh (default: <base-dir>/current)
  --upgrade-health-url URL     Health URL passed to remote upgrade.sh

Examples:
  ./release.sh --version 1.0.0
  ./release.sh --version 1.0.1 --upgrade-host user@example.com --upgrade-base-dir /var/www/fourteenkilobytes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --message)
      MESSAGE="$2"
      shift 2
      ;;
    --skip-tests)
      RUN_TESTS=false
      shift
      ;;
    --skip-build)
      RUN_BUILD=false
      shift
      ;;
    --no-gh-release)
      CREATE_GH_RELEASE=false
      shift
      ;;
    --allow-dirty)
      ALLOW_DIRTY=true
      shift
      ;;
    --upgrade-host)
      RUN_REMOTE_UPGRADE=true
      UPGRADE_HOST="$2"
      shift 2
      ;;
    --upgrade-base-dir)
      UPGRADE_BASE_DIR="$2"
      shift 2
      ;;
    --upgrade-script-dir)
      UPGRADE_SCRIPT_DIR="$2"
      shift 2
      ;;
    --upgrade-health-url)
      UPGRADE_HEALTH_URL="$2"
      shift 2
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
  echo "--version is required"
  usage
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version '$VERSION' (expected X.Y.Z)"
  exit 1
fi

TAG="v$VERSION"
TODAY="$(date +%F)"

if [[ "$ALLOW_DIRTY" != "true" ]]; then
  if [[ -n "$(git -C "$SCRIPT_DIR" status --porcelain)" ]]; then
    echo "Working tree is dirty. Commit/stash changes or use --allow-dirty."
    exit 1
  fi
fi

if git -C "$SCRIPT_DIR" rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Git tag already exists: $TAG"
  exit 1
fi

if [[ "$RUN_TESTS" == "true" ]]; then
  echo "Running tests..."
  (cd "$SCRIPT_DIR" && npm test)
fi

if [[ "$RUN_BUILD" == "true" ]]; then
  echo "Building dist..."
  (cd "$SCRIPT_DIR" && ./build.sh)
fi

echo "Updating version files..."
python3 - "$VERSION_JSON" "$PACKAGE_JSON" "$VERSION" "$TODAY" << 'PY'
import json
import sys

version_json, package_json, version, today = sys.argv[1:5]

with open(version_json, 'r', encoding='utf-8') as f:
    version_data = json.load(f)
version_data['version'] = version
version_data['releaseDate'] = today
with open(version_json, 'w', encoding='utf-8') as f:
    json.dump(version_data, f, ensure_ascii=False, indent=4)
    f.write('\n')

with open(package_json, 'r', encoding='utf-8') as f:
    package_data = json.load(f)
package_data['version'] = version
with open(package_json, 'w', encoding='utf-8') as f:
    json.dump(package_data, f, ensure_ascii=False, indent=2)
    f.write('\n')
PY

echo "Committing release version..."
git -C "$SCRIPT_DIR" add "$VERSION_JSON" "$PACKAGE_JSON"

COMMIT_MSG="release: $TAG"
if [[ -n "$MESSAGE" ]]; then
  COMMIT_MSG="$COMMIT_MSG - $MESSAGE"
fi

git -C "$SCRIPT_DIR" commit -m "$COMMIT_MSG"
git -C "$SCRIPT_DIR" tag "$TAG"

echo "Pushing commit and tag..."
git -C "$SCRIPT_DIR" push
git -C "$SCRIPT_DIR" push origin "$TAG"

if [[ "$CREATE_GH_RELEASE" == "true" ]]; then
  if command -v gh >/dev/null 2>&1; then
    echo "Creating GitHub release $TAG..."
    (cd "$SCRIPT_DIR" && gh release create "$TAG" --generate-notes)
  else
    echo "gh CLI not found, skipping GitHub release creation."
  fi
fi

if [[ "$RUN_REMOTE_UPGRADE" == "true" ]]; then
  if [[ -z "$UPGRADE_HOST" ]]; then
    echo "--upgrade-host is required when remote upgrade is enabled"
    exit 1
  fi
  if [[ -z "$UPGRADE_SCRIPT_DIR" ]]; then
    UPGRADE_SCRIPT_DIR="$UPGRADE_BASE_DIR/current"
  fi

  echo "Triggering remote upgrade on $UPGRADE_HOST..."
  ssh "$UPGRADE_HOST" "cd '$UPGRADE_SCRIPT_DIR' && ./upgrade.sh --base-dir '$UPGRADE_BASE_DIR' --version '$TAG' --health-url '$UPGRADE_HEALTH_URL'"
fi

echo "Release flow complete: $TAG"