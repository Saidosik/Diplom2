<?php

namespace App\Http\Requests\Publication;

use App\Enums\PublicationBlockType;
use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(PublicationType::values())],
            'status' => ['required', 'string', Rule::in(PublicationStatus::values())],
            'title' => ['required', 'string', 'min:3', 'max:180'],
            'slug' => ['nullable', 'string', 'max:220'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'cover_image_path' => ['nullable', 'string', 'max:2048'],
            'reading_time_minutes' => ['nullable', 'integer', 'min:1', 'max:999'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['required', 'string', 'min:1', 'max:48'],
            'blocks' => ['required', 'array', 'min:1', 'max:80'],
            'blocks.*.type' => ['required', 'string', Rule::in(PublicationBlockType::values())],
            'blocks.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'blocks.*.content' => ['nullable', 'array'],
            'attachment_ids' => ['nullable', 'array', 'max:12'],
            'attachment_ids.*' => ['integer', 'exists:user_files,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Введите заголовок публикации.',
            'title.min' => 'Заголовок должен быть не короче 3 символов.',
            'blocks.required' => 'Добавьте хотя бы один блок публикации.',
            'blocks.min' => 'Добавьте хотя бы один блок публикации.',
        ];
    }
}
