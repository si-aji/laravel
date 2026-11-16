<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\Admin\CompleteVideoUploadRequest;
use App\Http\Requests\Web\Admin\StartVideoUploadRequest;
use Aws\Exception\AwsException;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use PasukanVod\PasukanVod\Data\VideoData;
use PasukanVod\PasukanVod\Data\VideoUploadPart;
use PasukanVod\PasukanVod\Models\Video;
use PasukanVod\PasukanVod\Models\VideoUpload;
use PasukanVod\PasukanVod\Services\Videos\VideoLibraryService;
use PasukanVod\PasukanVod\Services\Videos\VideoStreamService;
use RuntimeException;
use Throwable;

class VideoUploadController extends Controller
{
    public function store(StartVideoUploadRequest $request, VideoLibraryService $library): JsonResponse
    {
        $key = 'admin-video-upload:'.$request->user('web')->getKey().':'.$request->validated('request_id');

        try {
            $result = Cache::lock($key.':lock', 30)->block(5, function () use ($key, $request, $library): array {
                $cached = Cache::get($key);
                if (is_array($cached)) {
                    return $cached;
                }
                $started = $library->start(
                    $request->user('web'), $request->validated('filename'), $request->validated('mime_type'),
                    (int) $request->validated('size'), new VideoData($request->validated('title'), $request->validated('description')),
                );
                $video = $started['video'];
                $result = [
                    ...$started['upload'],
                    'video_id' => $video->id,
                    'metadata_url' => route('admin.videos.update', $video),
                    'complete_url' => route('admin.video-uploads.complete', $video),
                    'resume_url' => route('admin.video-uploads.show', $started['upload']['id']),
                    'part_url' => route('admin.video-uploads.sign', [$started['upload']['id'], '__PART__']),
                    'cancel_url' => route('admin.video-uploads.destroy', $started['upload']['id']),
                ];
                Cache::put($key, $result, now()->addDay());

                return $result;
            });
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }

        return response()->json($result, 201)->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, VideoUpload $upload, VideoLibraryService $library): JsonResponse
    {
        $this->authorizeUpload($request, $upload);
        try {
            $result = $library->resume($upload->id, $request->user('web'));
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }

        return response()->json([
            ...$result,
            'id' => $upload->id,
            'video_id' => $upload->video_id,
            'expires_at' => $upload->upload_expires_at->toIso8601String(),
            'metadata_url' => route('admin.videos.update', $upload->video_id),
            'complete_url' => route('admin.video-uploads.complete', $upload->video_id),
            'resume_url' => route('admin.video-uploads.show', $upload),
            'part_url' => route('admin.video-uploads.sign', [$upload, '__PART__']),
            'cancel_url' => route('admin.video-uploads.destroy', $upload),
        ])->header('Cache-Control', 'no-store');
    }

    public function sign(Request $request, VideoUpload $upload, int $part, VideoLibraryService $library): JsonResponse
    {
        $this->authorizeUpload($request, $upload);
        abort_if($part < 1 || $part > 10000, 422);
        try {
            $signed = $library->signPart($upload->id, $request->user('web'), $part);

            return response()->json($signed)->header('Cache-Control', 'no-store');
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }
    }

    public function complete(
        CompleteVideoUploadRequest $request,
        Video $video,
        VideoLibraryService $library,
        VideoStreamService $streams,
    ): JsonResponse {
        abort_unless($video->owner_type === $request->user('web')->getMorphClass()
            && (string) $video->owner_id === (string) $request->user('web')->getKey(), 404);
        $parts = array_map(fn (array $part): VideoUploadPart => new VideoUploadPart((int) $part['part_number'], $part['etag']), $request->validated('parts'));
        try {
            $completed = $library->complete($video->id, $request->user('web'), $parts);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }

        $streamStatus = null;
        try {
            $job = $streams->request($completed);
            $jobId = $job['jobId'] ?? null;
            $streamStatus = $job['status'] ?? null;

            if (! is_string($jobId) || $jobId === ''
                || ! is_string($streamStatus)
                || ! in_array($streamStatus, ['queued', 'processing', 'completed', 'failed'], true)) {
                throw new RuntimeException('The stream service returned an invalid job.');
            }

            $completed->forceFill(['stream_job_id' => $jobId])->save();
        } catch (Throwable $exception) {
            $streamStatus = null;
            Log::warning('Automatic video stream processing could not be started', [
                'video_id' => $completed->id,
                'exception' => $exception::class,
            ]);
        }

        return response()->json([
            'video_id' => $completed->id,
            'edit_url' => route('admin.videos.edit', $completed),
            'stream_status' => $streamStatus,
        ])
            ->header('Cache-Control', 'no-store');
    }

    public function destroy(Request $request, VideoUpload $upload, VideoLibraryService $library): JsonResponse
    {
        $this->authorizeUpload($request, $upload);
        abort_if($upload->video_id === null, 409);
        try {
            $library->delete($upload->video_id);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }

        return response()->json(['message' => 'Upload cancelled and draft removed.'])->header('Cache-Control', 'no-store');
    }

    private function authorizeUpload(Request $request, VideoUpload $upload): void
    {
        abort_unless($upload->owner_type === $request->user('web')->getMorphClass()
            && (string) $upload->owner_id === (string) $request->user('web')->getKey(), 404);
    }

    private function failure(Throwable $exception): JsonResponse
    {
        if ($exception instanceof ModelNotFoundException) {
            abort(404);
        }
        Log::warning('Video upload operation failed', $this->exceptionContext($exception));

        return response()->json(['message' => $exception instanceof LockTimeoutException
            ? 'Another operation is running for this video. Try again shortly.'
            : 'The upload operation did not finish. Check your connection and retry; expired uploads must be cancelled and restarted.'], 503)
            ->header('Cache-Control', 'no-store');
    }

    /** @return array<string, string|int|null> */
    private function exceptionContext(Throwable $exception): array
    {
        $context = [
            'exception' => $exception::class,
            'exception_code' => $exception->getCode(),
            'previous_exception' => $exception->getPrevious()?->class,
        ];

        if ($exception instanceof RuntimeException) {
            $context['failure_reason'] = match ($exception->getMessage()) {
                'The video upload has expired.' => 'upload_expired',
                'The video upload has an invalid size.' => 'invalid_upload_size',
                'The requested upload part is invalid.' => 'invalid_part_number',
                'The configured upload disk has no bucket.' => 'missing_storage_bucket',
                'Multipart uploads require an S3-compatible filesystem disk.' => 'unsupported_storage_disk',
                default => 'unclassified_runtime_exception',
            };
        }

        for ($cause = $exception; $cause !== null; $cause = $cause->getPrevious()) {
            if (! $cause instanceof AwsException) {
                continue;
            }

            $context['aws_error_code'] = $cause->getAwsErrorCode();
            $context['aws_status_code'] = $cause->getStatusCode();

            break;
        }

        return array_filter($context, fn (string|int|null $value): bool => $value !== null);
    }
}
