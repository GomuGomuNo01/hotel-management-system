<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'            => ['required', 'string', 'max:80'],
            'last_name'             => ['required', 'string', 'max:80'],
            'email'                 => ['required', 'email', 'max:150', 'unique:clients,email'],
            'phone'                 => ['nullable', 'string', 'max:20'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
            'nationality'           => ['nullable', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'    => "Cette adresse e-mail est déjà utilisée.",
            'password.min'    => "Le mot de passe doit contenir au moins 8 caractères.",
            'password.confirmed' => "Les mots de passe ne correspondent pas.",
        ];
    }
}
