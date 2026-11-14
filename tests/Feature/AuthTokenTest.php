<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_register_and_use_sanctum_token(): void
    {
        $response = $this->postJson('/api/auth/guest/register', [
            'name' => 'Guest Account',
            'email' => 'guest@example.test',
            'password' => 'Password!12345',
            'password_confirmation' => 'Password!12345',
            'device_name' => 'phone',
        ]);

        $response->assertCreated()
            ->assertJsonPath('account.type', 'guest')
            ->assertJsonStructure(['token', 'account' => ['id', 'name', 'email', 'type']]);

        $this->withToken($response->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('account.type', 'guest');
    }

    public function test_admin_can_login_and_guest_cannot_login_as_admin(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.test',
            'password' => 'Password!12345',
        ]);
        Guest::factory()->create([
            'email' => 'guest@example.test',
            'password' => 'Password!12345',
        ]);

        $this->postJson('/api/auth/admin/login', [
            'email' => $admin->email,
            'password' => 'Password!12345',
            'device_name' => 'test-client',
        ])->assertOk()->assertJsonPath('account.type', 'admin');

        $this->postJson('/api/auth/admin/login', [
            'email' => 'guest@example.test',
            'password' => 'Password!12345',
            'device_name' => 'test-client',
        ])->assertUnprocessable();
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $guest = Guest::factory()->create();
        $token = $guest->createToken('test-client')->plainTextToken;

        $this->withToken($token)->deleteJson('/api/auth/logout')->assertOk();
        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('account.type', 'guest');
    }

    public function test_account_email_must_be_unique_across_both_account_types(): void
    {
        User::factory()->create(['email' => 'shared@example.test']);

        $this->postJson('/api/auth/guest/register', [
            'name' => 'Guest Account',
            'email' => 'shared@example.test',
            'password' => 'Password!12345',
            'password_confirmation' => 'Password!12345',
            'device_name' => 'phone',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }
}
