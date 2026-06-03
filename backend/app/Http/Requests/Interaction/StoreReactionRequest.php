<?php

namespace App\Http\Requests\Interaction;

use App\Models\Reaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReactionRequest extends FormRequest
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
            'type' => ['required', 'string', Rule::in(Reaction::types())],
        ];
    }
}
