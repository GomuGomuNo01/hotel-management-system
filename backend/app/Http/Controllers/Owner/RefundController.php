<?php

namespace App\Http\Controllers\Owner;

use App\Events\HotelBroadcast;
use App\Http\Controllers\Controller;
use App\Http\Requests\Shared\ApproveRefundRequest;
use App\Http\Requests\Shared\RejectRefundRequest;
use App\Models\AuditLog;
use App\Models\Refund;
use App\Notifications\RefundProcessedNotification;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use App\Helpers\DocumentRef;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RefundController extends Controller
{
    use ApiResponse;

    /* ─────────────────────────────────────────────────────────────
     | GET /owner/refunds
     | Liste paginée des demandes de remboursement.
     | Filtrable par statut.
     ──────────────────────────────────────────────────────────── */
    public function index(Request $request): JsonResponse
    {
        $refunds = Refund::with(['client', 'admin', 'reservation.room'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = trim($request->search);
                $q->whereHas('client', fn ($c) => $c->where(function ($c2) use ($term) {
                    $c2->where('first_name', 'like', "%{$term}%")
                       ->orWhere('last_name', 'like', "%{$term}%")
                       ->orWhere('email', 'like', "%{$term}%");
                }));
            })
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'),   fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Liste des remboursements.',
            'data'    => $refunds->map(fn ($r) => $this->formatRefund($r)),
            'meta'    => [
                'current_page' => $refunds->currentPage(),
                'last_page'    => $refunds->lastPage(),
                'per_page'     => $refunds->perPage(),
                'total'        => $refunds->total(),
            ],
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     | POST /owner/refunds/{id}/approve
     ──────────────────────────────────────────────────────────── */
    public function approve(ApproveRefundRequest $request, int $id): JsonResponse
    {
        $refund = Refund::with(['client', 'reservation.room'])->find($id);

        if (! $refund) {
            return $this->notFound('Demande de remboursement introuvable.');
        }

        if ($refund->status !== 'pending') {
            return $this->error('Ce remboursement a déjà été traité.', 422);
        }

        $refund->update([
            'status'       => 'approved',
            'admin_id'     => $request->user()->id,
            'admin_notes'  => $request->input('notes'),
            'processed_at' => now(),
        ]);

        $refund->client?->notify(new RefundProcessedNotification($refund->fresh()));

        HotelBroadcast::dispatch('refund.processed', [
            'refundId'      => $refund->id,
            'reservationId' => $refund->reservation_id,
            'clientId'      => $refund->client_id,
            'status'        => 'approved',
        ]);

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_REFUND_APPROVED,
            'Refund',
            $refund->id,
            ['status' => 'pending'],
            ['status' => 'approved', 'amount' => $refund->amount, 'admin_notes' => $refund->admin_notes]
        );

        return $this->success(
            $this->formatRefund($refund->fresh()->load(['client', 'admin', 'reservation.room'])),
            'Remboursement approuvé. Le client a été notifié dans son espace personnel.'
        );
    }

    /* ─────────────────────────────────────────────────────────────
     | POST /owner/refunds/{id}/reject
     ──────────────────────────────────────────────────────────── */
    public function reject(RejectRefundRequest $request, int $id): JsonResponse
    {
        $refund = Refund::with(['client', 'reservation.room'])->find($id);

        if (! $refund) {
            return $this->notFound('Demande de remboursement introuvable.');
        }

        if ($refund->status !== 'pending') {
            return $this->error('Ce remboursement a déjà été traité.', 422);
        }

        $refund->update([
            'status'       => 'rejected',
            'admin_id'     => $request->user()->id,
            'admin_notes'  => $request->input('notes'),
            'processed_at' => now(),
        ]);

        $refund->client?->notify(new RefundProcessedNotification($refund->fresh()));

        HotelBroadcast::dispatch('refund.processed', [
            'refundId'      => $refund->id,
            'reservationId' => $refund->reservation_id,
            'clientId'      => $refund->client_id,
            'status'        => 'rejected',
        ]);

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_REFUND_REJECTED,
            'Refund',
            $refund->id,
            ['status' => 'pending'],
            ['status' => 'rejected', 'amount' => $refund->amount, 'admin_notes' => $refund->admin_notes]
        );

        return $this->success(
            $this->formatRefund($refund->fresh()->load(['client', 'admin', 'reservation.room'])),
            'Remboursement refusé. Le client a été notifié dans son espace personnel.'
        );
    }

    /* ─────────────────────────────────────────────────────────────
     | GET /owner/refunds/{id}/receipt
     ──────────────────────────────────────────────────────────── */
    public function receipt(int $id): Response
    {
        $refund = Refund::with(['client', 'admin', 'reservation.room'])->find($id);

        if (! $refund || $refund->status === 'pending') {
            abort(404, 'Document non disponible pour un remboursement en attente.');
        }

        $docRef   = DocumentRef::refund($refund);
        $filename = DocumentRef::filename($docRef);

        $pdf = Pdf::loadView('receipts.refund', [
            'refund' => $refund,
            'docRef' => $docRef,
        ]);

        return $pdf->stream($filename);
    }

    /* ── Helper ─────────────────────────────────────────────────── */
    private function formatRefund(Refund $r): array
    {
        return [
            'id'             => $r->id,
            'amount'         => (float) $r->amount,
            'status'         => $r->status,
            'status_label'   => $r->statusLabel(),
            'admin_notes'    => $r->admin_notes,
            'processed_at'   => $r->processed_at?->toIso8601String(),
            'created_at'     => $r->created_at?->toIso8601String(),
            'reservation_id' => $r->reservation_id,
            'reservation'    => $r->reservation ? [
                'id'             => $r->reservation->id,
                'check_in_date'  => optional($r->reservation->check_in_date)->toDateString(),
                'check_out_date' => optional($r->reservation->check_out_date)->toDateString(),
                'total_amount'   => (float) $r->reservation->total_amount,
                'room'           => $r->reservation->room ? [
                    'room_number' => $r->reservation->room->room_number,
                    'room_type'   => $r->reservation->room->room_type,
                ] : null,
            ] : null,
            'client' => $r->client ? [
                'id'         => $r->client->id,
                'first_name' => $r->client->first_name,
                'last_name'  => $r->client->last_name,
                'email'      => $r->client->email,
            ] : null,
            'admin' => $r->admin ? [
                'id'         => $r->admin->id,
                'first_name' => $r->admin->first_name,
                'last_name'  => $r->admin->last_name,
            ] : null,
        ];
    }
}
