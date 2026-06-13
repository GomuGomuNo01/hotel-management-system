<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Complaint extends Model
{
    use HasFactory;

    /**
     * Catalogue des catégories de réclamation.
     * La clé 'other' impose la saisie d'un objet libre (custom_subject).
     */
    public const CATEGORIES = [
        'room_cleanliness' => 'Propreté de la chambre',
        'billing_issue'    => 'Problème de facturation',
        'payment_issue'    => 'Problème de paiement',
        'booking_error'    => 'Erreur de réservation',
        'amenities'        => 'Équipement défectueux',
        'staff_service'    => 'Accueil / service',
        'noise'            => 'Nuisances sonores',
        'other'            => 'Autre',
    ];

    protected $fillable = [
        'reservation_id',
        'client_id',
        'admin_id',
        'category',
        'custom_subject',
        'message',
        'status',
        'admin_response',
        'handled_at',
    ];

    protected function casts(): array
    {
        return [
            'handled_at' => 'datetime',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }

    /** Libellé lisible de la catégorie (ou l'objet libre pour 'other'). */
    public function categoryLabel(): string
    {
        if ($this->category === 'other') {
            return $this->custom_subject ?: 'Autre';
        }

        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            'open'    => 'Ouverte',
            'handled' => 'Traitée',
            default   => $this->status,
        };
    }
}
