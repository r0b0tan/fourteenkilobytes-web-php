<?php

declare(strict_types=1);

require_once __DIR__ . '/../ApiTestCase.php';

class ContentStorageTest extends ApiTestCase
{
    // -------------------------------------------------------------------------
    // loadSourceData
    // -------------------------------------------------------------------------

    public function testLoadSourceDataReturnsDataFromFile(): void
    {
        saveSourceData('my-post', ['title' => 'Hello', 'blocks' => []]);
        $data = loadSourceData('my-post');

        $this->assertNotNull($data);
        $this->assertSame('Hello', $data['title']);
    }

    public function testLoadSourceDataReturnsNullWhenNoFileAndNotInManifest(): void
    {
        $this->assertNull(loadSourceData('nonexistent-post'));
    }

    public function testLoadSourceDataFallsBackToEmbeddedManifestSourceData(): void
    {
        // Legacy posts stored sourceData inside the manifest entry
        saveManifest([
            'version' => 1,
            'entries' => [
                [
                    'slug'       => 'legacy-post',
                    'status'     => 'published',
                    'title'      => 'Legacy',
                    'publishedAt' => '2024-01-01T00:00:00+00:00',
                    'sourceData' => ['blocks' => [['type' => 'paragraph', 'text' => 'hello']]],
                ],
            ],
        ]);

        $data = loadSourceData('legacy-post');
        $this->assertNotNull($data);
        $this->assertSame('paragraph', $data['blocks'][0]['type']);
    }

    public function testLoadSourceDataReturnsNullForCorruptJsonFile(): void
    {
        $path = SOURCES_DIR . '/corrupt-post.json';
        file_put_contents($path, 'this is not { valid json');

        $data = loadSourceData('corrupt-post');
        $this->assertNull($data);
    }

    // -------------------------------------------------------------------------
    // loadPageTypes
    // -------------------------------------------------------------------------

    public function testLoadPageTypesReturnsDefaultWhenNoFile(): void
    {
        $types = loadPageTypes();
        $this->assertSame(1, $types['version']);
        $this->assertSame([], $types['types']);
    }

    public function testLoadPageTypesReturnsDefaultForInvalidJson(): void
    {
        file_put_contents(PAGE_TYPES_FILE, 'not-json{{');
        $types = loadPageTypes();
        $this->assertSame(1, $types['version']);
        $this->assertSame([], $types['types']);
    }

    // -------------------------------------------------------------------------
    // savePageTypes / loadPageTypes round-trip
    // -------------------------------------------------------------------------

    public function testSaveAndLoadPageTypesRoundtrip(): void
    {
        $data = ['version' => 1, 'types' => ['my-post' => 'page', 'blog-entry' => 'post']];
        savePageTypes($data);

        $loaded = loadPageTypes();
        $this->assertSame('page', $loaded['types']['my-post']);
        $this->assertSame('post', $loaded['types']['blog-entry']);
    }
}
