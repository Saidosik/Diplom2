<?php

namespace App\Http\Requests\LessonBlock;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLessonBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $lessonBlock = $this->route('lessonBlock');

        return [
            'name' => ['sometimes', 'required', 'string', 'min:3', 'max:255'],
            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'alpha_dash',
                'max:255',
                Rule::unique('lesson_blocks', 'slug')->ignore($lessonBlock?->id),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['off', 'visible'])],

            'type' => ['prohibited'],
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

    public function messages(): array
    {
        return [
            'type.prohibited' => 'Тип lesson block нельзя менять после создания. Создай новый блок нужного типа.',
        ];
    }
}