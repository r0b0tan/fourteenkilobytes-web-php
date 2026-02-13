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
cp "$SCRIPT_DIR/version.json" "$DIST_DIR/"
cp "$SCRIPT_DIR/fix-permissions.sh" "$DIST_DIR/"

# Copy directories
cp -r "$SCRIPT_DIR/api" "$DIST_DIR/"
cp -r "$SCRIPT_DIR/public" "$DIST_DIR/"
cp -r "$SCRIPT_DIR/setup" "$DIST_DIR/"

# Remove backup files from setup if they exist
rm -f "$DIST_DIR/setup/index.php.backup"

# Copy data directory structure (without user data)
mkdir -p "$DIST_DIR/data/posts"
mkdir -p "$DIST_DIR/data/sources"
cp -r "$SCRIPT_DIR/data/seeds" "$DIST_DIR/data/"

# Optional static asset minification (enabled by default)
if [ "${MINIFY_ASSETS:-1}" = "1" ]; then
	echo "Minifying HTML/CSS in dist..."
	while IFS= read -r -d '' file; do
		php -r '
			$file = $argv[1];
			$content = @file_get_contents($file);
			if ($content === false) {
				exit(0);
			}

			$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

			if ($ext === "css") {
				$min = preg_replace("~/\\*[\\s\\S]*?\\*/~", "", $content) ?? $content;
				$min = str_replace(["\r", "\n", "\t"], "", $min);
				$min = preg_replace("/\\s{2,}/", " ", $min) ?? $min;
				$min = preg_replace("/\\s*([{}:;,>+~])\\s*/", "$1", $min) ?? $min;
				$min = preg_replace("/;}/", "}", $min) ?? $min;
				$content = trim($min);
			} elseif ($ext === "html") {
				$min = preg_replace("/<!--(?!\\[if)[\\s\\S]*?-->/", "", $content) ?? $content;
				$min = preg_replace("/>\\s+</", "><", $min) ?? $min;
				$content = trim($min);
			}

			file_put_contents($file, $content, LOCK_EX);
		' "$file"
	done < <(find "$DIST_DIR/public" "$DIST_DIR/setup" -type f \( -name "*.html" -o -name "*.css" \) -print0 2>/dev/null)
fi

echo "Build complete!"
echo ""
echo "Contents:"
find "$DIST_DIR" -type f | wc -l
echo "files copied to dist/"
