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
            // unique restreint aux admins non supprimés → un e-mail/téléphone
            // libéré par un admin supprimé peut être réutilisé.
            'email'                    => ['required', 'email', 'max:150', Rule::unique('admins', 'email')->whereNull('deleted_at')],
            'role'                     => ['required', 'string', 'max:60'],
            'permissions'              => ['nullable', 'array'],
            'permissions.*'            => ['string', Rule::in(AdminPermission::KEYS)],
            'phone'                    => ['nullable', 'string', 'max:20', 'regex:/^[+]?[\d\s\-().]{7,}$/', Rule::unique('admins', 'phone')->whereNull('deleted_at')],
            'date_of_birth'            => ['nullable', 'date', 'before:today'],
            'place_of_birth'           => ['nullable', 'string', 'max:150'],
            'gender'                   => ['nullable', Rule::in(['male', 'female', 'other'])],
            'address_line'             => ['nullable', 'string', 'max:200'],
            'city'                     => ['nullable', 'string', 'max:100'],
            'id_document_type'         => ['nullable', Rule::in(['passport', 'national_id', 'driver_license'])],
            'id_document_number'       => ['nullable', 'string', 'max:50'],
            'id_document_path'         => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
            'id_documents'             => ['nullable', 'array', 'max:10'],
            'id_documents.*'           => ['file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
            'identity_photo'           => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'emergency_contact_name'   => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone'  => ['nullable', 'string', 'max:20', 'regex:/^[+]?[\d\s\-().]{7,}$/'],
            'job_title'                => ['nullable', 'string', 'max:80'],
            'hired_at'                 => ['nullable', 'date'],
            'bio'                      => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'                        => "Cet e-mail est déjà utilisé par un autre administrateur.",
            'phone.unique'                        => "Ce numéro de téléphone est déjà utilisé par un autre administrateur.",
            'permissions.*.in'                    => "Une ou plusieurs permissions sont invalides.",
            'phone.regex'                         => "Le numéro de téléphone n'est pas dans un format valide.",
            'emergency_contact_phone.regex'       => "Le numéro de téléphone du contact d'urgence n'est pas dans un format valide.",
            'date_of_birth.before'                => "La date de naissance doit être antérieure à aujourd'hui.",
        ];
    }
}
