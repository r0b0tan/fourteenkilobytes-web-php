<?php

declare(strict_types=1);

require_once __DIR__ . '/../ApiTestCase.php';

class JsonStorageTest extends ApiTestCase
{
    public function testReadJsonFileReturnsNullForMissingFile(): void
    {
        $this->assertNull(readJsonFile(DATA_DIR . '/missing.json'));
    }

    public function testCorruptedManifestFallsBackToBackupAndKeepsCopy(): void
    {
        saveManifest(['version' => 1, 'entries' => [['slug' => 'first', 'status' => 'published']]]);
        saveManifest(['version' => 1, 'entries' => [['slug' => 'second', 'status' => 'published']]]);
        file_put_contents(MANIFEST_FILE, '{"version":1,"entries":[');

        $manifest = @loadManifest();

        $this->assertSame('first', $manifest['entries'][0]['slug']);
        $this->assertCount(1, glob(MANIFEST_FILE . '.corrupt-*'));
    }

    public function testCorruptedSettingsWithoutBackupFallBackToDefaults(): void
    {
        file_put_contents(SETTINGS_FILE, 'not json');

        $settings = @loadSettings();

        $this->assertSame(1, $settings['version']);
        $this->assertCount(1, glob(SETTINGS_FILE . '.corrupt-*'));
    }

    public function testWriteJsonFileAtomicKeepsPreviousVersionAsBackup(): void
    {
        writeJsonFileAtomic(SETTINGS_FILE, ['version' => 1, 'siteTitle' => 'Alt']);
        writeJsonFileAtomic(SETTINGS_FILE, ['version' => 1, 'siteTitle' => 'Neu']);

        $this->assertSame('Neu', readJsonFile(SETTINGS_FILE)['siteTitle']);
        $this->assertSame('Alt', readJsonFile(SETTINGS_FILE . '.bak')['siteTitle']);
        $this->assertSame([], glob(SETTINGS_FILE . '.tmp.*'));
    }
}
