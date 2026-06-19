<?php

namespace App\Http\Requests\Owner;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Mise à jour du profil propriétaire (nom complet + e-mail unique). */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:100'],
            'email'     => [
                'required', 'email', 'max:150',
                Rule::unique('owners', 'email')->ignore($this->user()->id),
            ],
        ];
    }
}
