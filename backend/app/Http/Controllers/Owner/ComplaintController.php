<?php

namespace App\Http\Controllers\Owner;

use App\Events\HotelBroadcast;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Complaint;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    use ApiResponse;

    /**
     * GET /owner/complaints
     * Liste paginée des réclamations, filtrable par statut.
     */
    public function index(Request $request): JsonResponse
    {
        $complaints = Complaint::with([
                'client:id,first_name,last_name,email',
                'admin:id,first_name,last_name',
                'reservation' => fn ($q) => $q->select('id', 'room_id', 'check_in_date', 'check_out_date')
                    ->with('room:id,room_number,room_type'),
            ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            // CASE plutôt que FIELD() : portable (MySQL + SQLite), donc testable.
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'handled' THEN 1 ELSE 2 END")
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Liste des réclamations.',
            'data'    => $complaints->map(fn ($c) => $this->format($c)),
            'meta'    => [
                'current_page' => $complaints->currentPage(),
                'last_page'    => $complaints->lastPage(),
                'per_page'     => $complaints->perPage(),
                'total'        => $complaints->total(),
            ],
        ]);
    }

    /**
     * POST /owner/complaints/{id}/handle
     * Marquer une réclamation comme traitée + réponse optionnelle au client.
     */
    public function handle(Request $request, int $id): JsonResponse
    {
        $complaint = Complaint::with(['client', 'reservation.room'])->find($id);

        if (! $complaint) {
            return $this->notFound('Réclamation introuvable.');
        }

        if ($complaint->status !== 'open') {
            return $this->error('Cette réclamation a déjà été traitée.', 422);
        }

        $validated = $request->validate([
            'response' => ['nullable', 'string', 'max:2000'],
        ]);

        $complaint->update([
            'status'         => 'handled',
            'admin_id'       => $request->user()->id,
            'admin_response' => $validated['response'] ?? null,
            'handled_at'     => now(),
        ]);

        $complaint->client?->notify(new \App\Notifications\ComplaintHandledNotification($complaint));

        HotelBroadcast::dispatch('complaint.handled', [
            'complaintId'   => $complaint->id,
            'reservationId' => $complaint->reservation_id,
            'clientId'      => $complaint->client_id,
        ]);

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_COMPLAINT_HANDLED,
            'Complaint',
            $complaint->id,
            ['status' => 'open'],
            ['status' => 'handled', 'category' => $complaint->category],
        );

        return $this->success(
            $this->format($complaint->fresh()->load([
                'client:id,first_name,last_name,email',
                'admin:id,first_name,last_name',
                'reservation' => fn ($q) => $q->select('id', 'room_id', 'check_in_date', 'check_out_date')
                    ->with('room:id,room_number,room_type'),
            ])),
            'Réclamation marquée comme traitée.'
        );
    }

    /* ── Helper ─────────────────────────────────────────────────── */
    private function format(Complaint $c): array
    {
        return [
            'id'             => $c->id,
            'category'       => $c->category,
            'category_label' => $c->categoryLabel(),
            'custom_subject' => $c->custom_subject,
            'message'        => $c->message,
            'status'         => $c->status,
            'status_label'   => $c->statusLabel(),
            'admin_response' => $c->admin_response,
            'handled_at'     => $c->handled_at?->toIso8601String(),
            'created_at'     => $c->created_at?->toIso8601String(),
            'reservation_id' => $c->reservation_id,
            'reservation'    => $c->reservation ? [
                'id'             => $c->reservation->id,
                'check_in_date'  => optional($c->reservation->check_in_date)->toDateString(),
                'check_out_date' => optional($c->reservation->check_out_date)->toDateString(),
                'room'           => $c->reservation->room ? [
                    'room_number' => $c->reservation->room->room_number,
                    'room_type'   => $c->reservation->room->room_type,
                ] : null,
            ] : null,
            'client' => $c->client ? [
                'id'         => $c->client->id,
                'first_name' => $c->client->first_name,
                'last_name'  => $c->client->last_name,
                'email'      => $c->client->email,
            ] : null,
            'admin' => $c->admin ? [
                'id'         => $c->admin->id,
                'first_name' => $c->admin->first_name,
                'last_name'  => $c->admin->last_name,
            ] : null,
        ];
    }
}
