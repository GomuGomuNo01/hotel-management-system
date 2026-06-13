<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'first_name'            => ['required', 'string', 'max:80'],
            'last_name'             => ['required', 'string', 'max:80'],
            'email'                 => ['required', 'email', 'max:150', 'unique:clients,email'],
            'phone'                 => ['nullable', 'string', 'max:20'],
            'password'              => ['required', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'       => 'Cette adresse e-mail est déjà utilisée.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
            'password.min'       => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.letters'   => 'Le mot de passe doit contenir au moins une lettre.',
            'password.mixed'     => 'Le mot de passe doit contenir des majuscules et des minuscules.',
            'password.numbers'   => 'Le mot de passe doit contenir au moins un chiffre.',
            'password.symbols'   => 'Le mot de passe doit contenir au moins un caractère spécial.',
        ];
    }
}
