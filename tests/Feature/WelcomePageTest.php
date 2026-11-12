<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WelcomePageTest extends TestCase
{
    /**
     * A basic feature test example.
     */
    public function test_welcome_page_is_rendered_with_inertia(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome', false)
                ->where('appName', config('app.name', 'Laravel'))
            );

        $this->get('/')->assertSee('id="app"', false);
    }
}
