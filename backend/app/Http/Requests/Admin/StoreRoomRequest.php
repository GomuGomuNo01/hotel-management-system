<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'room_number'     => ['required', 'string', 'max:20', 'unique:rooms,room_number'],
            'room_type'       => ['required', 'string', 'in:simple,double,suite,familiale'],
            'price_per_night' => ['required', 'numeric', 'min:0'],
            'capacity'        => ['required', 'integer', 'min:1', 'max:10'],
            'status'          => ['sometimes', 'string', 'in:available,occupied,maintenance,reserved'],
            'description'     => ['nullable', 'string'],
            'amenities'       => ['nullable', 'array'],
            'amenities.*'     => ['string'],
        ];
    }

    public function messages(): array
    {
        return [
            'room_number.unique' => "Ce numéro de chambre est déjà utilisé.",
            'room_type.in'       => "Le type de chambre doit être simple, double, suite ou familiale.",
        ];
    }
}
