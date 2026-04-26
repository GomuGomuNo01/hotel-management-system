<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'room_number'     => ['sometimes', 'string', 'max:20', Rule::unique('rooms', 'room_number')->ignore($this->route('room'))],
            'room_type'       => ['sometimes', 'string', 'in:simple,double,suite,familiale'],
            'price_per_night' => ['sometimes', 'numeric', 'min:0'],
            'capacity'        => ['sometimes', 'integer', 'min:1', 'max:10'],
            'status'          => ['sometimes', 'string', 'in:available,occupied,maintenance,reserved'],
            'description'     => ['nullable', 'string'],
            'amenities'       => ['nullable', 'array'],
            'amenities.*'     => ['string', 'in:wifi,climatisation,tv,minibar'],
            'images'          => ['nullable', 'array'],
            'images.*'        => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'amenities.*.in' => "Équipement invalide. Valeurs acceptées : wifi, climatisation, tv, minibar.",
            'images.*.image' => "Le fichier doit être une image.",
            'images.*.mimes' => "Format accepté : JPEG, PNG, JPG, WEBP.",
            'images.*.max'   => "Chaque image ne doit pas dépasser 5 Mo.",
        ];
    }
}
