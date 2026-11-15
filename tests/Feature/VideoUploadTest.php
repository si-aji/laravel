<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VideoUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_video_library_requires_authentication(): void
    {
        $this->getJson('/adm/videos')
            ->assertUnauthorized();
    }

    public function test_admin_can_read_the_video_library(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin, 'web')
            ->getJson('/adm/videos')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_guest_account_cannot_access_admin_video_library(): void
    {
        $guest = Guest::factory()->create();

        $this->actingAs($guest, 'guests')
            ->getJson('/adm/videos')
            ->assertUnauthorized();
    }
}
