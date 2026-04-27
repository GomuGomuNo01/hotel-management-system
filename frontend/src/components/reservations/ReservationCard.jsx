import { Calendar, Hash, Moon, FileText } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

export default function ReservationCard({ reservation, actions, onViewClick }) {
  const room   = reservation.room || {};
  const nights = reservation.nights ?? null;

  return (
    <div className="card card-pad flex flex-col gap-3">
      {/* Header: id + chambre + statut */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Hash className="h-3 w-3" /> #{reservation.id}
          </p>
          <h3 className="font-semibold">
            Chambre {room.room_number}
            {room.room_type && (
              <span className="text-gray-500 font-normal"> — {room.room_type}</span>
            )}
          </h3>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      {/* Dates */}
      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>{formatDate(reservation.check_in_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>{formatDate(reservation.check_out_date)}</span>
        </div>
      </div>

      {/* Nights + notes */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {nights != null && (
          <span className="flex items-center gap-1">
            <Moon className="h-3.5 w-3.5" />
            {nights} nuit{nights > 1 ? 's' : ''}
          </span>
        )}
        {reservation.notes && (
          <span className="flex items-center gap-1 truncate max-w-xs" title={reservation.notes}>
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            {reservation.notes}
          </span>
        )}
      </div>

      {/* Footer: montant + actions */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className="text-brand-600 font-bold">{formatXOF(reservation.total_amount)}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onViewClick}
            className="btn-secondary text-xs"
          >
            Voir
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
}
