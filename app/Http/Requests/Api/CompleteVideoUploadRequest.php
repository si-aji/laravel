<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CompleteVideoUploadRequest extends FormRequest
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
        return [
            'parts' => ['required', 'array', 'min:1', 'max:10000'],
            'parts.*.part_number' => ['required', 'integer', 'min:1', 'max:10000'],
            'parts.*.etag' => ['required', 'string', 'min:1', 'max:1024'],
        ];
    }
}
