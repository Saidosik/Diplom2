<?php

namespace App\Http\Requests\LessonBlock;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLessonBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:3', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'alpha_dash', 'max:255', 'unique:lesson_blocks,slug'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['off', 'visible'])],
            'type' => ['bail', 'required', Rule::in(['theory', 'test', 'coding_task'])],

            'lesson_id' => ['prohibited'],
            'progress' => ['prohibited'],
            'test' => ['prohibited'],
            'tests' => ['prohibited'],
            'coding_task' => ['prohibited'],
            'codingTask' => ['prohibited'],
            'contents' => ['prohibited'],
            'comments' => ['prohibited'],
        ];
    }
}