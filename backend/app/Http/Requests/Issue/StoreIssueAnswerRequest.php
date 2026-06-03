<?php

namespace App\Http\Requests\Issue;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueBlockType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(IssueAnswerStatus::values())],
            'blocks' => ['required', 'array', 'min:1', 'max:40'],
            'blocks.*.type' => ['required', Rule::in(IssueBlockType::values())],
            'blocks.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'blocks.*.content' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'blocks.required' => 'Добавь хотя бы один блок ответа.',
            'blocks.min' => 'Ответ не может быть пустым.',
        ];
    }
}
