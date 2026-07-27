<?php

namespace App\Http\Requests\Admin;

use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Ramène les équipements aux valeurs canoniques avant validation, afin de
     * tolérer les libellés historiques ("WiFi", "Mini-bar") sans échec.
     */
    protected function prepareForValidation(): void
    {
        if (is_array($this->input('amenities'))) {
            $this->merge(['amenities' => Room::normalizeAmenities($this->input('amenities'))]);
        }
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
            'amenities.*'     => ['string', Rule::in(Room::AMENITIES)],
            'images'          => ['nullable', 'array'],
            'images.*'        => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'room_number.unique'  => "Ce numéro de chambre est déjà utilisé.",
            'room_type.in'        => "Le type de chambre doit être simple, double, suite ou familiale.",
            'amenities.*.in'      => "Équipement invalide. Valeurs acceptées : wifi, climatisation, tv, minibar.",
            'images.*.image'      => "Le fichier doit être une image.",
            'images.*.mimes'      => "Format accepté : JPEG, PNG, JPG, WEBP.",
            'images.*.max'        => "Chaque image ne doit pas dépasser 5 Mo.",
        ];
    }
}
