<?php

namespace App\Services;

use PasukanVod\PasukanVod\Models\Video;
use RuntimeException;

final class VideoPlaybackGrant
{
    public function issue(Video $video): string
    {
        $jobId = $video->stream_job_id;
        $secret = (string) config('video-ondemand.stream.playback_grant_secret');
        $ttl = (int) config('video-ondemand.stream.playback_grant_ttl_seconds', 300);

        if (! is_string($jobId) || $jobId === '') {
            throw new RuntimeException('The video does not have a stream job.');
        }
        if (strlen($secret) < 32 || str_starts_with($secret, 'replace-')) {
            throw new RuntimeException('Playback grant signing is not configured.');
        }
        if ($ttl < 1 || $ttl > 300) {
            throw new RuntimeException('The playback grant lifetime is invalid.');
        }

        $payload = json_encode([
            'aud' => 'vod-playback',
            'exp' => now()->timestamp + $ttl,
            'job_id' => $jobId,
            'video_id' => (string) $video->id,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $encodedPayload = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $encodedPayload, $secret);

        return $encodedPayload.'.'.$signature;
    }

    public function assetUrl(Video $video, string $assetPath): string
    {
        $jobId = $video->stream_job_id;
        $baseUrl = rtrim((string) config('video-ondemand.stream.public_endpoint'), '/');
        $parsedUrl = parse_url($baseUrl);

        if (
            ! is_string($jobId)
            || $jobId === ''
            || ! is_array($parsedUrl)
            || ! in_array($parsedUrl['scheme'] ?? null, ['http', 'https'], true)
            || ! is_string($parsedUrl['host'] ?? null)
            || $assetPath === ''
            || str_contains($assetPath, '\\')
            || str_contains($assetPath, "\0")
            || collect(explode('/', $assetPath))->contains(fn (string $segment): bool => in_array($segment, ['', '.', '..'], true))
        ) {
            throw new RuntimeException('The public playback endpoint or asset path is invalid.');
        }

        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $assetPath)));

        return $baseUrl.'/v1/playback/'.rawurlencode($jobId).'/assets/'.$encodedPath;
    }
}
