<?php

namespace App\Http\Requests\Interaction;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DestroyReactionRequest extends FormRequest
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
            'reactable_type' => ['required', 'string', Rule::in(['publication', 'issue_question'])],
            'reactable_id' => ['required', 'integer', 'min:1'],
        ];
    }
}
