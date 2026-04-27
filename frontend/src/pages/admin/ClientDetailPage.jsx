import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, Globe, Calendar, BedDouble, ArrowRight } from 'lucide-react';
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
  if (!client) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-lg font-semibold text-slate-600">Client introuvable.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Retour */}
      <Link
        to="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Retour aux clients
      </Link>

      {/* Carte profil */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-extrabold border-2 border-blue-200 flex-shrink-0">
            {client.first_name?.[0]}{client.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900">
              {client.first_name} {client.last_name}
            </h1>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-800 truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-800">{client.phone || <span className="text-slate-400">—</span>}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-800 capitalize">{client.provider || 'local'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-800">Inscrit le {formatDate(client.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Réservations */}
      {client.reservations?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-extrabold text-slate-900">
              Réservations
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                {client.reservations.length}
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {client.reservations.map((r) => (
              <li key={r.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                    <BedDouble className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Chambre N° {r.room?.room_number}</p>
                    <p className="text-xs font-medium text-slate-600">
                      {formatDate(r.check_in_date)}
                      <ArrowRight className="inline h-3 w-3 mx-1 text-slate-400" />
                      {formatDate(r.check_out_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span className="text-sm font-extrabold text-slate-900">{formatXOF(r.total_amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
