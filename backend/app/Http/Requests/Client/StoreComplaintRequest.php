<?php

namespace App\Http\Requests\Client;

use App\Models\Complaint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category'       => ['required', Rule::in(array_keys(Complaint::CATEGORIES))],
            'custom_subject' => ['nullable', 'string', 'max:120', 'required_if:category,other'],
            'message'        => ['required', 'string', 'min:10', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'custom_subject.required_if' => "Merci de préciser l'objet de votre réclamation.",
            'message.min'                => 'Votre message doit contenir au moins 10 caractères.',
        ];
    }
}
