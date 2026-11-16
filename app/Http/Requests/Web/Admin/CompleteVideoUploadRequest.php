<?php

namespace App\Http\Requests\Web\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CompleteVideoUploadRequest extends FormRequest
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
            'parts' => ['required', 'array', 'min:1', 'max:10000'],
            'parts.*' => ['required', 'array:part_number,etag'],
            'parts.*.part_number' => ['required', 'integer', 'min:1', 'max:10000', 'distinct'],
            'parts.*.etag' => ['required', 'string', 'max:255'],
        ];
    }
}
