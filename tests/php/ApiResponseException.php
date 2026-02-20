<?php

declare(strict_types=1);

/**
 * Thrown by the test stub of sendJson() instead of calling exit().
 */
class ApiResponseException extends \RuntimeException
{
    public function __construct(
        public readonly int $statusCode,
        public readonly array $body
    ) {
        parent::__construct("HTTP {$statusCode}: " . json_encode($body));
    }
}
