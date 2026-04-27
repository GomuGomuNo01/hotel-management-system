import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Search, Users } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/formatDate';

export default function ClientsPage() {
  const [data, setData]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.clients.list({ page, search })
      .then((res) => {
        setData(res?.data ?? []);
        setMeta(res?.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  const columns = [
    {
      key: 'name', label: 'Client',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-extrabold flex-shrink-0 border-2 border-blue-200">
            {r.first_name?.[0]}{r.last_name?.[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{r.first_name} {r.last_name}</p>
            <p className="text-xs font-medium text-slate-600">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone', label: 'Téléphone',
      render: (r) => <span className="text-sm font-semibold text-slate-800">{r.phone || <span className="text-slate-400">—</span>}</span>,
    },
    {
      key: 'provider', label: 'Source',
      render: (r) => (
        <span className="capitalize inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          {r.provider || 'local'}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Inscrit le',
      render: (r) => <span className="text-sm font-medium text-slate-700">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Link
          to={`/admin/clients/${r.id}`}
          className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 transition-colors"
          title="Voir le profil"
        >
          <Eye className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            Clients
          </h1>
          {meta && (
            <p className="text-sm font-semibold text-slate-600 mt-1">
              <span className="text-blue-700 font-extrabold">{meta.total}</span> client{meta.total !== 1 ? 's' : ''} enregistré{meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            className="pl-9 pr-4 py-2.5 w-72 text-sm font-medium text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Nom, email, téléphone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
          emptyMessage="Aucun client trouvé."
        />
      </div>
    </div>
  );
}
