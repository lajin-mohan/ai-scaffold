<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Proves the test runner is wired before any real code exists, so a fresh
 * project passes `composer test` on day one. Mirrors the smoke test the
 * node, python, and golang profiles ship.
 */
final class SmokeTest extends TestCase
{
    public function testScaffoldTestRunnerIsWiredAndPassing(): void
    {
        self::assertTrue(true);
    }
}
