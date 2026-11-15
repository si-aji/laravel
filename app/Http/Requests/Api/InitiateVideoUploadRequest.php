<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InitiateVideoUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maximumSize = (int) config('video-ondemand.uploads.max_size_kilobytes', 512000);
        $allowedMimeTypes = config('video-ondemand.uploads.allowed_mime_types', []);

        return [
            'filename' => ['required', 'string', 'min:1', 'max:255'],
            'mime_type' => ['required', 'string', 'in:'.implode(',', $allowedMimeTypes)],
            'size' => ['required', 'integer', 'min:1', 'max:'.($maximumSize * 1024)],
        ];
    }
}
