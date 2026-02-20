<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

abstract class ApiTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->clearDataDir();
        unset($GLOBALS['_TEST_REQUEST_BODY']);
        $_COOKIE = [];
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
    }

    protected function tearDown(): void
    {
        $this->clearDataDir();
        parent::tearDown();
    }

    private function clearDataDir(): void
    {
        foreach ([DATA_DIR, POSTS_DIR, SOURCES_DIR] as $dir) {
            if (!is_dir($dir)) {
                continue;
            }
            foreach (glob($dir . '/*') as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
        }
    }

    /**
     * Calls $fn and expects it to call sendJson() with $expectedStatus.
     * Returns the response body array.
     */
    protected function assertApiResponse(int $expectedStatus, callable $fn): array
    {
        try {
            $fn();
            $this->fail("Expected sendJson({$expectedStatus}) to be called, but no response was sent.");
        } catch (ApiResponseException $e) {
            $this->assertSame($expectedStatus, $e->statusCode,
                "Expected HTTP {$expectedStatus} but got {$e->statusCode}: " . json_encode($e->body));
            return $e->body;
        }
    }

    /**
     * Calls $fn and asserts it does NOT call sendJson() (returns false).
     */
    protected function assertNoResponse(callable $fn): void
    {
        try {
            $result = $fn();
            $this->assertFalse($result, "Expected route to return false (not matched).");
        } catch (ApiResponseException $e) {
            $this->fail("Expected no response, but sendJson({$e->statusCode}) was called: " . json_encode($e->body));
        }
    }

    protected function setRequestBody(array $data): void
    {
        $GLOBALS['_TEST_REQUEST_BODY'] = json_encode($data);
    }
}
