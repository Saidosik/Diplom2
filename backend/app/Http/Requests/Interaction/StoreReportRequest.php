<?php

namespace App\Http\Requests\Interaction;

use App\Models\Report;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReportRequest extends FormRequest
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
            'reportable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer', 'comment', 'user'])],
            'reportable_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', Rule::in(Report::reasons())],
            'details' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
