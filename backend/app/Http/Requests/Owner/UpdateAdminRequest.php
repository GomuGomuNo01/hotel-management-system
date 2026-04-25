<?php

namespace App\Http\Requests\Owner;

use App\Models\AdminPermission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'    => ['sometimes', 'string', 'max:80'],
            'last_name'     => ['sometimes', 'string', 'max:80'],
            'email'         => ['sometimes', 'email', 'max:150', Rule::unique('admins', 'email')->ignore($this->route('admin'))],
            'role'          => ['sometimes', 'string', 'max:60'],
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(AdminPermission::KEYS)],
        ];
    }
}
