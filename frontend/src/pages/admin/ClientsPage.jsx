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
        setData(res?.data ?? res?.data ?? []);
        setMeta(res?.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  const columns = [
    {
      key: 'name', label: 'Client',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {r.first_name?.[0]}{r.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium">{r.first_name} {r.last_name}</p>
            <p className="text-xs text-gray-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone',    label: 'Téléphone', render: (r) => r.phone || '—' },
    { key: 'provider', label: 'Source',    render: (r) => <span className="capitalize">{r.provider || 'local'}</span> },
    { key: 'created_at', label: 'Inscrit le', render: (r) => formatDate(r.created_at) },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Link
          to={`/admin/clients/${r.id}`}
          className="btn-ghost p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
          title="Voir le profil"
        >
          <Eye className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-500" />
            Clients
          </h1>
          {meta && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {meta.total} client{meta.total !== 1 ? 's' : ''} enregistré{meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9 w-64"
            placeholder="Nom, email, téléphone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card">
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
