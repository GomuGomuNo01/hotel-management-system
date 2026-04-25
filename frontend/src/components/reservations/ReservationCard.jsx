import { Link } from 'react-router-dom';
import { Calendar, Hash } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

export default function ReservationCard({ reservation, actions }) {
  const room = reservation.room || {};
  return (
    <div className="card card-pad flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Hash className="h-3 w-3" /> #{reservation.id}</p>
          <h3 className="font-semibold">Chambre {room.room_number} <span className="text-gray-500 font-normal">— {room.room_type}</span></h3>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> {formatDate(reservation.check_in_date)}</div>
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> {formatDate(reservation.check_out_date)}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-brand-600 font-bold">{formatXOF(reservation.total_amount)}</span>
        <div className="flex gap-2">
          <Link to={`/mon-espace/reservations`} className="btn-secondary text-xs">Voir</Link>
          {actions}
        </div>
      </div>
    </div>
  );
}
