<?php

namespace App\Http\Controllers\Web\Guest;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PasukanVod\PasukanVod\Models\Video;

class GuestVideoController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);
        $search = $validated['search'] ?? '';

        $videos = Video::query()
            ->where('status', 'ready')
            ->where('is_published', true)
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->where('title', 'like', '%'.$search.'%')
                    ->orWhere('original_filename', 'like', '%'.$search.'%');
            }))
            ->latest()
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Video $video): array => [
                'id' => $video->id,
                'title' => $video->title ?: $video->original_filename,
                'description' => $video->description,
                'created_at' => $video->created_at->toIso8601String(),
                'watch_url' => route('guest.videos.show', $video),
            ]);

        return Inertia::render('Guest/Videos/Index', [
            'videos' => $videos,
            'search' => $search,
        ]);
    }

    public function show(Video $video): Response
    {
        abort_unless($video->status === 'ready' && $video->is_published, 404);

        return Inertia::render('Guest/Videos/Show', [
            'video' => [
                'id' => $video->id,
                'title' => $video->title ?: $video->original_filename,
                'description' => $video->description,
                'filename' => $video->original_filename,
                'playback_url' => route('guest.videos.playback.manifest', $video),
                'playback_grant_url' => route('guest.videos.playback.grant', $video),
                'library_url' => route('guest.videos.index'),
            ],
        ]);
    }
}
