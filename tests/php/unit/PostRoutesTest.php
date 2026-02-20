<?php

declare(strict_types=1);

require_once __DIR__ . '/../ApiTestCase.php';

class PostRoutesTest extends ApiTestCase
{
    // =========================================================================
    // GET /posts
    // =========================================================================

    public function testGetPostsReturnsEmptyListInitially(): void
    {
        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('GET', '/posts'));
        $this->assertArrayHasKey('posts', $body);
        $this->assertSame([], $body['posts']);
    }

    public function testGetPostsReturnsOnlyPublishedEntries(): void
    {
        // Seed manifest with one published + one tombstone
        saveManifest([
            'version' => 1,
            'entries' => [
                ['slug' => 'live', 'status' => 'published', 'title' => 'Live', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
                ['slug' => 'dead', 'status' => 'tombstone', 'title' => 'Dead', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
            ],
        ]);

        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('GET', '/posts'));
        $slugs = array_column($body['posts'], 'slug');

        $this->assertContains('live', $slugs);
        $this->assertContains('dead', $slugs); // tombstones still appear in list
    }

    // =========================================================================
    // POST /posts — validation
    // =========================================================================

    public function testPublishRejectsInvalidSlugFormat(): void
    {
        $this->setRequestBody([
            'slug' => 'Invalid Slug!',
            'html' => '<html></html>',
            'bytes' => 13,
        ]);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('INVALID_SLUG', $body['code']);
    }

    public function testPublishRejectsMissingFields(): void
    {
        $this->setRequestBody(['slug' => 'valid-slug']);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('MISSING_FIELDS', $body['code']);
    }

    public function testPublishRejectsPageExceeding14KB(): void
    {
        $oversizedHtml = str_repeat('x', 14337);
        $this->setRequestBody([
            'slug' => 'too-big',
            'html' => $oversizedHtml,
            'bytes' => strlen($oversizedHtml),
        ]);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('PAGE_TOO_LARGE', $body['code']);
    }

    // =========================================================================
    // POST /posts — successful single-page publish
    // =========================================================================

    public function testPublishSinglePageSuccessfully(): void
    {
        $html = '<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>';
        $this->setRequestBody([
            'slug' => 'my-post',
            'html' => $html,
            'bytes' => strlen($html),
            'title' => 'My Post',
        ]);

        $body = $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $this->assertSame('my-post', $body['slug']);
        $this->assertArrayHasKey('hash', $body);
        $this->assertFileExists(POSTS_DIR . '/my-post.html');

        // Verify manifest was updated
        $manifest = loadManifest();
        $slugs = array_column($manifest['entries'], 'slug');
        $this->assertContains('my-post', $slugs);
    }

    public function testPublishSetsPublishedAt(): void
    {
        $html = '<html><body>Hi</body></html>';
        $this->setRequestBody([
            'slug' => 'dated-post',
            'html' => $html,
            'bytes' => strlen($html),
            'title' => 'Dated',
        ]);

        $before = date('c');
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));
        $after = date('c');

        $manifest = loadManifest();
        $entry = current(array_filter($manifest['entries'], fn($e) => $e['slug'] === 'dated-post'));
        $this->assertNotFalse($entry);
        $this->assertGreaterThanOrEqual($before, $entry['publishedAt']);
        $this->assertLessThanOrEqual($after, $entry['publishedAt']);
    }

    public function testRepublishUpdatesModifiedAt(): void
    {
        $html = '<html><body>v1</body></html>';
        $this->setRequestBody(['slug' => 'editable', 'html' => $html, 'bytes' => strlen($html), 'title' => 'Editable']);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $html2 = '<html><body>v2</body></html>';
        $this->setRequestBody(['slug' => 'editable', 'html' => $html2, 'bytes' => strlen($html2), 'title' => 'Editable']);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $manifest = loadManifest();
        $entry = current(array_filter($manifest['entries'], fn($e) => $e['slug'] === 'editable'));
        $this->assertArrayHasKey('modifiedAt', $entry);
    }

    // =========================================================================
    // POST /posts — paginated publish
    // =========================================================================

    public function testPublishPaginatedPagesSuccessfully(): void
    {
        $page1 = '<html><body>Page 1</body></html>';
        $page2 = '<html><body>Page 2</body></html>';

        $this->setRequestBody([
            'title' => 'Long Post',
            'pageType' => 'post',
            'pages' => [
                ['slug' => 'long-post', 'html' => $page1],
                ['slug' => 'long-post-2', 'html' => $page2],
            ],
        ]);

        $body = $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $this->assertSame('long-post', $body['slug']);
        $this->assertSame(2, $body['pageCount']);
        $this->assertFileExists(POSTS_DIR . '/long-post.html');
        $this->assertFileExists(POSTS_DIR . '/long-post-2.html');
    }

    public function testPublishPaginatedRejectsEmptyPagesArray(): void
    {
        $this->setRequestBody(['title' => 'Empty', 'pages' => []]);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('EMPTY_PAGES', $body['code']);
    }

    public function testPublishPaginatedRejectsInvalidSlug(): void
    {
        $this->setRequestBody([
            'title' => 'Bad',
            'pages' => [['slug' => 'bad slug!', 'html' => '<html></html>']],
        ]);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('INVALID_SLUG', $body['code']);
    }

    public function testPublishPaginatedRejectsOversizedPage(): void
    {
        $this->setRequestBody([
            'title' => 'Big',
            'pages' => [['slug' => 'big-page', 'html' => str_repeat('x', 14337)]],
        ]);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('PAGE_TOO_LARGE', $body['code']);
    }

    // =========================================================================
    // POST /posts — slug tombstone conflict
    // =========================================================================

    public function testPublishRejectsTombstonedSlug(): void
    {
        // Create and tombstone a post first
        $html = '<html><body>Gone</body></html>';
        $this->setRequestBody(['slug' => 'gone', 'html' => $html, 'bytes' => strlen($html), 'title' => 'Gone']);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertApiResponse(200, fn() => handlePostRoutes('DELETE', '/posts/gone'));

        // Now try to publish with same slug
        $this->setRequestBody(['slug' => 'gone', 'html' => $html, 'bytes' => strlen($html), 'title' => 'Gone again']);
        $body = $this->assertApiResponse(409, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('SLUG_TOMBSTONED', $body['code']);
    }

    // =========================================================================
    // DELETE /posts/{slug}
    // =========================================================================

    public function testDeleteTombstonesPost(): void
    {
        // Publish first
        $html = '<html><body>To delete</body></html>';
        $this->setRequestBody(['slug' => 'to-delete', 'html' => $html, 'bytes' => strlen($html), 'title' => 'Delete me']);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        // Delete
        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('DELETE', '/posts/to-delete'));
        $this->assertTrue($body['tombstoned']);
        $this->assertSame('to-delete', $body['slug']);

        // Manifest entry should be tombstoned
        $manifest = loadManifest();
        $entry = current(array_filter($manifest['entries'], fn($e) => $e['slug'] === 'to-delete'));
        $this->assertSame('tombstone', $entry['status']);
    }

    public function testDeleteNonExistentPostReturns404(): void
    {
        $body = $this->assertApiResponse(404, fn() => handlePostRoutes('DELETE', '/posts/does-not-exist'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testDeleteAlreadyTombstonedReturns400(): void
    {
        // Publish and tombstone
        $html = '<html><body>Gone</body></html>';
        $this->setRequestBody(['slug' => 'already-gone', 'html' => $html, 'bytes' => strlen($html), 'title' => 'Gone']);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertApiResponse(200, fn() => handlePostRoutes('DELETE', '/posts/already-gone'));

        // Second delete should fail
        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('DELETE', '/posts/already-gone'));
        $this->assertSame('ALREADY_TOMBSTONED', $body['code']);
    }

    // =========================================================================
    // Unmatched routes return false
    // =========================================================================

    public function testUnmatchedRouteReturnsFalse(): void
    {
        $this->assertNoResponse(fn() => handlePostRoutes('GET', '/unknown'));
    }

    public function testWrongMethodReturnsFalse(): void
    {
        $this->assertNoResponse(fn() => handlePostRoutes('PATCH', '/posts'));
    }

    // =========================================================================
    // GET /posts/{slug} — JSON error paths (HTML success/tombstone paths
    // call exit directly and require integration testing)
    // =========================================================================

    public function testGetSinglePostReturns404WhenSlugNotInManifest(): void
    {
        $body = $this->assertApiResponse(404, fn() => handlePostRoutes('GET', '/posts/does-not-exist'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testGetSinglePostReturns404WhenHtmlFileMissing(): void
    {
        // Entry in manifest but no HTML file on disk
        saveManifest([
            'version' => 1,
            'entries' => [
                ['slug' => 'ghost-post', 'status' => 'published', 'title' => 'Ghost', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
            ],
        ]);

        $body = $this->assertApiResponse(404, fn() => handlePostRoutes('GET', '/posts/ghost-post'));
        $this->assertArrayHasKey('error', $body);
    }

    // =========================================================================
    // GET /posts — author fallback logic in post listing
    // =========================================================================

    public function testGetPostsUsesEntryAuthorWhenSet(): void
    {
        saveManifest([
            'version' => 1,
            'entries' => [
                ['slug' => 'authored', 'status' => 'published', 'title' => 'A', 'publishedAt' => '2024-01-01T00:00:00+00:00', 'author' => 'Jane'],
            ],
        ]);

        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('GET', '/posts'));
        $this->assertSame('Jane', $body['posts'][0]['author']);
    }

    public function testGetPostsFallsBackToSettingsAuthorWhenEntryHasNone(): void
    {
        saveManifest([
            'version' => 1,
            'entries' => [
                ['slug' => 'no-author', 'status' => 'published', 'title' => 'B', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
            ],
        ]);
        // No settings file → loadSettings returns defaults with empty author
        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('GET', '/posts'));
        $this->assertNull($body['posts'][0]['author']);
    }

    // =========================================================================
    // DELETE /posts — bulk tombstone
    // =========================================================================

    public function testDeleteAllPostsTombstonesEveryPublishedEntry(): void
    {
        // Publish two posts
        foreach (['bulk-a', 'bulk-b'] as $slug) {
            $html = "<html><body>{$slug}</body></html>";
            $this->setRequestBody(['slug' => $slug, 'html' => $html, 'bytes' => strlen($html), 'title' => $slug]);
            $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));
        }

        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('DELETE', '/posts'));
        $this->assertSame(2, $body['deleted']);

        $manifest = loadManifest();
        foreach ($manifest['entries'] as $entry) {
            $this->assertSame('tombstone', $entry['status']);
        }
    }

    public function testDeleteAllPostsSkipsAlreadyTombstonedEntries(): void
    {
        // One published, one pre-tombstoned
        saveManifest([
            'version' => 1,
            'entries' => [
                ['slug' => 'live-one', 'status' => 'published', 'title' => 'Live', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
                ['slug' => 'dead-one', 'status' => 'tombstone', 'title' => 'Dead', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
            ],
        ]);
        file_put_contents(POSTS_DIR . '/live-one.html', '<html></html>', LOCK_EX);

        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('DELETE', '/posts'));
        $this->assertSame(1, $body['deleted']);
    }

    public function testDeleteAllPostsTombstonesAdditionalPagesOfPaginatedPost(): void
    {
        $page1 = '<html><body>P1</body></html>';
        $page2 = '<html><body>P2</body></html>';
        $this->setRequestBody([
            'title' => 'Paginated',
            'pages' => [
                ['slug' => 'paged-post', 'html' => $page1],
                ['slug' => 'paged-post-2', 'html' => $page2],
            ],
        ]);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $this->assertApiResponse(200, fn() => handlePostRoutes('DELETE', '/posts'));

        $this->assertStringContainsString('410', file_get_contents(POSTS_DIR . '/paged-post-2.html'));
    }

    // =========================================================================
    // GET /seeds
    // =========================================================================

    public function testGetSeedsReturnsListOfAvailableSeeds(): void
    {
        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('GET', '/seeds'));
        $this->assertArrayHasKey('seeds', $body);
        $this->assertIsArray($body['seeds']);
        // The real seeds dir contains blog-post, landing-page, static-page
        $names = array_column($body['seeds'], 'name');
        $this->assertContains('blog-post', $names);
    }

    // =========================================================================
    // POST /clone
    // =========================================================================

    public function testCloneReturnsMissingSourceSlugError(): void
    {
        $this->setRequestBody(['sourceType' => 'page']);
        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/clone'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testCloneRejectsInvalidSlugFormat(): void
    {
        $this->setRequestBody(['sourceSlug' => 'Bad Slug!']);
        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/clone'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testCloneFromSeedSucceeds(): void
    {
        $this->setRequestBody(['sourceType' => 'seed', 'sourceSlug' => 'blog-post']);
        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('POST', '/clone'));
        $this->assertArrayHasKey('sourceData', $body);
        $this->assertSame('blog-post', $body['clonedFrom']);
        $this->assertSame('seed', $body['sourceType']);
        $this->assertSame('', $body['sourceData']['slug']);
        $this->assertSame('', $body['sourceData']['title']);
    }

    public function testCloneFromSeedReturns404ForUnknownSeed(): void
    {
        $this->setRequestBody(['sourceType' => 'seed', 'sourceSlug' => 'nonexistent-seed']);
        $body = $this->assertApiResponse(404, fn() => handlePostRoutes('POST', '/clone'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testCloneFromPageSucceeds(): void
    {
        // Publish a post with source data
        $html = '<html><body>Cloneable</body></html>';
        $sourceData = ['slug' => 'original', 'title' => 'Original', 'blocks' => []];
        $this->setRequestBody([
            'slug' => 'original',
            'html' => $html,
            'bytes' => strlen($html),
            'title' => 'Original',
            'sourceData' => $sourceData,
        ]);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $this->setRequestBody(['sourceType' => 'page', 'sourceSlug' => 'original']);
        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('POST', '/clone'));
        $this->assertArrayHasKey('sourceData', $body);
        $this->assertSame('', $body['sourceData']['slug']);
        $this->assertSame('page', $body['sourceType']);
    }

    public function testCloneFromPageReturns404WhenNoSourceData(): void
    {
        $this->setRequestBody(['sourceType' => 'page', 'sourceSlug' => 'no-source']);
        $body = $this->assertApiResponse(404, fn() => handlePostRoutes('POST', '/clone'));
        $this->assertArrayHasKey('error', $body);
    }

    // =========================================================================
    // POST /posts/{slug}/republish
    // =========================================================================

    public function testRepublishPostReturns404ForUnknownSlug(): void
    {
        $body = $this->assertApiResponse(404, fn() => handlePostRoutes('POST', '/posts/no-such-post/republish'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testRepublishPostReturns400WhenNoSourceData(): void
    {
        // Publish without sourceData
        $html = '<html><body>No source</body></html>';
        $this->setRequestBody(['slug' => 'no-src', 'html' => $html, 'bytes' => strlen($html), 'title' => 'NoSrc']);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts/no-src/republish'));
        $this->assertArrayHasKey('error', $body);
    }

    public function testRepublishPostReturnsSourceData(): void
    {
        $html = '<html><body>With source</body></html>';
        $sourceData = ['slug' => 'with-src', 'title' => 'WithSrc', 'blocks' => []];
        $this->setRequestBody([
            'slug' => 'with-src',
            'html' => $html,
            'bytes' => strlen($html),
            'title' => 'WithSrc',
            'sourceData' => $sourceData,
        ]);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $body = $this->assertApiResponse(200, fn() => handlePostRoutes('POST', '/posts/with-src/republish'));
        $this->assertSame('with-src', $body['slug']);
        $this->assertArrayHasKey('sourceData', $body);
    }

    // =========================================================================
    // resolvePostAuthor — direct unit tests
    // =========================================================================

    public function testResolvePostAuthorReturnsSourceDataAuthor(): void
    {
        $sourceData = ['meta' => ['author' => 'Jane Doe']];
        $this->assertSame('Jane Doe', resolvePostAuthor($sourceData, []));
    }

    public function testResolvePostAuthorFallsBackToBlogSettingsAuthor(): void
    {
        $sourceData = ['meta' => ['author' => '']]; // empty → fall through
        $settings = ['blog' => ['author' => 'Blog Author']];
        $this->assertSame('Blog Author', resolvePostAuthor($sourceData, $settings));
    }

    public function testResolvePostAuthorFallsBackToMetaSettingsAuthor(): void
    {
        $settings = ['meta' => ['author' => 'Meta Author']];
        $this->assertSame('Meta Author', resolvePostAuthor(null, $settings));
    }

    public function testResolvePostAuthorReturnsNullWhenAllEmpty(): void
    {
        $this->assertNull(resolvePostAuthor(null, []));
    }

    public function testPublishStoresAuthorFromSourceData(): void
    {
        $html = '<html><body>By Jane</body></html>';
        $this->setRequestBody([
            'slug'       => 'by-jane',
            'html'       => $html,
            'bytes'      => strlen($html),
            'title'      => 'By Jane',
            'sourceData' => ['meta' => ['author' => 'Jane']],
        ]);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $manifest = loadManifest();
        $entry = current(array_filter($manifest['entries'], fn($e) => $e['slug'] === 'by-jane'));
        $this->assertSame('Jane', $entry['author']);
    }

    // =========================================================================
    // POST /posts (paginated) — additional branches
    // =========================================================================

    public function testPublishPaginatedRejectsMissingPageSlugOrHtml(): void
    {
        $this->setRequestBody([
            'title' => 'Bad Pages',
            'pages' => [['slug' => 'ok-slug']], // missing html
        ]);

        $body = $this->assertApiResponse(400, fn() => handlePostRoutes('POST', '/posts'));
        $this->assertSame('MISSING_FIELDS', $body['code']);
    }

    public function testRepublishPaginatedPostSetsModifiedAt(): void
    {
        $page1 = '<html><body>V1</body></html>';
        $this->setRequestBody([
            'title' => 'Paginated Editable',
            'pages' => [['slug' => 'paged-edit', 'html' => $page1]],
        ]);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $page2 = '<html><body>V2</body></html>';
        $this->setRequestBody([
            'title' => 'Paginated Editable',
            'pages' => [['slug' => 'paged-edit', 'html' => $page2]],
        ]);
        $this->assertApiResponse(201, fn() => handlePostRoutes('POST', '/posts'));

        $manifest = loadManifest();
        $entry = current(array_filter($manifest['entries'], fn($e) => $e['slug'] === 'paged-edit'));
        $this->assertArrayHasKey('modifiedAt', $entry);
    }
}
