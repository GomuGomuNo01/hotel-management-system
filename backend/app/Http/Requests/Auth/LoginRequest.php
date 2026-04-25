<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
            'role'     => ['required', 'string', 'in:client,admin,owner'],
        ];
    }

    public function messages(): array
    {
        return [
            'role.in' => "Le rôle doit être client, admin ou owner.",
        ];
    }
}
