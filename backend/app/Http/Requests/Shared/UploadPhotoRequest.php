<?php

namespace App\Http\Requests\Shared;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Upload d'une photo de profil — règles communes aux espaces admin, owner et
 * client (le redimensionnement carré est fait côté serveur).
 */
class UploadPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'photo.required' => 'Veuillez sélectionner une image.',
            'photo.image'    => 'Le fichier doit être une image.',
            'photo.mimes'    => 'Formats acceptés : JPEG, PNG ou WebP.',
            'photo.max'      => "L'image ne doit pas dépasser 4 Mo.",
        ];
    }
}
