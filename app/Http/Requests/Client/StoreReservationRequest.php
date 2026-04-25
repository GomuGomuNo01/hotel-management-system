<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'room_id'        => ['required', 'integer', 'exists:rooms,id'],
            'check_in_date'  => ['required', 'date', 'after_or_equal:today'],
            'check_out_date' => ['required', 'date', 'after:check_in_date'],
            'notes'          => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_in_date.after_or_equal' => "La date d'arrivée ne peut pas être dans le passé.",
            'check_out_date.after'         => "La date de départ doit être après la date d'arrivée.",
            'room_id.exists'               => "La chambre sélectionnée n'existe pas.",
        ];
    }
}
