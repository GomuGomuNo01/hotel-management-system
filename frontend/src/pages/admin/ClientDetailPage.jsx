import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.clients.get(id)
      .then((res) => setClient(res?.data ?? res))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!client) return <p>Client introuvable.</p>;

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/admin/clients" className="text-sm text-brand-600 inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="card card-pad">
        <h1 className="text-2xl font-bold">{client.first_name} {client.last_name}</h1>
        <div className="mt-2 text-sm text-gray-600 grid sm:grid-cols-2 gap-2">
          <span>📧 {client.email}</span>
          <span>📞 {client.phone || '—'}</span>
          <span>🌐 {client.provider}</span>
          <span>📅 Inscrit le {formatDate(client.created_at)}</span>
        </div>
      </div>

      {client.reservations?.length > 0 && (
        <div className="card">
          <div className="border-b p-4 font-semibold">Réservations</div>
          <ul className="divide-y">
            {client.reservations.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">Chambre N° {r.room?.room_number}</p>
                  <p className="text-gray-500">{formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-600">{formatXOF(r.total_amount)}</p>
                  <StatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
