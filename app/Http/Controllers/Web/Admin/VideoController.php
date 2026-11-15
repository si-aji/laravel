<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\Admin\VideoMetadataRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use PasukanVod\PasukanVod\Data\VideoData;
use PasukanVod\PasukanVod\Models\Video;
use PasukanVod\PasukanVod\Models\VideoUpload;
use PasukanVod\PasukanVod\Services\Videos\VideoLibraryService;
use Throwable;

class VideoController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate(['search' => ['nullable', 'string', 'max:255']]);
        $search = $validated['search'] ?? '';
        $videos = Video::query()->with('owner')
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->where('title', 'like', '%'.$search.'%')->orWhere('original_filename', 'like', '%'.$search.'%');
            }))
            ->latest()->orderBy('id')->paginate(15)->withQueryString()
            ->through(fn (Video $video): array => $this->present($video));

        return Inertia::render('Admin/Videos/Index', [
            'videos' => $videos,
            'search' => $search,
            'notice' => $request->session()->get('notice'),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Admin/Videos/Upload', [
            'uploadPolicy' => [
                'max_bytes' => (int) config('video-ondemand.uploads.max_size_kilobytes') * 1024,
                'mime_types' => config('video-ondemand.uploads.allowed_mime_types'),
            ],
            'resumableUploads' => VideoUpload::query()->whereMorphedTo('owner', $request->user('web'))
                ->where('upload_expires_at', '>', now())->with('video')->latest()->get()
                ->filter(fn (VideoUpload $upload): bool => $upload->video?->status === 'uploading')
                ->map(fn (VideoUpload $upload): array => [
                    'id' => $upload->id,
                    'video_id' => $upload->video_id,
                    'filename' => $upload->original_filename,
                    'size' => $upload->size,
                    'mime_type' => $upload->mime_type,
                    'expires_at' => $upload->upload_expires_at->toIso8601String(),
                    'title' => $upload->video->title,
                    'description' => $upload->video->description,
                ])->values(),
        ]);
    }

    public function edit(Video $video): Response
    {
        return Inertia::render('Admin/Videos/Edit', [
            'video' => $this->present($video->load('owner')),
        ]);
    }

    public function update(VideoMetadataRequest $request, Video $video, VideoLibraryService $library): JsonResponse|RedirectResponse
    {
        try {
            $updated = $library->update($video->id, new VideoData($request->validated('title'), $request->validated('description')));
        } catch (Throwable $exception) {
            Log::warning('Video metadata update failed', ['video_id' => $video->id, 'exception' => $exception::class]);

            return $request->expectsJson()
                ? response()->json(['message' => 'Details could not be saved. Refresh the video and try again.'], 409)
                : back()->withErrors(['video' => 'Details could not be saved. Refresh the video and try again.']);
        }

        return $request->expectsJson()
            ? response()->json(['video' => $this->present($updated)])
            : back()->with('notice', 'Video details saved.');
    }

    public function destroy(Request $request, Video $video, VideoLibraryService $library): JsonResponse|RedirectResponse
    {
        try {
            $library->delete($video->id);
        } catch (Throwable $exception) {
            Log::warning('Video deletion failed', ['video_id' => $video->id, 'exception' => $exception::class]);

            return $request->expectsJson()
                ? response()->json(['message' => 'Deletion did not finish. The record has been kept so you can retry.'], 503)
                : back()->withErrors(['video' => 'Deletion did not finish. The record has been kept so you can retry.']);
        }

        $request->session()->flash('notice', 'Video and stored file deleted.');

        return $request->expectsJson()
            ? response()->json(['message' => 'Video and stored file deleted.'])
            : to_route('admin.videos.index')->with('notice', 'Video and stored file deleted.');
    }

    /** @return array<string, mixed> */
    private function present(Video $video): array
    {
        return [
            'id' => $video->id,
            'title' => $video->title,
            'description' => $video->description,
            'filename' => $video->original_filename,
            'mime_type' => $video->mime_type,
            'size' => $video->size,
            'status' => $video->status,
            'uploader' => $video->owner?->getAttribute('name'),
            'created_at' => $video->created_at->toIso8601String(),
            'edit_url' => route('admin.videos.edit', $video),
            'update_url' => route('admin.videos.update', $video),
            'delete_url' => route('admin.videos.destroy', $video),
        ];
    }
}
