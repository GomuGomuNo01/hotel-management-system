<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rating'  => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'rating.required' => 'Veuillez attribuer une note.',
            'rating.min'      => 'La note doit être comprise entre 1 et 5.',
            'rating.max'      => 'La note doit être comprise entre 1 et 5.',
        ];
    }
}
