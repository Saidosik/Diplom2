<?php

namespace App\Http\Requests\LessonBlockContent;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLessonBlockContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['off', 'visible'])],
            'type' => [
                'required',
                Rule::in([
                    'text',
                    'heading',
                    'warning',
                    'important',
                    'clue',
                    'video',
                    'example',
                    'link',
                    'danger',
                ]),
            ],
            'content' => ['required', 'array'],

            'lesson_block_id' => ['prohibited'],
        ];
    }
}
