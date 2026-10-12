<?php

declare(strict_types=1);

require_once __DIR__ . '/../ApiTestCase.php';

class AuthTest extends ApiTestCase
{
    private const TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    private function writeInstance(?string $apiToken): void
    {
        $state = ['salt' => 'salt', 'createdAt' => date('c')];
        if ($apiToken !== null) {
            $state['apiToken'] = $apiToken;
        }
        file_put_contents(INSTANCE_FILE, json_encode($state));
    }

    public function testFailsClosedWithoutConfiguredToken(): void
    {
        $this->assertFalse(checkAuth());

        $this->writeInstance(null);
        $this->assertFalse(checkAuth());
    }

    public function testLegacyAuthCookieAloneIsRejected(): void
    {
        $this->writeInstance(self::TOKEN);
        $_COOKIE['fkb_auth_v2'] = self::TOKEN;

        $this->assertFalse(checkAuth());
    }

    public function testValidSessionAuthenticates(): void
    {
        $this->writeInstance(self::TOKEN);
        $_COOKIE['fkb_session'] = createSession(self::TOKEN);

        $this->assertTrue(checkAuth());
    }

    public function testSessionDoesNotStoreToken(): void
    {
        $this->writeInstance(self::TOKEN);
        createSession(self::TOKEN);

        $this->assertStringNotContainsString(self::TOKEN, file_get_contents(SESSION_FILE));
    }

    public function testDestroyedSessionIsRejected(): void
    {
        $this->writeInstance(self::TOKEN);
        $sessionId = createSession(self::TOKEN);
        destroySession($sessionId);
        $_COOKIE['fkb_session'] = $sessionId;

        $this->assertFalse(checkAuth());
    }

    public function testPasswordChangeInvalidatesExistingSessions(): void
    {
        $this->writeInstance(self::TOKEN);
        $_COOKIE['fkb_session'] = createSession(self::TOKEN);

        $this->writeInstance(str_repeat('f', 64));

        $this->assertFalse(checkAuth());
    }

    public function testNonStringSessionCookieIsRejected(): void
    {
        $this->writeInstance(self::TOKEN);
        $_COOKIE['fkb_session'] = ['x'];

        $this->assertFalse(checkAuth());
    }

    public function testSaveInstanceStateWritesOwnerOnlyFile(): void
    {
        saveInstanceState(['salt' => 's', 'apiToken' => self::TOKEN]);

        $this->assertSame(self::TOKEN, getApiToken());
        $this->assertSame(0600, fileperms(INSTANCE_FILE) & 0777);
    }
}
