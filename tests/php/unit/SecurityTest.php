<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class SecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Clean rate limit files before each test
        foreach ([RATE_LIMIT_FILE, GLOBAL_RATE_LIMIT_FILE] as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
    }

    // -------------------------------------------------------------------------
    // getClientIp
    // -------------------------------------------------------------------------

    public function testGetClientIpReturnsRemoteAddr(): void
    {
        $_SERVER['REMOTE_ADDR'] = '1.2.3.4';
        $this->assertSame('1.2.3.4', getClientIp());
    }

    public function testGetClientIpReturnsUnknownWhenMissing(): void
    {
        unset($_SERVER['REMOTE_ADDR']);
        $this->assertSame('unknown', getClientIp());
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
    }

    // -------------------------------------------------------------------------
    // checkRateLimit / recordFailedAttempt / clearRateLimit
    // -------------------------------------------------------------------------

    public function testCheckRateLimitAllowsFirstAttempt(): void
    {
        $this->assertTrue(checkRateLimit('10.0.0.1'));
    }

    public function testRecordFailedAttemptIncrementCount(): void
    {
        recordFailedAttempt('10.0.0.2');
        $limits = loadRateLimits();
        $this->assertArrayHasKey('10.0.0.2', $limits);
        $this->assertSame(1, $limits['10.0.0.2']['attempts']);
    }

    public function testCheckRateLimitBlocksAfterMaxAttempts(): void
    {
        $ip = '10.0.0.3';
        for ($i = 0; $i < RATE_LIMIT_MAX_ATTEMPTS; $i++) {
            recordFailedAttempt($ip);
        }
        $this->assertFalse(checkRateLimit($ip));
    }

    public function testCheckRateLimitStillAllowsBeforeMaxAttempts(): void
    {
        $ip = '10.0.0.4';
        for ($i = 0; $i < RATE_LIMIT_MAX_ATTEMPTS - 1; $i++) {
            recordFailedAttempt($ip);
        }
        $this->assertTrue(checkRateLimit($ip));
    }

    public function testClearRateLimitRemovesEntry(): void
    {
        $ip = '10.0.0.5';
        for ($i = 0; $i < RATE_LIMIT_MAX_ATTEMPTS; $i++) {
            recordFailedAttempt($ip);
        }
        $this->assertFalse(checkRateLimit($ip));

        clearRateLimit($ip);
        $this->assertTrue(checkRateLimit($ip));
    }

    public function testCheckRateLimitIgnoresExpiredWindow(): void
    {
        $ip = '10.0.0.6';
        // Manually write an expired entry
        $limits = [
            $ip => [
                'attempts' => RATE_LIMIT_MAX_ATTEMPTS + 10,
                'firstAttempt' => time() - RATE_LIMIT_WINDOW_SECONDS - 1,
            ],
        ];
        file_put_contents(RATE_LIMIT_FILE, json_encode($limits));

        // Should be allowed since the window has expired
        $this->assertTrue(checkRateLimit($ip));
    }

    // -------------------------------------------------------------------------
    // loadRateLimits handles corrupt data gracefully
    // -------------------------------------------------------------------------

    public function testLoadRateLimitsReturnsEmptyArrayForCorruptFile(): void
    {
        file_put_contents(RATE_LIMIT_FILE, 'not-valid-json{{{');
        $limits = loadRateLimits();
        $this->assertSame([], $limits);
    }
}
