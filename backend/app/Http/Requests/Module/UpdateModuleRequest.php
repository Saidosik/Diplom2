<?php

namespace App\Http\Requests\Module;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $module = $this->route('module');

        return [
            'name' => ['sometimes', 'required', 'string', 'min:3', 'max:255'],
            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'alpha_dash',
                'max:255',
                Rule::unique('modules', 'slug')->ignore($module?->id),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['off', 'visible'])],

            'course_id' => ['prohibited'],
            'lessons' => ['prohibited'],
        ];
    }
}
