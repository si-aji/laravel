<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrowserAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_and_guest_sign_in_pages_are_available(): void
    {
        $this->get('/sign-in')
            ->assertOk();

        $this->get('/adm/sign-in')
            ->assertOk();

        $this->get('/guest/sign-in')
            ->assertOk();

        $this->get('/guest/register')
            ->assertOk();
    }

    public function test_guest_requests_redirect_to_the_guard_specific_sign_in_page(): void
    {
        $this->get('/adm')->assertRedirect('/adm/sign-in');
        $this->get('/guest')->assertRedirect('/guest/sign-in');
    }

    public function test_authenticated_guest_visiting_guest_sign_in_is_redirected_to_guest_dashboard(): void
    {
        $guest = Guest::factory()->create();

        $this->actingAs($guest, 'guests')
            ->get('/guest/sign-in')
            ->assertRedirect('/guest');
    }

    public function test_admin_and_guest_can_sign_in_and_sign_out_with_separate_guards(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.test']);
        $guest = Guest::factory()->create(['email' => 'guest@example.test']);

        $this->post('/adm/sign-in', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect('/adm');
        $this->assertAuthenticatedAs($admin, 'web');
        $this->post('/adm/sign-out')->assertRedirect('/adm/sign-in');
        $this->assertGuest('web');

        $this->post('/guest/sign-in', [
            'email' => $guest->email,
            'password' => 'password',
        ])->assertRedirect('/guest');
        $this->assertAuthenticatedAs($guest, 'guests');
        $this->post('/guest/sign-out')->assertRedirect('/guest/sign-in');
        $this->assertGuest('guests');
    }

    public function test_guest_can_register_and_sign_in_with_a_browser_session(): void
    {
        $this->post('/guest/register', [
            'name' => 'Browser Guest',
            'email' => 'browser-guest@example.test',
            'password' => 'Password!12345',
            'password_confirmation' => 'Password!12345',
        ])->assertRedirect('/guest');

        $this->assertDatabaseHas('guests', ['email' => 'browser-guest@example.test']);
        $this->assertAuthenticated('guests');
    }

    public function test_admin_sign_in_rejects_guest_credentials(): void
    {
        Guest::factory()->create(['email' => 'guest@example.test']);

        $this->from('/adm/sign-in')->post('/adm/sign-in', [
            'email' => 'guest@example.test',
            'password' => 'password',
        ])->assertRedirect('/adm/sign-in')->assertSessionHasErrors('email');

        $this->assertGuest('web');
    }

    public function test_admin_sign_in_path_uses_adm_prefix_and_old_path_is_not_available(): void
    {
        $this->get('/admin/sign-in')->assertNotFound();

        $this->get('/adm/sign-in')->assertOk();
    }
}
