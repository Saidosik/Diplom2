<?php

namespace App\Http\Requests\Playground;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCodeSnippetRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:160'],
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
            'snippet_type' => ['nullable', Rule::in(['snippet', 'template', 'solution', 'note'])],
            'status' => ['nullable', Rule::in(['draft', 'active'])],
            'code' => ['required', 'string', 'min:1', 'max:' . config('community_security.playground.max_code_chars', 30000)],
            'stdin' => ['nullable', 'string', 'max:' . config('community_security.playground.max_stdin_chars', 8000)],
            'visibility' => ['required', Rule::in(['private', 'public'])],
        ];
    }
}
