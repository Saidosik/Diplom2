<?php

namespace App\Http\Requests\Interaction;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'commentable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer'])],
            'commentable_id' => ['required', 'integer', 'min:1'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
            'content' => ['required', 'string', 'min:2', 'max:5000'],
        ];
    }
}
