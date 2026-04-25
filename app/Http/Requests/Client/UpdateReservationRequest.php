<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class UpdateReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_in_date'  => ['sometimes', 'date', 'after_or_equal:today'],
            'check_out_date' => ['sometimes', 'date', 'after:check_in_date'],
            'notes'          => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_in_date.after_or_equal' => "La date d'arrivée ne peut pas être dans le passé.",
            'check_out_date.after'         => "La date de départ doit être après la date d'arrivée.",
        ];
    }
}
