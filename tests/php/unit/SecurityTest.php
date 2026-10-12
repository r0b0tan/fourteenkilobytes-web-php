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
        unset($_SERVER['FKB_TRUSTED_PROXIES'], $_SERVER['HTTP_X_FORWARDED_FOR']);
    }

    protected function tearDown(): void
    {
        unset($_SERVER['FKB_TRUSTED_PROXIES'], $_SERVER['HTTP_X_FORWARDED_FOR']);
        parent::tearDown();
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

    public function testGetClientIpIgnoresForwardedForWithoutTrustedProxy(): void
    {
        $_SERVER['REMOTE_ADDR'] = '10.0.0.5';
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.9';

        $this->assertSame('10.0.0.5', getClientIp());
    }

    public function testGetClientIpUsesForwardedForFromTrustedProxy(): void
    {
        $_SERVER['FKB_TRUSTED_PROXIES'] = '10.0.0.0/8';
        $_SERVER['REMOTE_ADDR'] = '10.0.0.5';
        // Client-supplied spoofed entry on the left, real client added by the proxy on the right
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '1.1.1.1, 203.0.113.9';

        $this->assertSame('203.0.113.9', getClientIp());
    }

    public function testGetClientIpSkipsChainedTrustedProxies(): void
    {
        $_SERVER['FKB_TRUSTED_PROXIES'] = '10.0.0.5, 192.168.1.0/24';
        $_SERVER['REMOTE_ADDR'] = '10.0.0.5';
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.9, 192.168.1.20';

        $this->assertSame('203.0.113.9', getClientIp());
    }

    public function testGetClientIpFallsBackOnGarbageForwardedFor(): void
    {
        $_SERVER['FKB_TRUSTED_PROXIES'] = '10.0.0.5';
        $_SERVER['REMOTE_ADDR'] = '10.0.0.5';
        $_SERVER['HTTP_X_FORWARDED_FOR'] = 'not-an-ip';

        $this->assertSame('10.0.0.5', getClientIp());
    }

    public function testIpMatchesAnySupportsIpv6Cidr(): void
    {
        $this->assertTrue(ipMatchesAny('2001:db8::1', ['2001:db8::/32']));
        $this->assertFalse(ipMatchesAny('2001:db9::1', ['2001:db8::/32']));
        $this->assertFalse(ipMatchesAny('10.0.0.1', ['2001:db8::/32']));
        $this->assertTrue(ipMatchesAny('172.20.3.4', ['172.16.0.0/12']));
    }

    public function testUpdateJsonFileLockedSkipsWriteWhenUnchanged(): void
    {
        recordFailedAttempt('9.9.9.9');
        touch(RATE_LIMIT_FILE, time() - 100);
        clearstatcache();
        $mtime = filemtime(RATE_LIMIT_FILE);

        updateJsonFileLocked(RATE_LIMIT_FILE, function (array &$data): void {
        });
        clearstatcache();

        $this->assertSame($mtime, filemtime(RATE_LIMIT_FILE));
    }

    public function testRateLimitFileIsOwnerOnly(): void
    {
        recordFailedAttempt('9.9.9.9');

        $this->assertSame(0600, fileperms(RATE_LIMIT_FILE) & 0777);
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

    // -------------------------------------------------------------------------
    // loadRateLimits — normalization branches
    // -------------------------------------------------------------------------

    public function testLoadRateLimitsNormalizesOldAttemptsWrapperFormat(): void
    {
        // Old format: {"attempts": {"ip": {...}}}
        $oldFormat = [
            'attempts' => [
                '10.1.2.3' => ['attempts' => 3, 'firstAttempt' => time()],
            ],
        ];
        file_put_contents(RATE_LIMIT_FILE, json_encode($oldFormat));

        $limits = loadRateLimits();
        $this->assertArrayHasKey('10.1.2.3', $limits);
        $this->assertSame(3, $limits['10.1.2.3']['attempts']);
    }

    public function testLoadRateLimitsSkipsEntriesWithNonArrayValue(): void
    {
        $data = [
            'bad-ip'   => 'not-an-array',
            '10.9.9.9' => ['attempts' => 1, 'firstAttempt' => time()],
        ];
        file_put_contents(RATE_LIMIT_FILE, json_encode($data));

        $limits = loadRateLimits();
        $this->assertArrayNotHasKey('bad-ip', $limits);
        $this->assertArrayHasKey('10.9.9.9', $limits);
    }

    public function testLoadRateLimitsSkipsEntriesWithMissingFirstAttempt(): void
    {
        $data = [
            '10.8.8.8' => ['attempts' => 5], // no firstAttempt key
        ];
        file_put_contents(RATE_LIMIT_FILE, json_encode($data));

        $limits = loadRateLimits();
        $this->assertArrayNotHasKey('10.8.8.8', $limits);
    }

    public function testLoadRateLimitsSkipsEntriesWithNonNumericFirstAttempt(): void
    {
        $data = [
            '10.7.7.7' => ['attempts' => 2, 'firstAttempt' => 'bad-value'],
        ];
        file_put_contents(RATE_LIMIT_FILE, json_encode($data));

        $limits = loadRateLimits();
        $this->assertArrayNotHasKey('10.7.7.7', $limits);
    }

    // -------------------------------------------------------------------------
    // recordFailedAttempt — window-expiry reset branch
    // -------------------------------------------------------------------------

    public function testRecordFailedAttemptResetsCounterWhenWindowExpired(): void
    {
        $ip = '10.5.5.5';
        // Write an entry whose window has already passed
        $expired = [
            $ip => ['attempts' => 99, 'firstAttempt' => time() - RATE_LIMIT_WINDOW_SECONDS - 10],
        ];
        file_put_contents(RATE_LIMIT_FILE, json_encode($expired));

        // loadRateLimits() filters expired entries, so recordFailedAttempt sees no existing entry
        recordFailedAttempt($ip);
        $limits = loadRateLimits();

        $this->assertArrayHasKey($ip, $limits);
        $this->assertSame(1, $limits[$ip]['attempts']);
    }

    // -------------------------------------------------------------------------
    // checkGlobalRateLimit
    // -------------------------------------------------------------------------

    public function testCheckGlobalRateLimitAllowsFirstRequest(): void
    {
        // Should not throw; creates a new entry
        checkGlobalRateLimit('test-endpoint-new', false);

        $limits = loadGlobalRateLimits();
        $key = 'ip:127.0.0.1:endpoint:test-endpoint-new';
        $this->assertArrayHasKey($key, $limits);
        $this->assertSame(1, $limits[$key]['requests']);
    }

    public function testCheckGlobalRateLimitIncrementsOnSubsequentRequests(): void
    {
        checkGlobalRateLimit('test-endpoint-inc', false);
        checkGlobalRateLimit('test-endpoint-inc', false);

        $limits = loadGlobalRateLimits();
        $key = 'ip:127.0.0.1:endpoint:test-endpoint-inc';
        $this->assertSame(2, $limits[$key]['requests']);
    }

    public function testCheckGlobalRateLimitResetsExpiredWindow(): void
    {
        $key = 'ip:127.0.0.1:endpoint:expired-ep';
        $limits = [
            $key => [
                'requests'     => 50,
                'firstRequest' => time() - GLOBAL_RATE_LIMIT_WINDOW - 10,
                'window'       => GLOBAL_RATE_LIMIT_WINDOW,
            ],
        ];
        file_put_contents(GLOBAL_RATE_LIMIT_FILE, json_encode($limits));

        checkGlobalRateLimit('expired-ep', false);

        $fresh = loadGlobalRateLimits();
        $this->assertSame(1, $fresh[$key]['requests']);
    }

    public function testCheckGlobalRateLimitBlocksWhenLimitExceeded(): void
    {
        $key = 'ip:127.0.0.1:endpoint:strict-ep';
        $limits = [
            $key => [
                'requests'     => GLOBAL_RATE_LIMIT_STRICT_MAX,
                'firstRequest' => time(),
                'window'       => GLOBAL_RATE_LIMIT_STRICT_WINDOW,
            ],
        ];
        file_put_contents(GLOBAL_RATE_LIMIT_FILE, json_encode($limits));

        try {
            checkGlobalRateLimit('strict-ep', true);
            $this->fail('Expected 429 response');
        } catch (ApiResponseException $e) {
            $this->assertSame(429, $e->statusCode);
        }
    }

    public function testCheckGlobalRateLimitUsesLaxLimitsForNonStrict(): void
    {
        $key = 'ip:127.0.0.1:endpoint:lax-ep';
        // At the lax limit (should block)
        $limits = [
            $key => [
                'requests'     => GLOBAL_RATE_LIMIT_MAX_REQUESTS,
                'firstRequest' => time(),
                'window'       => GLOBAL_RATE_LIMIT_WINDOW,
            ],
        ];
        file_put_contents(GLOBAL_RATE_LIMIT_FILE, json_encode($limits));

        try {
            checkGlobalRateLimit('lax-ep', false);
            $this->fail('Expected 429 response');
        } catch (ApiResponseException $e) {
            $this->assertSame(429, $e->statusCode);
        }
    }
}
