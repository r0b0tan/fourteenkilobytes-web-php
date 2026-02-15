# Test Tools

This directory contains helper scripts to generate large amounts of test content for manual QA.

These tools are intended for UI and performance checks (e.g. pagination, list rendering, large datasets), not for automated Vitest unit tests.

## Generate Test Posts

### Usage

```bash
# Generate 100 test posts
cd test-tools
./generate-test-posts.sh 1 100

# Then update manifest
python3 update-manifest.py 1 100
```

### Or use the combined command:

```bash
cd test-tools
./generate-test-posts.sh 1 100 && python3 update-manifest.py 1 100
```

## Scripts

### `generate-test-posts.sh`
Creates test post HTML and JSON source files in `data/posts/` and `data/sources/`.

**Parameters:**
- `start`: First post number (default: 1)
- `end`: Last post number (default: 100)

**Output:**
- `data/posts/test-post-{n}.html`
- `data/sources/test-post-{n}.json`

### `update-manifest.py`
Updates `manifest.json` and `page-types.json` to register the test posts.

**Parameters:**
- `start`: First post number (default: 1)  
- `end`: Last post number (default: 100)

## Examples

Generate only 20 test posts:
```bash
./generate-test-posts.sh 1 20
python3 update-manifest.py 1 20
```

Add more posts (21-50):
```bash
./generate-test-posts.sh 21 50
python3 update-manifest.py 21 50
```

## QA Scenarios

- **Test Limit**: Generate 30 posts to test limit of 20 on homepage
- **Test Pagination**: Generate 100+ posts to test archive pagination
- **Test Performance**: Generate 500+ posts to test large bloglists

## Relation to Vitest

- Automated unit/integration tests live in [tests](../tests) and run with `vitest`.
- This folder only prepares persistent content files in `data/` for manual QA-style verification.

## Notes

- Test posts are dated across 2025 and 2026
- Posts 1-50 → 2025
- Posts 51+ → 2026
- Each post has a simple two-paragraph structure
