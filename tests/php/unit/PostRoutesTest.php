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
}
