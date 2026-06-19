<?php

namespace App\Http\Requests\Shared;

use Illuminate\Foundation\Http\FormRequest;

/** Traitement d'une réclamation — réponse au client facultative (admin & owner). */
class HandleComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
