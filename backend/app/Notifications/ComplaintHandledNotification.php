<?php

namespace App\Notifications;

use App\Models\Complaint;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - le service client a traité
 * la réclamation du client.
 */
class ComplaintHandledNotification extends Notification
{
    public function __construct(public Complaint $complaint) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'category'       => 'complaint',
            'title'          => 'Réclamation traitée',
            'message'        => 'Le service client a répondu à votre réclamation.'
                . ($this->complaint->admin_response ? " Réponse : {$this->complaint->admin_response}" : ''),
            'reservation_id' => $this->complaint->reservation_id,
            'complaint_id'   => $this->complaint->id,
            'action'         => ['type' => 'support'],
        ];
    }
}
