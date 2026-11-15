<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CompleteVideoUploadRequest;
use App\Http\Requests\Api\InitiateVideoUploadRequest;
use App\Http\Requests\Api\SignVideoUploadPartRequest;
use App\Http\Requests\Api\UpdateVideoRequest;
use App\Models\Guest;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use PasukanVod\PasukanVod\Data\VideoData;
use PasukanVod\PasukanVod\Data\VideoUploadPart;
use PasukanVod\PasukanVod\Models\Video;
use PasukanVod\PasukanVod\Services\Videos\VideoMultipartUploadService;
use PasukanVod\PasukanVod\Services\Videos\VideoService;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class VideoUploadController extends Controller
{
    public function __construct(
        private readonly VideoService $videos,
        private readonly VideoMultipartUploadService $uploads,
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $videos = $this->videos->allForOwner($this->ownerId($request))
                ->map(fn (Video $video): array => $this->videoData($video))
                ->values();
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        return response()->json(['data' => $videos]);
    }

    public function initiate(InitiateVideoUploadRequest $request): JsonResponse
    {
        try {
            $session = $this->uploads->initiate(
                ownerId: $this->ownerId($request),
                originalFilename: $request->validated('filename'),
                mimeType: $request->validated('mime_type'),
                size: (int) $request->validated('size'),
            );
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        return response()->json(['data' => $session], 201);
    }

    public function signPart(
        SignVideoUploadPartRequest $request,
        string $uploadId,
    ): JsonResponse {
        try {
            $part = $this->uploads->signPart(
                $uploadId,
                $this->ownerId($request),
                (int) $request->validated('part_number'),
            );
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        return response()->json(['data' => $part]);
    }

    public function resume(Request $request, string $uploadId): JsonResponse
    {
        try {
            $upload = $this->uploads->resume($uploadId, $this->ownerId($request));
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        return response()->json(['data' => $upload]);
    }

    public function complete(
        CompleteVideoUploadRequest $request,
        string $uploadId,
    ): JsonResponse {
        $parts = array_map(
            fn (array $part): VideoUploadPart => new VideoUploadPart(
                (int) $part['part_number'],
                $part['etag'],
            ),
            $request->validated('parts'),
        );
        try {
            $video = $this->uploads->complete($uploadId, $this->ownerId($request), $parts);
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        return response()->json(['data' => $this->videoData($video)], 201);
    }

    public function abort(Request $request, string $uploadId): JsonResponse
    {
        try {
            $this->uploads->abort($uploadId, $this->ownerId($request));
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        return response()->json(['message' => 'Upload cancelled.']);
    }

    public function update(UpdateVideoRequest $request, string $videoId): JsonResponse
    {
        $data = $request->validated();
        try {
            $video = $this->videos->updateForOwner(
                $videoId,
                $this->ownerId($request),
                new VideoData(
                    title: $data['title'] ?? null,
                    description: $data['description'] ?? null,
                ),
            );
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        if ($video === null) {
            return response()->json(['message' => 'Video not found.'], 404);
        }

        return response()->json(['data' => $this->videoData($video)]);
    }

    public function destroy(Request $request, string $videoId): JsonResponse
    {
        try {
            $deleted = $this->videos->deleteForOwner($videoId, $this->ownerId($request));
        } catch (Throwable $exception) {
            return $this->serviceError($exception);
        }

        if (! $deleted) {
            return response()->json(['message' => 'Video not found.'], 404);
        }

        return response()->json(['message' => 'Video deleted.']);
    }

    private function ownerId(Request $request): string
    {
        $accountType = $request->user() instanceof Guest ? 'guest' : 'admin';

        return $accountType.':'.$request->user()->getAuthIdentifier();
    }

    /**
     * @return array<string, mixed>
     */
    private function videoData(Video $video): array
    {
        return [
            'id' => $video->getKey(),
            'title' => $video->title,
            'description' => $video->description,
            'original_filename' => $video->original_filename,
            'mime_type' => $video->mime_type,
            'size' => (int) $video->size,
            'status' => $video->status,
            'created_at' => $video->created_at?->toIso8601String(),
        ];
    }

    public function handleRouteError(Throwable $exception): JsonResponse
    {
        return $this->serviceError($exception);
    }

    private function serviceError(Throwable $exception): JsonResponse
    {
        if ($exception instanceof ModelNotFoundException) {
            return response()->json(['message' => 'Upload or video not found.'], 404);
        }

        if ($exception instanceof HttpExceptionInterface) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'The video request could not be completed.',
            ], $exception->getStatusCode());
        }

        $reference = (string) Str::uuid();

        Log::error('Video library request failed.', [
            'reference' => $reference,
            'exception' => $exception,
        ]);

        return response()->json([
            'message' => app()->environment('production')
                ? 'The video request could not be completed.'
                : $exception->getMessage(),
            'reference' => $reference,
        ], 500);
    }
}
