<?php

namespace App\Services;

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

class AdminVideoLibrary
{
    public function __construct(
        private readonly VideoService $videos,
        private readonly VideoMultipartUploadService $uploads,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return $this->run(fn (): JsonResponse => response()->json([
            'data' => $this->videos->allForOwner($this->ownerId($request))
                ->map(fn (Video $video): array => $this->videoData($video))
                ->values(),
        ]));
    }

    public function initiate(InitiateVideoUploadRequest $request): JsonResponse
    {
        return $this->run(fn (): JsonResponse => response()->json([
            'data' => $this->uploads->initiate(
                ownerId: $this->ownerId($request),
                originalFilename: $request->validated('filename'),
                mimeType: $request->validated('mime_type'),
                size: (int) $request->validated('size'),
            ),
        ], 201));
    }

    public function signPart(SignVideoUploadPartRequest $request, string $uploadId): JsonResponse
    {
        return $this->run(fn (): JsonResponse => response()->json([
            'data' => $this->uploads->signPart(
                $uploadId,
                $this->ownerId($request),
                (int) $request->validated('part_number'),
            ),
        ]));
    }

    public function resume(Request $request, string $uploadId): JsonResponse
    {
        return $this->run(fn (): JsonResponse => response()->json([
            'data' => $this->uploads->resume($uploadId, $this->ownerId($request)),
        ]));
    }

    public function complete(Request $request, string $uploadId): JsonResponse
    {
        return $this->run(function () use ($request, $uploadId): JsonResponse {
            $ownerId = $this->ownerId($request);
            $parts = $request->input('parts', []);
            if (! is_array($parts) || $parts === []) {
                return response()->json([
                    'message' => 'The upload has no completed parts to finish. Resume the upload and try again.',
                ], 422);
            }

            if (! collect($parts)->every(fn (mixed $part): bool => is_array($part)
                && isset($part['part_number'], $part['etag'])
                && is_numeric($part['part_number'])
                && is_string($part['etag']))) {
                return response()->json([
                    'message' => 'The uploaded part details are invalid. Resume the upload and try again.',
                ], 422);
            }

            $parts = array_map(
                fn (array $part): VideoUploadPart => new VideoUploadPart(
                    (int) $part['part_number'],
                    $part['etag'],
                ),
                $parts,
            );

            $video = $this->uploads->complete($uploadId, $ownerId, $parts);

            return response()->json(['data' => $this->videoData($video)], 201);
        });
    }

    public function abort(Request $request, string $uploadId): JsonResponse
    {
        return $this->run(function () use ($request, $uploadId): JsonResponse {
            $this->uploads->abort($uploadId, $this->ownerId($request));

            return response()->json(['message' => 'Upload cancelled.']);
        });
    }

    public function update(UpdateVideoRequest $request, string $videoId): JsonResponse
    {
        return $this->run(function () use ($request, $videoId): JsonResponse {
            $data = $request->validated();
            $video = $this->videos->updateForOwner(
                $videoId,
                $this->ownerId($request),
                new VideoData(
                    title: $data['title'] ?? null,
                    description: $data['description'] ?? null,
                ),
            );

            if ($video === null) {
                return response()->json(['message' => 'Video not found.'], 404);
            }

            return response()->json(['data' => $this->videoData($video)]);
        });
    }

    public function destroy(Request $request, string $videoId): JsonResponse
    {
        return $this->run(function () use ($request, $videoId): JsonResponse {
            if (! $this->videos->deleteForOwner($videoId, $this->ownerId($request))) {
                return response()->json(['message' => 'Video not found.'], 404);
            }

            return response()->json(['message' => 'Video deleted.']);
        });
    }

    private function run(callable $callback): JsonResponse
    {
        try {
            return $callback();
        } catch (Throwable $exception) {
            return $this->errorResponse($exception);
        }
    }

    private function errorResponse(Throwable $exception): JsonResponse
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
                : $this->rootCause($exception)->getMessage(),
            'reference' => $reference,
        ], 500);
    }

    private function rootCause(Throwable $exception): Throwable
    {
        while ($exception->getPrevious() !== null) {
            $exception = $exception->getPrevious();
        }

        return $exception;
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
}
