<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\VideoPlaybackGrant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use PasukanVod\PasukanVod\Models\Video;
use PasukanVod\PasukanVod\Services\Videos\VideoStreamService;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class VideoPlaybackController extends Controller
{
    public function manifest(
        Request $request,
        Video $video,
        VideoStreamService $streams,
        VideoPlaybackGrant $grants,
    ): Response {
        $this->authorizePlayback($request, $video);

        if (! is_string($video->stream_job_id) || $video->stream_job_id === '') {
            abort(404);
        }

        try {
            $job = $streams->status($video->stream_job_id);
            if (($job['status'] ?? null) !== 'completed' || ! is_string($job['manifestUrl'] ?? null)) {
                abort(409, 'The stream is not ready for playback.');
            }

            $manifest = $streams->manifest($video->stream_job_id);

            return response($this->rewriteManifest($manifest, $video, $grants, 'master.m3u8'), 200, [
                'Content-Type' => 'application/vnd.apple.mpegurl',
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
                'Referrer-Policy' => 'no-referrer',
            ]);
        } catch (Throwable $exception) {
            if ($exception instanceof HttpException) {
                throw $exception;
            }

            Log::warning('Video playback manifest request failed', [
                'video_id' => $video->id,
                'exception' => $exception::class,
            ]);

            abort(503, 'The video stream is temporarily unavailable.');
        }
    }

    public function grant(Request $request, Video $video, VideoPlaybackGrant $grants): JsonResponse
    {
        $this->authorizePlayback($request, $video);
        if (! is_string($video->stream_job_id) || $video->stream_job_id === '') {
            abort(404);
        }

        try {
            return response()->json(['grant' => $grants->issue($video)])
                ->header('Cache-Control', 'private, no-store');
        } catch (Throwable $exception) {
            if ($exception instanceof HttpException) {
                throw $exception;
            }

            Log::warning('Video playback grant request failed', [
                'video_id' => $video->id,
                'exception' => $exception::class,
            ]);

            abort(503, 'Video playback authorization is temporarily unavailable.');
        }
    }

    private function authorizePlayback(Request $request, Video $video): void
    {
        abort_unless($video->status === 'ready', 404);

        if ($request->routeIs('guest.*')) {
            abort_unless($request->user('guests') !== null, 403);
            abort_unless($video->is_published, 404);

            return;
        }

        abort_unless($request->user('web') !== null, 403);
    }

    private function rewriteManifest(
        string $manifest,
        Video $video,
        VideoPlaybackGrant $grants,
        string $manifestPath,
    ): string {
        $manifestDirectory = dirname($manifestPath);
        $baseSegments = $manifestDirectory === '.' ? [] : explode('/', $manifestDirectory);

        $rewriteUri = function (string $uri) use ($video, $grants, $baseSegments): string {
            $uri = trim($uri);
            if ($uri === '' || str_starts_with($uri, '/') || str_contains($uri, '\\') || str_contains($uri, "\0")) {
                throw new RuntimeException('The HLS manifest contains an invalid asset path.');
            }

            $url = parse_url($uri);
            if ($url === false || isset($url['scheme']) || isset($url['host']) || isset($url['query']) || isset($url['fragment'])) {
                throw new RuntimeException('The HLS manifest contains an external asset URL.');
            }

            $segments = $baseSegments;
            foreach (explode('/', $url['path'] ?? '') as $segment) {
                if ($segment === '' || $segment === '.') {
                    continue;
                }
                if ($segment === '..') {
                    if ($segments === []) {
                        throw new RuntimeException('The HLS manifest contains an invalid asset path.');
                    }
                    array_pop($segments);

                    continue;
                }
                $segments[] = $segment;
            }

            if ($segments === []) {
                throw new RuntimeException('The HLS manifest contains an invalid asset path.');
            }

            return $grants->assetUrl($video, implode('/', $segments));
        };

        $lines = preg_split('/\r\n|\r|\n/', $manifest);
        if (! is_array($lines)) {
            throw new RuntimeException('The HLS manifest could not be parsed.');
        }

        foreach ($lines as &$line) {
            if ($line === '' || str_starts_with($line, '#')) {
                $line = preg_replace_callback(
                    '/URI="([^"]+)"/',
                    fn (array $matches): string => 'URI="'.$rewriteUri($matches[1]).'"',
                    $line,
                ) ?? $line;

                continue;
            }

            $line = $rewriteUri($line);
        }
        unset($line);

        return implode("\n", $lines);
    }
}
