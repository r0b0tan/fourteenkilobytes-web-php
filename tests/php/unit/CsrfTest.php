<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class CsrfTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $_COOKIE = [];
        $_SERVER[CSRF_HEADER_NAME] = '';
    }

    public function testGeneratesCsrfTokenAs64HexChars(): void
    {
        $token = generateCsrfToken();
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $token);
    }

    public function testEachGeneratedTokenIsUnique(): void
    {
        $tokens = array_map(fn() => generateCsrfToken(), range(1, 10));
        $this->assertCount(10, array_unique($tokens));
    }

    public function testValidateCsrfTokenFailsWhenBothEmpty(): void
    {
        $this->assertFalse(validateCsrfToken());
    }

    public function testValidateCsrfTokenFailsWhenOnlyCookieSet(): void
    {
        $_COOKIE[CSRF_COOKIE_NAME] = 'token-abc';
        $this->assertFalse(validateCsrfToken());
    }

    public function testValidateCsrfTokenFailsWhenOnlyHeaderSet(): void
    {
        $_SERVER[CSRF_HEADER_NAME] = 'token-abc';
        $this->assertFalse(validateCsrfToken());
    }

    public function testValidateCsrfTokenFailsWhenValuesDiffer(): void
    {
        $_COOKIE[CSRF_COOKIE_NAME] = 'token-abc';
        $_SERVER[CSRF_HEADER_NAME] = 'token-xyz';
        $this->assertFalse(validateCsrfToken());
    }

    public function testValidateCsrfTokenPassesWhenValuesMatch(): void
    {
        $token = generateCsrfToken();
        $_COOKIE[CSRF_COOKIE_NAME] = $token;
        $_SERVER[CSRF_HEADER_NAME] = $token;
        $this->assertTrue(validateCsrfToken());
    }
}
