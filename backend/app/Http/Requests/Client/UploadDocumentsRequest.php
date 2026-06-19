<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

/** Upload de pièces justificatives par le client (1 à 10 fichiers, 25 Mo max). */
class UploadDocumentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'documents'   => ['required', 'array', 'min:1', 'max:10'],
            'documents.*' => ['file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:25600'], // 25 Mo / fichier
        ];
    }

    public function messages(): array
    {
        return [
            'documents.required' => 'Veuillez sélectionner au moins un document.',
            'documents.max'      => 'Vous ne pouvez pas envoyer plus de 10 documents à la fois.',
            'documents.*.mimes'  => 'Formats acceptés : JPEG, PNG, WebP ou PDF.',
            'documents.*.max'    => 'Chaque fichier ne doit pas dépasser 25 Mo.',
        ];
    }
}
