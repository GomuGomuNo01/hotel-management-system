import { Calendar, Moon } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { formatXOF }  from '../../utils/formatCurrency';

/**
 * ReservationCard - carte réservation uniforme.
 *
 * Structure :
 *  ┌─────────────────────────────────────────┐
 *  │ #id   Chambre X - type       [Statut]   │  ← header
 *  │ 📅 arrivée       📅 départ               │  ← dates
 *  │ 🌙 N nuits                               │  ← durée
 *  ├─────────────────────────────────────────┤
 *  │ 90 000 F CFA            [Voir]           │  ← footer ligne 1
 *  │ [Payer] [Reçu] [Facture] [Avis donné]   │  ← footer ligne 2 (facultatif)
 *  └─────────────────────────────────────────┘
 */
export default function ReservationCard({ reservation, actions, onViewClick }) {
  const room   = reservation.room || {};
  const nights = reservation.nights ?? null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden">

      {/* ── Contenu principal ── */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 flex-1">

        {/* En-tête : numéro + chambre + statut */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-0.5">
              <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 tracking-wide">
                RES-{String(reservation.id).padStart(6, '0')}
              </span>
            </p>
            <h3 className="font-bold text-gray-900 leading-tight truncate">
              Chambre {room.room_number}
              {room.room_type && (
                <span className="text-gray-400 font-normal"> - {room.room_type}</span>
              )}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={reservation.status} />
          </div>
        </div>

        {/* Dates en grille */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 text-sm text-gray-600 min-w-0">
            <Calendar className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            <span className="truncate">{formatDate(reservation.check_in_date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600 min-w-0">
            <Calendar className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            <span className="truncate">{formatDate(reservation.check_out_date)}</span>
          </div>
        </div>

        {/* Durée */}
        {nights != null && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <Moon className="h-3.5 w-3.5 flex-shrink-0" />
            {nights} nuit{nights > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Pied de carte ── */}
      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 flex flex-col gap-2">

        {/* Ligne 1 : montant + bouton Voir */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-brand-600 text-base tabular-nums">
            {formatXOF(reservation.total_amount)}
          </span>
          {onViewClick && (
            <button
              type="button"
              onClick={onViewClick}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              Voir
            </button>
          )}
        </div>

        {/* Ligne 2 : actions supplémentaires (paiement, reçu, avis…) */}
        {actions}
      </div>
    </div>
  );
}
