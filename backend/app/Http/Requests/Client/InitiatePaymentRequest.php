<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class InitiatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
            'provider'       => ['required', 'string', 'in:orange_ci,wave_ci'],
            // Accepte uniquement : chiffres, +, espaces, tirets, parenthèses, points
            'phone_number'   => ['required', 'string', 'max:20', 'regex:/^[+]?[\d\s\-().]{7,}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'provider.in'           => "Le fournisseur doit être orange_ci ou wave_ci.",
            'reservation_id.exists' => "La réservation n'existe pas.",
            'phone_number.regex'    => "Le numéro de téléphone est invalide (chiffres, +, espaces et tirets uniquement).",
        ];
    }
}
