<?php

namespace App\Notifications;

use App\Models\Review;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - confirmation qu'un avis a été
 * soumis (ou mis à jour) par le client.
 */
class ReviewSubmittedNotification extends Notification
{
    public function __construct(public Review $review, public bool $updated = false) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'category'       => 'review',
            'title'          => $this->updated ? 'Avis mis à jour' : 'Avis enregistré',
            'message'        => $this->updated
                ? "Votre avis ({$this->review->rating}/5) a bien été mis à jour. Merci !"
                : "Merci ! Votre avis ({$this->review->rating}/5) a bien été enregistré.",
            'reservation_id' => $this->review->reservation_id,
            'review_id'      => $this->review->id,
            'action'         => ['type' => 'reviews'],
        ];
    }
}
