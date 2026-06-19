<?php

namespace App\Http\Requests\Shared;

use Illuminate\Foundation\Http\FormRequest;

/** Refus d'un remboursement — motif obligatoire (admin & owner). */
class RejectRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notes' => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'notes.required' => 'Un motif de refus est obligatoire.',
        ];
    }
}
