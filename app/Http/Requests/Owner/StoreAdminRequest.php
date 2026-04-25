<?php

namespace App\Http\Requests\Owner;

use App\Models\AdminPermission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'  => ['required', 'string', 'max:80'],
            'last_name'   => ['required', 'string', 'max:80'],
            'email'       => ['required', 'email', 'max:150', 'unique:admins,email'],
            'role'        => ['required', 'string', 'max:60'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(AdminPermission::KEYS)],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'        => "Cet e-mail est déjà utilisé par un autre administrateur.",
            'permissions.*.in'    => "Une ou plusieurs permissions sont invalides.",
        ];
    }
}
