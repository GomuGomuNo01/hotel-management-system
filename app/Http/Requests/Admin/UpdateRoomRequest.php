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
            'amenities.*'     => ['string'],
        ];
    }
}
