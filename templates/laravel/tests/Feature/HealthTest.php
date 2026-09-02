<?php

namespace Tests\Feature;

use Tests\TestCase;

final class HealthTest extends TestCase
{
    public function test_health_route_returns_ok(): void
    {
        $this->get('/up')->assertOk()->assertJson(['status' => 'ok']);
    }
}
