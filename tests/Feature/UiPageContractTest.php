<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UiPageContractTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string, string}>
     */
    public static function publicPages(): array
    {
        return [
            'public home' => ['/', 'Welcome'],
            'account selection' => ['/sign-in', 'Auth/SignInOptions'],
            'admin sign-in' => ['/adm/sign-in', 'Auth/AdminSignIn'],
            'guest sign-in' => ['/guest/sign-in', 'Auth/GuestSignIn'],
            'guest registration' => ['/guest/register', 'Auth/GuestRegister'],
        ];
    }

    #[DataProvider('publicPages')]
    public function test_public_pages_keep_their_inertia_contract(string $path, string $component): void
    {
        $this->assertFileExists(resource_path("js/Pages/{$component}.jsx"));

        $this->get($path)
            ->assertOk()
            ->assertSee('name="color-scheme" content="light"', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component($component, false)
                ->where('appName', config('app.name'))
            );
    }

    public function test_admin_dashboard_receives_only_displayable_account_fields(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin, 'web')
            ->get('/adm')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/AdminDashboard', false)
                ->has('account', 2)
                ->where('account.name', $admin->name)
                ->where('account.email', $admin->email)
            );
    }

    public function test_guest_dashboard_receives_only_displayable_account_fields(): void
    {
        $guest = Guest::factory()->create();

        $this->actingAs($guest, 'guests')
            ->get('/guest')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/GuestDashboard', false)
                ->has('account', 2)
                ->where('account.name', $guest->name)
                ->where('account.email', $guest->email)
            );
    }
}
