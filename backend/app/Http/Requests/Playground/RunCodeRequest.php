<?php

namespace App\Http\Requests\Playground;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RunCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'language' => [
                'required',
                'string',
                Rule::in([
                    'javascript', 'js', 'node', 'nodejs',
                    'python', 'python3', 'py',
                    'php', 'php8',
                    'cpp', 'c++', 'g++',
                    'csharp', 'c#', 'cs', 'dotnet',
                ]),
            ],
            'code' => ['required', 'string', 'min:1', 'max:' . config('community_security.playground.max_code_chars', 30000)],
            'stdin' => ['nullable', 'string', 'max:' . config('community_security.playground.max_stdin_chars', 8000)],
            'snippet_id' => ['nullable', 'integer', 'exists:code_snippets,id'],
            'save' => ['sometimes', 'boolean'],
            'snippet_type' => ['nullable', Rule::in(['snippet', 'template', 'solution', 'note'])],
            'snippet_status' => ['nullable', Rule::in(['draft', 'active'])],
            'title' => ['nullable', 'string', 'max:160'],
            'visibility' => ['nullable', Rule::in(['private', 'public'])],
        ];
    }
}
