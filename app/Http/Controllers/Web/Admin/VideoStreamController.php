<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use PasukanVod\PasukanVod\Models\Video;
use PasukanVod\PasukanVod\Services\Videos\VideoStreamService;
use RuntimeException;
use Throwable;

class VideoStreamController extends Controller
{
    public function store(Video $video, VideoStreamService $streams): JsonResponse
    {
        abort_unless($video->status === 'ready', 409);

        try {
            $job = $streams->request($video);

            return $this->storeJob($video, $job);
        } catch (Throwable $exception) {
            return $this->failure($exception, $video);
        }
    }

    public function show(Video $video, VideoStreamService $streams): JsonResponse
    {
        $jobId = $video->stream_job_id;

        if (! is_string($jobId) || $jobId === '') {
            return response()->json(['message' => 'No stream job has been requested for this video.'], 404)
                ->header('Cache-Control', 'no-store');
        }

        try {
            $job = $streams->status($jobId);

            if (($job['jobId'] ?? null) !== $jobId || ! $this->validStatus($job['status'] ?? null)) {
                throw new RuntimeException('The video stream service returned a mismatched job.');
            }

            return response()->json(['job' => $this->presentJob($job, $video)])
                ->header('Cache-Control', 'no-store');
        } catch (Throwable $exception) {
            return $this->failure($exception, $video);
        }
    }

    /**
     * @param  array<string, mixed>  $job
     */
    private function storeJob(Video $video, array $job): JsonResponse
    {
        $jobId = $job['jobId'] ?? null;
        $status = $job['status'] ?? null;

        if (! is_string($jobId) || $jobId === '' || ! $this->validStatus($status)) {
            return response()->json(['message' => 'The stream service returned an invalid job.'], 502)
                ->header('Cache-Control', 'no-store');
        }

        $video->forceFill(['stream_job_id' => $jobId])->save();

        return response()->json(['job' => $this->presentJob($job, $video)])
            ->setStatusCode(in_array($status, ['queued', 'processing'], true) ? 202 : 200)
            ->header('Cache-Control', 'no-store');
    }

    /**
     * @param  array<string, mixed>  $job
     * @return array{jobId: string, status: string, manifestUrl?: string|null, error?: array<string, string>|null}
     */
    private function presentJob(array $job, Video $video): array
    {
        $presented = [
            'jobId' => (string) $job['jobId'],
            'status' => (string) $job['status'],
        ];

        if (($job['status'] ?? null) === 'completed' && is_string($job['manifestUrl'] ?? null)) {
            $presented['manifestUrl'] = route('admin.videos.playback.manifest', $video);
        }

        if (array_key_exists('error', $job)) {
            $presented['error'] = $job['error'];
        }

        return $presented;
    }

    private function failure(Throwable $exception, Video $video): JsonResponse
    {
        Log::warning('Video stream operation failed', [
            'video_id' => $video->id,
            'exception' => $exception::class,
        ]);

        return response()->json([
            'message' => 'The stream could not be reached. Check the stream service configuration and try again.',
        ], 503)->header('Cache-Control', 'no-store');
    }

    private function validStatus(mixed $status): bool
    {
        return is_string($status) && in_array($status, ['queued', 'processing', 'completed', 'failed'], true);
    }
}
