<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_an_admin_using_configured_credentials(): void
    {
        config([
            'admin.email' => 'admin@example.test',
            'admin.name' => 'VOD Administrator',
            'admin.password' => 'Strong-admin-password',
        ]);

        $this->seed(AdminUserSeeder::class);

        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();

        $this->assertSame('VOD Administrator', $admin->name);
        $this->assertTrue(Hash::check('Strong-admin-password', $admin->password));
    }

    public function test_it_does_not_seed_an_admin_when_credentials_are_missing(): void
    {
        config([
            'admin.email' => null,
            'admin.name' => null,
            'admin.password' => null,
        ]);

        $this->seed(AdminUserSeeder::class);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_reseeding_updates_the_admin_without_creating_duplicates(): void
    {
        config([
            'admin.email' => 'admin@example.test',
            'admin.name' => 'Original Admin',
            'admin.password' => 'First-password',
        ]);

        $this->seed(AdminUserSeeder::class);

        config([
            'admin.name' => 'Updated Admin',
            'admin.password' => 'Second-password',
        ]);

        $this->seed(AdminUserSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $this->assertSame('Updated Admin', $admin->name);
        $this->assertTrue(Hash::check('Second-password', $admin->password));
    }
}
