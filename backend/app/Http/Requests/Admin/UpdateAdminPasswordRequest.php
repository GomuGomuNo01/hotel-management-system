<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateAdminPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof \App\Models\Admin;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ];
    }

    public function messages(): array
    {
        return [
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
            'password.min'       => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.letters'   => 'Le mot de passe doit contenir au moins une lettre.',
            'password.mixed'     => 'Le mot de passe doit contenir des majuscules et des minuscules.',
            'password.numbers'   => 'Le mot de passe doit contenir au moins un chiffre.',
            'password.symbols'   => 'Le mot de passe doit contenir au moins un caractère spécial.',
        ];
    }
}
