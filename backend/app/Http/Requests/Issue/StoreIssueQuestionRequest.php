<?php

namespace App\Http\Requests\Issue;

use App\Enums\IssueBlockType;
use App\Enums\IssueQuestionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:6', 'max:180'],
            'slug' => ['nullable', 'string', 'max:220'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'status' => ['required', Rule::in(IssueQuestionStatus::values())],
            'tags' => ['nullable', 'array', 'max:8'],
            'tags.*' => ['string', 'min:2', 'max:40'],
            'blocks' => ['required', 'array', 'min:1', 'max:50'],
            'blocks.*.type' => ['required', Rule::in(IssueBlockType::values())],
            'blocks.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'blocks.*.content' => ['nullable', 'array'],
            'attachment_ids' => ['nullable', 'array', 'max:12'],
            'attachment_ids.*' => ['integer', 'exists:user_files,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Укажи заголовок вопроса.',
            'title.min' => 'Заголовок должен быть понятным и содержать минимум :min символов.',
            'blocks.required' => 'Добавь хотя бы один блок с описанием проблемы.',
        ];
    }
}
