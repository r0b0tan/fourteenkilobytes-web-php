<?php

declare(strict_types=1);

require_once __DIR__ . '/../ApiTestCase.php';

class ManifestStorageTest extends ApiTestCase
{
    // -------------------------------------------------------------------------
    // loadManifest
    // -------------------------------------------------------------------------

    public function testLoadManifestReturnsEmptyStructureWhenFileAbsent(): void
    {
        $manifest = loadManifest();
        $this->assertSame(1, $manifest['version']);
        $this->assertSame([], $manifest['entries']);
    }

    public function testLoadManifestReturnsStoredData(): void
    {
        $data = ['version' => 1, 'entries' => [['slug' => 'hello', 'status' => 'published']]];
        file_put_contents(MANIFEST_FILE, json_encode($data));

        $manifest = loadManifest();
        $this->assertCount(1, $manifest['entries']);
        $this->assertSame('hello', $manifest['entries'][0]['slug']);
    }

    // -------------------------------------------------------------------------
    // saveManifest
    // -------------------------------------------------------------------------

    public function testSaveAndLoadManifestRoundtrip(): void
    {
        $manifest = [
            'version' => 1,
            'entries' => [
                ['slug' => 'test-post', 'status' => 'published', 'title' => 'Test', 'publishedAt' => '2024-01-01T00:00:00+00:00'],
            ],
        ];

        saveManifest($manifest);
        $loaded = loadManifest();

        $this->assertSame('test-post', $loaded['entries'][0]['slug']);
        $this->assertSame('published', $loaded['entries'][0]['status']);
    }

    public function testSaveManifestCreatesBackupFile(): void
    {
        // Create initial manifest
        saveManifest(['version' => 1, 'entries' => []]);
        // Save again — should create .bak
        saveManifest(['version' => 1, 'entries' => [['slug' => 'v2']]]);

        $this->assertFileExists(MANIFEST_FILE . '.bak');
    }

    public function testSaveManifestWritesValidJson(): void
    {
        saveManifest(['version' => 1, 'entries' => [], 'unicode' => 'Ümlaute']);
        $raw = file_get_contents(MANIFEST_FILE);
        $this->assertNotFalse($raw);
        $decoded = json_decode($raw, true);
        $this->assertSame(JSON_ERROR_NONE, json_last_error());
        $this->assertSame('Ümlaute', $decoded['unicode']);
    }

    // -------------------------------------------------------------------------
    // ManifestLock
    // -------------------------------------------------------------------------

    public function testManifestLockCreatesLockFile(): void
    {
        $lock = new ManifestLock();
        $this->assertFileExists(MANIFEST_FILE . '.lock');
        unset($lock); // triggers __destruct → releases lock
    }

    public function testManifestLockReleasedOnDestruct(): void
    {
        $lockFile = MANIFEST_FILE . '.lock';

        $lock = new ManifestLock();
        $this->assertFileExists($lockFile);
        unset($lock);

        // After lock is released, a new ManifestLock should acquire immediately
        $lock2 = new ManifestLock();
        $this->assertFileExists($lockFile);
        unset($lock2);
    }

    public function testManifestReadModifyWriteUnderLockPreservesData(): void
    {
        $lock = new ManifestLock();
        $manifest = loadManifest();
        $manifest['entries'][] = ['slug' => 'locked-write', 'status' => 'published'];
        saveManifest($manifest);
        unset($lock);

        $reloaded = loadManifest();
        $this->assertSame('locked-write', $reloaded['entries'][0]['slug']);
    }
}
