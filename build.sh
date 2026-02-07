#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "Building to $DIST_DIR..."

# Clean dist directory
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy PHP files
cp "$SCRIPT_DIR/index.php" "$DIST_DIR/"
cp "$SCRIPT_DIR/feed.php" "$DIST_DIR/"
cp "$SCRIPT_DIR/router.php" "$DIST_DIR/"
cp "$SCRIPT_DIR/.htaccess" "$DIST_DIR/"
cp "$SCRIPT_DIR/nginx.conf.example" "$DIST_DIR/"

# Copy directories
cp -r "$SCRIPT_DIR/api" "$DIST_DIR/"
cp -r "$SCRIPT_DIR/public" "$DIST_DIR/"

# Copy data directory structure (without user data)
mkdir -p "$DIST_DIR/data/posts"
mkdir -p "$DIST_DIR/data/sources"
cp -r "$SCRIPT_DIR/data/seeds" "$DIST_DIR/data/"

echo "Build complete!"
echo ""
echo "Contents:"
find "$DIST_DIR" -type f | wc -l
echo "files copied to dist/"
