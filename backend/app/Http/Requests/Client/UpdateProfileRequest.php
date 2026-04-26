<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof \App\Models\Client;
    }

    public function rules(): array
    {
        $clientId = $this->user()->id;

        return [
            'first_name'              => ['sometimes', 'required', 'string', 'max:80'],
            'last_name'               => ['sometimes', 'required', 'string', 'max:80'],
            'email'                   => ['sometimes', 'required', 'email', 'max:150', Rule::unique('clients', 'email')->ignore($clientId)],
            'phone'                   => ['sometimes', 'nullable', 'string', 'max:20'],
            'date_of_birth'           => ['sometimes', 'nullable', 'date', 'before:today'],
            'gender'                  => ['sometimes', 'nullable', Rule::in(['male', 'female', 'other'])],
            'nationality'             => ['sometimes', 'nullable', 'string', 'max:80'],
            'address_line'            => ['sometimes', 'nullable', 'string', 'max:200'],
            'city'                    => ['sometimes', 'nullable', 'string', 'max:100'],
            'postal_code'             => ['sometimes', 'nullable', 'string', 'max:20'],
            'country'                 => ['sometimes', 'nullable', 'string', 'max:100'],
            'id_document_type'        => ['sometimes', 'nullable', Rule::in(['passport', 'national_id', 'driver_license'])],
            'id_document_number'      => ['sometimes', 'nullable', 'string', 'max:50'],
            'emergency_contact_name'  => ['sometimes', 'nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'preferred_language'      => ['sometimes', 'nullable', 'string', 'size:2'],
            'preferences'             => ['sometimes', 'nullable', 'array'],
            'preferences.*'           => ['string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'       => 'Cette adresse e-mail est déjà utilisée.',
            'date_of_birth.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
        ];
    }
}
