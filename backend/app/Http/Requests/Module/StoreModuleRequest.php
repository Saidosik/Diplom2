<?php

namespace App\Http\Requests\Module;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'alpha_dash', 'max:255', 'unique:modules,slug'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['off', 'visible'])],

            'course_id' => ['prohibited'],
            'lessons' => ['prohibited'],
        ];
    }
}
