<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\User;
use Aws\Command;
use Aws\MockHandler;
use Aws\Result;
use Aws\S3\Exception\S3Exception;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PasukanVod\PasukanVod\Models\Video;
use PasukanVod\PasukanVod\Models\VideoUpload;
use Tests\TestCase;

class AdminVideoLibraryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['video-ondemand.storage.disk' => 'library-test', 'video-ondemand.uploads.part_size_megabytes' => 5]);
        Storage::fake('library-test');
    }

    public function test_library_and_upload_routes_require_an_admin_session(): void
    {
        $this->get('/adm/videos')->assertRedirect('/adm/sign-in');
        $this->postJson('/adm/video-uploads', $this->uploadData())->assertUnauthorized();
        $this->actingAs(Guest::factory()->create(), 'guests')->get('/adm/videos')->assertRedirect('/adm/sign-in');
        $this->postJson('/adm/video-uploads', $this->uploadData())->assertUnauthorized();
    }

    public function test_library_is_shared_and_does_not_expose_storage_credentials_or_object_keys(): void
    {
        $owner = User::factory()->create();
        $video = $this->video($owner);
        $this->actingAs(User::factory()->create(), 'web')->get('/adm/videos')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Videos/Index', false)
                ->where('videos.data.0.id', $video->id)
                ->where('videos.data.0.uploader', $owner->name)
                ->missing('videos.data.0.path')->missing('videos.data.0.disk')
            );
    }

    public function test_library_search_and_pagination_work(): void
    {
        $admin = User::factory()->create();
        $this->video($admin, ['title' => 'Find this lesson']);
        $this->video($admin, ['title' => 'Another video', 'original_filename' => 'another.mp4']);
        $this->actingAs($admin, 'web')->get('/adm/videos?search=lesson')
            ->assertInertia(fn (Assert $page) => $page->where('videos.total', 1)->where('videos.data.0.title', 'Find this lesson'));
        for ($i = 0; $i < 15; $i++) {
            $this->video($admin);
        }
        $this->get('/adm/videos')->assertInertia(fn (Assert $page) => $page->has('videos.data', 15)->where('videos.total', 17));
    }

    public function test_start_creates_a_persistent_draft_and_repeated_request_does_not_duplicate_it(): void
    {
        $admin = User::factory()->create();
        $payload = $this->uploadData();
        $first = $this->actingAs($admin, 'web')->postJson('/adm/video-uploads', $payload)->assertCreated()
            ->assertJsonPath('part_count', 2)->assertJsonPath('part_size', 5 * 1024 * 1024);
        $this->postJson('/adm/video-uploads', $payload)->assertCreated()->assertJsonPath('id', $first->json('id'));
        $this->assertSame(1, Video::query()->count());
        $this->assertSame(1, VideoUpload::query()->count());
        $this->assertSame('My lesson', Video::query()->first()->title);
        $this->assertSame('', VideoUpload::query()->first()->storage_upload_id);
    }

    public function test_invalid_uploads_are_rejected_before_a_draft_is_created(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->postJson('/adm/video-uploads', [
            ...$this->uploadData(), 'filename' => '../lesson.mp4', 'mime_type' => 'text/html', 'size' => 0,
        ])->assertUnprocessable()->assertJsonValidationErrors(['filename', 'mime_type', 'size']);
        $this->postJson('/adm/video-uploads', [...$this->uploadData(), 'filename' => ['unexpected']])
            ->assertUnprocessable()->assertJsonValidationErrors(['filename']);
        $this->assertSame(0, Video::query()->count());
    }

    public function test_other_admins_cannot_resume_sign_complete_or_cancel_an_upload(): void
    {
        $owner = User::factory()->create();
        $start = $this->actingAs($owner, 'web')->postJson('/adm/video-uploads', $this->uploadData())->json();
        $this->actingAs(User::factory()->create(), 'web');
        $this->getJson($start['resume_url'])->assertNotFound();
        $this->postJson(str_replace('__PART__', '1', $start['part_url']))->assertNotFound();
        $this->deleteJson($start['cancel_url'])->assertNotFound();
        $this->postJson($start['complete_url'], ['parts' => [['part_number' => 1, 'etag' => '"one"']]])->assertNotFound();
    }

    public function test_upload_page_lists_only_the_current_admins_unfinished_uploads(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->postJson('/adm/video-uploads', $this->uploadData());
        $this->actingAs(User::factory()->create(), 'web')->get('/adm/videos/upload')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Videos/Upload', false)->has('resumableUploads', 0));
    }

    public function test_any_admin_can_edit_title_and_description_but_not_storage_fields(): void
    {
        $video = $this->video(User::factory()->create());
        $this->actingAs(User::factory()->create(), 'web')
            ->patchJson('/adm/videos/'.$video->id, ['title' => 'Updated title', 'description' => 'Updated description', 'path' => 'evil-path', 'size' => 1])
            ->assertOk()->assertJsonPath('video.title', 'Updated title');
        $this->assertSame('private/lesson.mp4', $video->refresh()->path);
        $this->assertSame(100, $video->size);
        $this->assertSame('Updated description', $video->description);
    }

    public function test_deletion_removes_the_object_and_database_record(): void
    {
        $video = $this->video(User::factory()->create());
        Storage::disk('library-test')->put($video->path, 'video bytes');
        $this->actingAs(User::factory()->create(), 'web')->deleteJson('/adm/videos/'.$video->id)->assertOk();
        Storage::disk('library-test')->assertMissing($video->path);
        $this->assertNull(Video::query()->find($video->id));
    }

    public function test_failed_deletion_keeps_a_retriable_record_and_prevents_edits(): void
    {
        $video = $this->video(User::factory()->create());
        $this->actingAs(User::factory()->create(), 'web')->deleteJson('/adm/videos/'.$video->id)->assertStatus(503);
        $this->assertSame('delete_pending', $video->refresh()->status);
        $this->patchJson('/adm/videos/'.$video->id, ['title' => 'Cannot edit'])->assertStatus(409);
        $this->deleteJson('/adm/videos/'.$video->id)->assertOk();
        $this->assertNull(Video::query()->find($video->id));
    }

    public function test_cancel_removes_an_unstarted_session_and_draft_without_cloud_calls(): void
    {
        $start = $this->actingAs(User::factory()->create(), 'web')->postJson('/adm/video-uploads', $this->uploadData())->json();
        $this->deleteJson($start['cancel_url'])->assertOk();
        $this->assertSame(0, Video::query()->count());
        $this->assertSame(0, VideoUpload::query()->count());
    }

    public function test_multipart_sign_resume_complete_and_completion_retry_use_the_package(): void
    {
        $handler = new MockHandler([
            new Result(['Uploads' => []]), new Result(['UploadId' => 'cloud-upload']),
            new Result(['Parts' => [['PartNumber' => 1, 'ETag' => '"one"', 'Size' => 5 * 1024 * 1024]], 'IsTruncated' => false]),
            new Result(['Parts' => [
                ['PartNumber' => 1, 'ETag' => '"one"', 'Size' => 5 * 1024 * 1024],
                ['PartNumber' => 2, 'ETag' => '"two"', 'Size' => 1024 * 1024],
            ], 'IsTruncated' => false]),
            new Result([]), new Result(['ContentLength' => 6 * 1024 * 1024, 'ContentType' => 'video/mp4']),
        ]);
        $this->s3($handler);
        $start = $this->actingAs(User::factory()->create(), 'web')->postJson('/adm/video-uploads', $this->uploadData())->assertCreated()->json();
        $this->postJson(str_replace('__PART__', '1', $start['part_url']))->assertOk()->assertJsonStructure(['url', 'headers', 'expires_at']);
        $this->postJson(str_replace('__PART__', '2', $start['part_url']))->assertOk()->assertJsonStructure(['url', 'headers', 'expires_at']);
        $this->getJson($start['resume_url'])->assertOk()->assertJsonPath('parts.0.etag', '"one"');
        $parts = ['parts' => [['part_number' => 1, 'etag' => '"one"'], ['part_number' => 2, 'etag' => '"two"']]];
        $this->postJson($start['complete_url'], $parts)->assertOk()->assertJsonPath('video_id', $start['video_id']);
        $this->postJson($start['complete_url'], $parts)->assertOk()->assertJsonPath('video_id', $start['video_id']);
        $this->assertSame(1, Video::query()->count());
        $this->assertSame('ready', Video::query()->first()->status);
        $this->assertSame('My lesson', Video::query()->first()->title);
        $this->assertSame(0, VideoUpload::query()->count());
    }

    public function test_storage_abort_failure_keeps_the_draft_and_session_for_retry(): void
    {
        $handler = new MockHandler([
            new Result(['Uploads' => []]), new Result(['UploadId' => 'cloud-upload']),
            new S3Exception('Unavailable', new Command('AbortMultipartUpload')),
        ]);
        $this->s3($handler);
        $start = $this->actingAs(User::factory()->create(), 'web')->postJson('/adm/video-uploads', $this->uploadData())->json();
        $this->postJson(str_replace('__PART__', '1', $start['part_url']))->assertOk();
        $this->deleteJson($start['cancel_url'])->assertStatus(503);
        $this->assertSame(1, Video::query()->count());
        $this->assertSame(1, VideoUpload::query()->count());
    }

    public function test_part_signing_failure_logs_safe_aws_diagnostics(): void
    {
        $handler = new MockHandler([
            new Result(['Uploads' => []]),
            new S3Exception('Access denied', new Command('CreateMultipartUpload'), [
                'code' => 'AccessDenied',
                'response' => new PsrResponse(403),
            ]),
        ]);
        $this->s3($handler);
        $start = $this->actingAs(User::factory()->create(), 'web')
            ->postJson('/adm/video-uploads', $this->uploadData())->assertCreated()->json();

        $loggedContext = [];
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function (string $message, array $context) use (&$loggedContext): bool {
                $loggedContext = $context;

                return true;
            });

        $this->postJson(str_replace('__PART__', '1', $start['part_url']))
            ->assertStatus(503)
            ->assertJsonPath('message', 'The upload operation did not finish. Check your connection and retry; expired uploads must be cancelled and restarted.');

        $this->assertSame(S3Exception::class, $loggedContext['exception']);
        $this->assertSame('AccessDenied', $loggedContext['aws_error_code'] ?? null);
        $this->assertSame(403, $loggedContext['aws_status_code'] ?? null);
        $this->assertArrayNotHasKey('message', $loggedContext);
        $this->assertArrayNotHasKey('url', $loggedContext);
    }

    public function test_expired_part_signing_failure_logs_a_safe_reason(): void
    {
        $start = $this->actingAs(User::factory()->create(), 'web')
            ->postJson('/adm/video-uploads', $this->uploadData())->assertCreated()->json();
        VideoUpload::query()->whereKey($start['id'])->update([
            'upload_expires_at' => now()->subMinute(),
        ]);

        $loggedContext = [];
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function (string $message, array $context) use (&$loggedContext): bool {
                $loggedContext = $context;

                return true;
            });

        $this->postJson(str_replace('__PART__', '1', $start['part_url']))
            ->assertStatus(503);

        $this->assertSame(\RuntimeException::class, $loggedContext['exception']);
        $this->assertSame('upload_expired', $loggedContext['failure_reason']);
        $this->assertArrayNotHasKey('message', $loggedContext);
    }

    /** @return array<string, mixed> */
    private function uploadData(): array
    {
        return ['request_id' => (string) Str::uuid(), 'filename' => 'lesson.mp4', 'mime_type' => 'video/mp4',
            'size' => 6 * 1024 * 1024, 'title' => 'My lesson', 'description' => 'A useful lesson'];
    }

    /** @param array<string, mixed> $attributes */
    private function video(User $owner, array $attributes = []): Video
    {
        $video = new Video([...[
            'disk' => 'library-test', 'path' => 'private/lesson.mp4', 'original_filename' => 'lesson.mp4',
            'mime_type' => 'video/mp4', 'size' => 100, 'status' => 'ready', 'title' => 'Test video',
        ], ...$attributes]);
        $video->owner()->associate($owner);
        $video->save();

        return $video;
    }

    private function s3(MockHandler $handler): void
    {
        Storage::forgetDisk('library-test');
        config(['filesystems.disks.library-test' => [
            'driver' => 's3', 'region' => 'us-east-1', 'bucket' => 'test-bucket', 'key' => 'test-key',
            'secret' => 'test-secret', 'endpoint' => 'https://storage.example.test', 'handler' => $handler,
        ]]);
    }
}
