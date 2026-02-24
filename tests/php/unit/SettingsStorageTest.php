<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class SettingsStorageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (file_exists(SETTINGS_FILE)) {
            unlink(SETTINGS_FILE);
        }
        if (file_exists(SETTINGS_FILE . '.bak')) {
            unlink(SETTINGS_FILE . '.bak');
        }
    }

    // -------------------------------------------------------------------------
    // loadSettings — no file
    // -------------------------------------------------------------------------

    public function testLoadSettingsReturnsDefaultsWhenFileAbsent(): void
    {
        $settings = loadSettings();

        $this->assertSame(1, $settings['version']);
        $this->assertSame('default', $settings['cssMode']);
        $this->assertSame('', $settings['globalCss']);
        $this->assertTrue($settings['optimizations']['compression']['enabled']);
        $this->assertFalse($settings['optimizations']['classMangling']['enabled']);
        $this->assertSame('safe', $settings['optimizations']['classMangling']['mode']);
        $this->assertFalse($settings['header']['enabled']);
        $this->assertFalse($settings['footer']['enabled']);
        $this->assertSame('', $settings['blog']['author']);
    }

    // -------------------------------------------------------------------------
    // loadSettings — normalization of missing fields
    // -------------------------------------------------------------------------

    public function testLoadSettingsAddsVersionWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode(['cssMode' => 'custom']));
        $settings = loadSettings();
        $this->assertSame(1, $settings['version']);
    }

    public function testLoadSettingsAddsCssModeWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode(['version' => 1]));
        $settings = loadSettings();
        $this->assertSame('default', $settings['cssMode']);
    }

    public function testLoadSettingsAddsBloglistWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode(['version' => 1]));
        $settings = loadSettings();
        $this->assertArrayHasKey('bloglist', $settings);
        $this->assertSame(10, $settings['bloglist']['limit']);
    }

    public function testLoadSettingsAddsBlogAuthorWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode(['version' => 1]));
        $settings = loadSettings();
        $this->assertSame('', $settings['blog']['author']);
    }

    public function testLoadSettingsNormalizesBlogWhenNotArray(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode(['version' => 1, 'blog' => 'not-array']));
        $settings = loadSettings();
        $this->assertIsArray($settings['blog']);
        $this->assertSame('', $settings['blog']['author']);
    }

    public function testLoadSettingsAddsOptimizationsWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode(['version' => 1]));
        $settings = loadSettings();
        $this->assertTrue($settings['optimizations']['compression']['enabled']);
        $this->assertFalse($settings['optimizations']['classMangling']['enabled']);
    }

    public function testLoadSettingsAddsCompressionEnabledWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode([
            'version' => 1,
            'optimizations' => ['compression' => []],
        ]));
        $settings = loadSettings();
        $this->assertTrue($settings['optimizations']['compression']['enabled']);
    }

    public function testLoadSettingsAddsClassManglingEnabledWhenMissing(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode([
            'version' => 1,
            'optimizations' => ['classMangling' => []],
        ]));
        $settings = loadSettings();
        $this->assertFalse($settings['optimizations']['classMangling']['enabled']);
    }

    // -------------------------------------------------------------------------
    // loadSettings — classMangling mode normalization
    // -------------------------------------------------------------------------

    public function testLoadSettingsPreservesAggressiveManglingMode(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode([
            'version' => 1,
            'optimizations' => [
                'classMangling' => ['enabled' => true, 'mode' => 'aggressive'],
            ],
        ]));
        $settings = loadSettings();
        $this->assertSame('aggressive', $settings['optimizations']['classMangling']['mode']);
    }

    public function testLoadSettingsNormalizesUnknownModeToSafe(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode([
            'version' => 1,
            'optimizations' => [
                'classMangling' => ['enabled' => true, 'mode' => 'turbo'],
            ],
        ]));
        $settings = loadSettings();
        $this->assertSame('safe', $settings['optimizations']['classMangling']['mode']);
    }

    public function testLoadSettingsPreservesSafeMode(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode([
            'version' => 1,
            'optimizations' => [
                'classMangling' => ['enabled' => false, 'mode' => 'safe'],
            ],
        ]));
        $settings = loadSettings();
        $this->assertSame('safe', $settings['optimizations']['classMangling']['mode']);
    }

    // -------------------------------------------------------------------------
    // loadSettings — removes legacy casing key
    // -------------------------------------------------------------------------

    public function testLoadSettingsRemovesLegacyCasingKey(): void
    {
        file_put_contents(SETTINGS_FILE, json_encode([
            'version' => 1,
            'optimizations' => [
                'casing' => ['enabled' => true],
            ],
        ]));
        $settings = loadSettings();
        $this->assertArrayNotHasKey('casing', $settings['optimizations']);
    }

    // -------------------------------------------------------------------------
    // saveSettings — round-trip and backup
    // -------------------------------------------------------------------------

    public function testSaveSettingsRoundtrip(): void
    {
        $settings = loadSettings();
        $settings['globalCss'] = 'body { margin: 0; }';
        saveSettings($settings);

        $loaded = loadSettings();
        $this->assertSame('body { margin: 0; }', $loaded['globalCss']);
    }

    public function testSaveSettingsCreatesBackupOnSecondSave(): void
    {
        saveSettings(loadSettings());
        saveSettings(loadSettings());

        $this->assertFileExists(SETTINGS_FILE . '.bak');
    }
}
