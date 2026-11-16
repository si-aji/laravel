<?php

namespace App\Http\Requests\Web\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartVideoUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user('web') !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'request_id' => ['required', 'uuid'],
            'filename' => ['required', 'string', 'max:255', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! is_string($value)) {
                    return;
                }

                if (str_contains($value, '/') || str_contains($value, '\\') || preg_match('/[\x00-\x1F\x7F]/', $value)) {
                    $fail('The filename must not contain paths or control characters.');
                }
            }],
            'mime_type' => ['required', 'string', Rule::in(config('video-ondemand.uploads.allowed_mime_types'))],
            'size' => ['required', 'integer', 'min:1', 'max:'.((int) config('video-ondemand.uploads.max_size_kilobytes') * 1024)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
