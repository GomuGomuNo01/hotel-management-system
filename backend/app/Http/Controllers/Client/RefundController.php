<?php

namespace App\Http\Controllers\Client;

use App\Helpers\DocumentRef;
use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Traits\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Suivi des remboursements côté client.
 * Le client consulte l'état de ses demandes (en attente / approuvé / refusé)
 * directement depuis son espace personnel.
 */
class RefundController extends Controller
{
    use ApiResponse;

    /**
     * GET /refunds - liste des remboursements du client connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $refunds = Refund::with(['reservation.room'])
            ->where('client_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (Refund $r) => $this->format($r));

        return $this->success($refunds, 'Liste des remboursements.');
    }

    /**
     * GET /refunds/{id}/receipt — reçu PDF du remboursement (approuvé ou refusé uniquement).
     */
    public function receipt(int $id, Request $request): Response
    {
        $refund = Refund::with(['client', 'admin', 'reservation.room'])
            ->where('client_id', $request->user()->id)
            ->find($id);

        if (! $refund || $refund->status === 'pending') {
            abort(404, 'Document non disponible pour un remboursement en attente.');
        }

        $docRef   = DocumentRef::refund($refund);
        $filename = DocumentRef::filename($docRef);
        $pdf      = Pdf::loadView('receipts.refund', ['refund' => $refund, 'docRef' => $docRef]);

        return $pdf->stream($filename);
    }

    /** Sérialise un remboursement pour le client (sans données admin sensibles). */
    private function format(Refund $r): array
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
                'room'           => $r->reservation->room ? [
                    'room_number' => $r->reservation->room->room_number,
                    'room_type'   => $r->reservation->room->room_type,
                ] : null,
            ] : null,
        ];
    }
}
