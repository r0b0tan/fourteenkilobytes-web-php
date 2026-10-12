<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class SettingsValidationTest extends TestCase
{
    private function validSettings(): array
    {
        return [
            'version' => 1,
            'homepageSlug' => 'startseite',
            'favicon' => null,
            'siteTitle' => 'Blog',
            'pageWidth' => '42rem',
            'header' => ['enabled' => true, 'links' => [['text' => 'Start', 'href' => '/']]],
            'footer' => ['enabled' => true, 'content' => '© 2026'],
            'rss' => ['enabled' => true, 'siteUrl' => 'https://example.com', 'maxItems' => 20, 'ttl' => 60],
            'bloglist' => ['limit' => 10, 'archiveEnabled' => true, 'archiveSlug' => 'archive'],
            'optimizations' => ['classMangling' => ['enabled' => false, 'mode' => 'safe']],
        ];
    }

    public function testAcceptsValidSettings(): void
    {
        $this->assertSame([], validateSettings($this->validSettings()));
    }

    public function testAllowsUnknownKeys(): void
    {
        $this->assertSame([], validateSettings($this->validSettings() + ['language' => 'de']));
    }

    public function testRejectsNonObjectsAndWrongVersion(): void
    {
        $this->assertNotSame([], validateSettings('x'));
        $this->assertNotSame([], validateSettings(['version' => 2]));
    }

    public function testRejectsCssInjectionInPageWidth(): void
    {
        $settings = $this->validSettings();
        $settings['pageWidth'] = '1px}body{display:none';

        $this->assertContains('pageWidth must be a CSS length or null', validateSettings($settings));
    }

    public function testRejectsInvalidTypesAndValues(): void
    {
        $settings = $this->validSettings();
        $settings['homepageSlug'] = '../instance';
        $settings['rss']['maxItems'] = '20';
        $settings['rss']['siteUrl'] = 'javascript:alert(1)';
        $settings['header']['links'][] = 'not a link';
        $settings['optimizations']['classMangling']['mode'] = 'extreme';

        $errors = validateSettings($settings);

        $this->assertCount(5, $errors);
    }
}
