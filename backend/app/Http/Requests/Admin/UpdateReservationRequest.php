<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Mise à jour d'une réservation par un admin : seule l'annulation est permise
 * côté statut (la confirmation passe par le flux de paiement), + note interne.
 */
class UpdateReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'in:cancelled'],
            'notes'  => ['nullable', 'string', 'max:2000'],
        ];
    }
}
