#!/bin/bash
# Generate test posts for testing bloglist pagination
# Usage: ./generate-test-posts.sh [start] [end]
# Example: ./generate-test-posts.sh 1 100

START=${1:-1}
END=${2:-100}
DATA_DIR="../data"

echo "Generating test posts from $START to $END..."

for i in $(seq $START $END); do
  slug="test-post-$i"
  title="Test Post Nummer $i"
  
  # Calculate date (spread across 2025 and 2026)
  if [ $i -le 50 ]; then
    year="2025"
    month=$(printf "%02d" $(( (i - 1) / 10 + 1 )))
    day=$(printf "%02d" $(( (i - 1) % 10 + 1 )))
  else
    year="2026"
    month=$(printf "%02d" $(( (i - 51) / 10 + 1 )))
    day=$(printf "%02d" $(( (i - 51) % 10 + 1 )))
  fi
  date="${year}-${month}-${day}T12:00:00+00:00"
  
  # Create HTML file
  cat > "${DATA_DIR}/posts/${slug}.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body>
<h1>${title}</h1>
<p>Dies ist ein Testpost für die Bloglist-Pagination. Post Nummer $i von $END.</p>
<p>Dieser Post wurde automatisch generiert um die Pagination der Archiv-Seite zu testen.</p>
</body>
</html>
EOF

  # Create source JSON file
  cat > "${DATA_DIR}/sources/${slug}.json" << EOF
{
  "slug": "${slug}",
  "title": "${title}",
  "content": [
    {"type": "heading", "level": 1, "children": [{"type": "text", "text": "${title}"}]},
    {"type": "paragraph", "children": [{"type": "text", "text": "Dies ist ein Testpost für die Bloglist-Pagination. Post Nummer $i von $END."}]},
    {"type": "paragraph", "children": [{"type": "text", "text": "Dieser Post wurde automatisch generiert um die Pagination der Archiv-Seite zu testen."}]}
  ],
  "navigation": null,
  "footer": null,
  "css": null,
  "meta": null,
  "icons": [],
  "allowPagination": false,
  "pageType": "post"
}
EOF

  if [ $((i % 10)) -eq 0 ]; then
    echo "  Created $i posts..."
  fi
done

echo "✅ Created $((END - START + 1)) test posts (test-post-${START} to test-post-${END})"
echo ""
echo "Next step: Run update-manifest.py to register them in manifest.json and page-types.json"
