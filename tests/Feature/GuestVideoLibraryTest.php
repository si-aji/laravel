<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use PasukanVod\PasukanVod\Models\Video;
use Tests\TestCase;

class GuestVideoLibraryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'video-ondemand.stream.endpoint' => 'https://stream.example.test',
            'video-ondemand.stream.api_token' => 'stream-test-token',
            'video-ondemand.stream.public_endpoint' => 'https://vod.laravel.test',
            'video-ondemand.stream.playback_grant_secret' => 'test-playback-grant-secret-at-least-32-chars',
            'video-ondemand.stream.playback_grant_ttl_seconds' => 300,
        ]);
    }

    public function test_guest_catalog_requires_guest_authentication(): void
    {
        $this->get('/guest/videos')->assertRedirect('/guest/sign-in');
        $this->get('/guest/videos/'.(string) str()->uuid())->assertRedirect('/guest/sign-in');
    }

    public function test_guest_catalog_shows_only_ready_published_videos_and_supports_search(): void
    {
        $guest = Guest::factory()->create();
        $published = $this->video(['title' => 'Published lesson', 'is_published' => true]);
        $this->video(['title' => 'Private lesson']);
        $this->video(['title' => 'Not ready', 'is_published' => true, 'status' => 'uploading']);

        $this->actingAs($guest, 'guests')
            ->get('/guest/videos')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Guest/Videos/Index', false)
                ->where('videos.total', 1)
                ->where('videos.data.0.id', $published->id)
                ->where('videos.data.0.watch_url', route('guest.videos.show', $published)));

        $this->get('/guest/videos?search=missing')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('videos.total', 0)->where('search', 'missing'));
    }

    public function test_unpublished_video_is_not_visible_to_guests_but_admin_can_preview(): void
    {
        $guest = Guest::factory()->create();
        $video = $this->video(['stream_job_id' => 'job-123']);
        $this->actingAs($guest, 'guests')
            ->get('/guest/videos/'.$video->id)
            ->assertNotFound();
        $this->get(route('guest.videos.playback.manifest', $video))->assertNotFound();
        $this->get(route('guest.videos.playback.grant', $video))->assertNotFound();

        Http::fake([
            'stream.example.test/v1/jobs/job-123' => Http::response([
                'jobId' => 'job-123',
                'status' => 'completed',
                'manifestUrl' => 'https://stream.example.test/v1/jobs/job-123/manifest',
            ]),
            'stream.example.test/v1/jobs/job-123/manifest*' => Http::response(
                "#EXTM3U\n#EXTINF:6.0,\nsegment_00000.ts\n",
                200,
                ['Content-Type' => 'application/vnd.apple.mpegurl'],
            ),
        ]);

        auth('guests')->logout();
        $this->actingAs(User::factory()->create(), 'web')
            ->get(route('admin.videos.playback.manifest', $video))
            ->assertOk()
            ->assertSee('https://vod.laravel.test/v1/playback/job-123/assets/segment_00000.ts', false);
    }

    public function test_signed_in_guest_receives_a_scoped_playback_grant_and_service_asset_urls(): void
    {
        $guest = Guest::factory()->create();
        $video = $this->video(['is_published' => true, 'stream_job_id' => 'job-123']);
        Http::fake([
            'stream.example.test/v1/jobs/job-123' => Http::response([
                'jobId' => 'job-123',
                'status' => 'completed',
                'manifestUrl' => 'https://stream.example.test/v1/jobs/job-123/manifest',
            ]),
            'stream.example.test/v1/jobs/job-123/manifest*' => Http::response(
                "#EXTM3U\n#EXTINF:6.0,\nsegment_00000.ts\n",
                200,
                ['Content-Type' => 'application/vnd.apple.mpegurl'],
            ),
        ]);

        $manifestResponse = $this->actingAs($guest, 'guests')
            ->get(route('guest.videos.playback.manifest', $video))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.apple.mpegurl');
        $manifest = $manifestResponse->getContent();
        $this->assertStringContainsString('private', $manifestResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $manifestResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString(
            'https://vod.laravel.test/v1/playback/job-123/assets/segment_00000.ts',
            $manifest,
        );

        $grantResponse = $this->get(route('guest.videos.playback.grant', $video))
            ->assertOk()
            ->assertJsonStructure(['grant']);
        $this->assertStringContainsString('private', $grantResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $grantResponse->headers->get('Cache-Control'));
        $grant = $grantResponse->json('grant');
        [$payload, $signature] = explode('.', $grant, 2);
        $this->assertSame(
            hash_hmac('sha256', $payload, 'test-playback-grant-secret-at-least-32-chars'),
            $signature,
        );
        $decodedPayload = base64_decode(strtr($payload, '-_', '+/').str_repeat('=', (4 - strlen($payload) % 4) % 4));
        $claims = json_decode($decodedPayload, true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('vod-playback', $claims['aud']);
        $this->assertSame('job-123', $claims['job_id']);
        $this->assertSame((string) $video->id, $claims['video_id']);
        $this->assertGreaterThan(now()->timestamp, $claims['exp']);

        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/manifest?')
            && $request->hasHeader('Authorization', 'Bearer stream-test-token'));
    }

    public function test_nested_manifest_uris_are_resolved_inside_the_stream_package(): void
    {
        $video = $this->video([
            'is_published' => true,
            'stream_job_id' => 'job-123',
        ]);
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/manifest?')) {
                return Http::response(
                    "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\n720p/index.m3u8\n",
                    200,
                    ['Content-Type' => 'application/vnd.apple.mpegurl'],
                );
            }

            return Http::response([
                'jobId' => 'job-123',
                'status' => 'completed',
                'manifestUrl' => 'https://stream.example.test/v1/jobs/job-123/manifest',
            ]);
        });

        $this->actingAs(Guest::factory()->create(), 'guests')
            ->get(route('guest.videos.playback.manifest', $video))
            ->assertOk()
            ->assertSee('https://vod.laravel.test/v1/playback/job-123/assets/720p/index.m3u8', false);

        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/manifest?')
            && $request['path'] === 'master.m3u8');
    }

    private function video(array $attributes = []): Video
    {
        return Video::query()->create([
            'disk' => 'library-test',
            'path' => 'private/lesson.mp4',
            'original_filename' => 'lesson.mp4',
            'mime_type' => 'video/mp4',
            'size' => 100,
            'status' => 'ready',
            'title' => 'Lesson',
            ...$attributes,
        ]);
    }
}
