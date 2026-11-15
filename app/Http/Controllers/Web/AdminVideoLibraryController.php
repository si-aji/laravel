<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\InitiateVideoUploadRequest;
use App\Http\Requests\Api\SignVideoUploadPartRequest;
use App\Http\Requests\Api\UpdateVideoRequest;
use App\Services\AdminVideoLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVideoLibraryController extends Controller
{
    public function __construct(private readonly AdminVideoLibrary $library) {}

    public function index(Request $request): JsonResponse
    {
        return $this->library->index($request);
    }

    public function initiate(InitiateVideoUploadRequest $request): JsonResponse
    {
        return $this->library->initiate($request);
    }

    public function signPart(SignVideoUploadPartRequest $request, string $uploadId): JsonResponse
    {
        return $this->library->signPart($request, $uploadId);
    }

    public function resume(Request $request, string $uploadId): JsonResponse
    {
        return $this->library->resume($request, $uploadId);
    }

    public function complete(Request $request, string $uploadId): JsonResponse
    {
        return $this->library->complete($request, $uploadId);
    }

    public function abort(Request $request, string $uploadId): JsonResponse
    {
        return $this->library->abort($request, $uploadId);
    }

    public function update(UpdateVideoRequest $request, string $videoId): JsonResponse
    {
        return $this->library->update($request, $videoId);
    }

    public function destroy(Request $request, string $videoId): JsonResponse
    {
        return $this->library->destroy($request, $videoId);
    }
}
