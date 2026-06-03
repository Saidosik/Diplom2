<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }


    protected function prepareForValidation(): void
    {
        $nullableFields = [
            'headline',
            'bio',
            'location',
            'website_url',
            'github_url',
        ];

        foreach ($nullableFields as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email:rfc,dns',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'headline' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'location' => ['nullable', 'string', 'max:120'],
            'website_url' => ['nullable', 'url', 'max:255'],
            'github_url' => ['nullable', 'url', 'max:255'],
            'profile_visibility' => ['sometimes', Rule::in(['public', 'private'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Введите имя пользователя.',
            'name.min' => 'Имя должно содержать минимум 2 символа.',
            'email.required' => 'Введите email.',
            'email.email' => 'Введите корректный email.',
            'email.unique' => 'Пользователь с таким email уже существует.',
            'headline.max' => 'Короткое описание не должно быть длиннее 120 символов.',
            'bio.max' => 'Описание профиля не должно быть длиннее 1000 символов.',
            'website_url.url' => 'Введите корректную ссылку на сайт.',
            'github_url.url' => 'Введите корректную ссылку на GitHub.',
            'profile_visibility.in' => 'Выберите публичный или закрытый профиль.',
        ];
    }
}
