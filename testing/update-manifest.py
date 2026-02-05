#!/usr/bin/env python3
"""
Update manifest.json and page-types.json with test posts
Usage: python3 update-manifest.py [start] [end]
Example: python3 update-manifest.py 1 100
"""

import json
import sys

def update_manifest(start=1, end=100):
    data_dir = '../data'
    
    # Load manifest.json
    with open(f'{data_dir}/manifest.json', 'r') as f:
        manifest = json.load(f)
    
    # Load page-types.json
    with open(f'{data_dir}/page-types.json', 'r') as f:
        page_types = json.load(f)
    
    added = 0
    
    # Create entries for test posts
    for i in range(start, end + 1):
        slug = f'test-post-{i}'
        
        # Calculate date (spread across 2025 and 2026)
        if i <= 50:
            year = 2025
            month = ((i - 1) // 10) + 1
            day = ((i - 1) % 10) + 1
        else:
            year = 2026
            month = ((i - 51) // 10) + 1
            day = ((i - 51) % 10) + 1
        
        published_at = f'{year}-{month:02d}-{day:02d}T12:00:00+00:00'
        
        # Check if entry already exists
        exists = any(e['slug'] == slug for e in manifest['entries'])
        if not exists:
            manifest['entries'].append({
                'slug': slug,
                'status': 'published',
                'hash': [],
                'title': f'Test Post Nummer {i}',
                'publishedAt': published_at
            })
            added += 1
        
        # Add to page-types
        if slug not in page_types['types']:
            page_types['types'][slug] = 'post'
    
    # Save manifest.json
    with open(f'{data_dir}/manifest.json', 'w') as f:
        json.dump(manifest, f, indent=4, ensure_ascii=False)
    
    # Save page-types.json
    with open(f'{data_dir}/page-types.json', 'w') as f:
        json.dump(page_types, f, indent=4, ensure_ascii=False)
    
    print(f'✅ Added {added} new entries to manifest')
    print(f'   Total entries: {len(manifest["entries"])}')
    print(f'   Total page types: {len(page_types["types"])}')

if __name__ == '__main__':
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    
    print(f'Updating manifest for test-post-{start} to test-post-{end}...')
    update_manifest(start, end)
