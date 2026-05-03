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
            'first_name'               => ['required', 'string', 'max:80'],
            'last_name'                => ['required', 'string', 'max:80'],
            'email'                    => ['required', 'email', 'max:150', 'unique:admins,email'],
            'role'                     => ['required', 'string', 'max:60'],
            'permissions'              => ['nullable', 'array'],
            'permissions.*'            => ['string', Rule::in(AdminPermission::KEYS)],
            'phone'                    => ['nullable', 'string', 'max:20', 'regex:/^[+]?[\d\s\-().]{7,}$/'],
            'date_of_birth'            => ['nullable', 'date', 'before:today'],
            'place_of_birth'           => ['nullable', 'string', 'max:150'],
            'id_document_type'         => ['nullable', Rule::in(['passport', 'national_id', 'driver_license'])],
            'id_document_path'         => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
            'identity_photo'           => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'emergency_contact_name'   => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone'  => ['nullable', 'string', 'max:20', 'regex:/^[+]?[\d\s\-().]{7,}$/'],
            'job_title'                => ['nullable', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'                        => "Cet e-mail est déjà utilisé par un autre administrateur.",
            'permissions.*.in'                    => "Une ou plusieurs permissions sont invalides.",
            'phone.regex'                         => "Le numéro de téléphone n'est pas dans un format valide.",
            'emergency_contact_phone.regex'       => "Le numéro de téléphone du contact d'urgence n'est pas dans un format valide.",
            'date_of_birth.before'                => "La date de naissance doit être antérieure à aujourd'hui.",
        ];
    }
}
