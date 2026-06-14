<?php

namespace App\Http\Controllers\Client;

use App\Events\HotelBroadcast;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Complaint;
use App\Models\Reservation;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ComplaintController extends Controller
{
    /**
     * GET /complaints
     * Liste des réclamations du client connecté (récentes d'abord).
     */
    public function index(Request $request): JsonResponse
    {
        $complaints = Complaint::where('client_id', $request->user()->id)
            ->with([
                'reservation' => fn ($q) => $q->select('id', 'room_id', 'check_in_date', 'check_out_date')
                    ->with('room:id,room_number,room_type'),
                'admin:id,first_name,last_name',
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $complaints->map(fn ($c) => $this->format($c)),
        ]);
    }

    /**
     * GET /complaints/pending-count
     * Nombre de réclamations encore ouvertes - alimente le badge du menu client.
     */
    public function pendingCount(Request $request): JsonResponse
    {
        $count = Complaint::where('client_id', $request->user()->id)
            ->where('status', 'open')
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * POST /reservations/{id}/complaints
     * Créer une réclamation liée à une réservation du client.
     */
    public function store(Request $request, int $reservationId): JsonResponse
    {
        $validated = $request->validate([
            'category'       => ['required', Rule::in(array_keys(Complaint::CATEGORIES))],
            'custom_subject' => ['nullable', 'string', 'max:120', 'required_if:category,other'],
            'message'        => ['required', 'string', 'min:10', 'max:2000'],
        ], [
            'custom_subject.required_if' => "Merci de préciser l'objet de votre réclamation.",
            'message.min'                => 'Votre message doit contenir au moins 10 caractères.',
        ]);

        $client = $request->user();

        $reservation = Reservation::where('id', $reservationId)
            ->where('client_id', $client->id)
            ->first();

        if (! $reservation) {
            return response()->json(['message' => 'Réservation introuvable.'], 404);
        }

        // Réclamation possible uniquement pendant le séjour (statut check-in).
        // Avant l'arrivée : rien à signaler ; après le départ (check-out) : séjour clos.
        if ($reservation->status !== 'checked_in') {
            return response()->json([
                'message' => "Vous ne pouvez signaler un problème que pendant votre séjour, une fois votre arrivée (check-in) enregistrée.",
            ], 422);
        }

        // Une seule réclamation ouverte par réservation pour éviter les doublons.
        $alreadyOpen = Complaint::where('reservation_id', $reservation->id)
            ->where('status', 'open')
            ->exists();

        if ($alreadyOpen) {
            return response()->json([
                'message' => 'Une réclamation est déjà en cours pour cette réservation.',
            ], 422);
        }

        $complaint = Complaint::create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'category'       => $validated['category'],
            'custom_subject' => $validated['category'] === 'other'
                ? ($validated['custom_subject'] ?? null)
                : null,
            'message'        => $validated['message'],
            'status'         => 'open',
        ]);

        // Diffusion temps-réel - alerte les admins (badge + liste)
        HotelBroadcast::dispatch('complaint.created', [
            'complaintId'   => $complaint->id,
            'reservationId' => $complaint->reservation_id,
            'clientId'      => $complaint->client_id,
        ]);

        // Traçabilité - action client (admin_id null)
        AuditService::log(
            null,
            AuditLog::ACTION_COMPLAINT_CREATED,
            'Complaint',
            $complaint->id,
            null,
            [
                'category'       => $complaint->category,
                'reservation_id' => $complaint->reservation_id,
            ],
            $request,
        );

        return response()->json([
            'message'   => 'Votre réclamation a bien été transmise à notre service client.',
            'complaint' => $this->format(
                $complaint->load([
                    'reservation' => fn ($q) => $q->select('id', 'room_id', 'check_in_date', 'check_out_date')
                        ->with('room:id,room_number,room_type'),
                ])
            ),
        ], 201);
    }

    /**
     * DELETE /complaints/{id}
     * Le client peut annuler (supprimer) sa réclamation tant qu'elle est ouverte.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $complaint = Complaint::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->first();

        if (! $complaint) {
            return response()->json(['message' => 'Réclamation introuvable.'], 404);
        }

        $this->authorize('delete', $complaint);

        if ($complaint->status !== 'open') {
            return response()->json([
                'message' => 'Une réclamation déjà traitée ne peut plus être annulée.',
            ], 422);
        }

        $complaintId = $complaint->id;
        $category    = $complaint->category;
        $reservation = $complaint->reservation_id;

        $complaint->delete();

        // Traçabilité - annulation par le client (admin_id null)
        AuditService::log(
            null,
            AuditLog::ACTION_COMPLAINT_CANCELLED,
            'Complaint',
            $complaintId,
            ['category' => $category, 'reservation_id' => $reservation, 'status' => 'open'],
            null,
            $request,
        );

        return response()->json(['message' => 'Réclamation annulée.']);
    }

    /* ── Helper ─────────────────────────────────────────────────── */
    private function format(Complaint $c): array
    {
        return [
            'id'              => $c->id,
            'category'        => $c->category,
            'category_label'  => $c->categoryLabel(),
            'custom_subject'  => $c->custom_subject,
            'message'         => $c->message,
            'status'          => $c->status,
            'status_label'    => $c->statusLabel(),
            'admin_response'  => $c->admin_response,
            'handled_at'      => $c->handled_at?->toIso8601String(),
            'created_at'      => $c->created_at?->toIso8601String(),
            'reservation_id'  => $c->reservation_id,
            'reservation'     => $c->reservation ? [
                'id'             => $c->reservation->id,
                'check_in_date'  => optional($c->reservation->check_in_date)->toDateString(),
                'check_out_date' => optional($c->reservation->check_out_date)->toDateString(),
                'room'           => $c->reservation->room ? [
                    'room_number' => $c->reservation->room->room_number,
                    'room_type'   => $c->reservation->room->room_type,
                ] : null,
            ] : null,
        ];
    }
}
