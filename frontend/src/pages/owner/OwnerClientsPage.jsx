/**
 * OwnerClientsPage — /owner/clients
 * Vue owner : liste des clients (lecture seule) avec recherche (nom/email),
 * pagination uniforme (DataTable) et aperçu en drawer.
 */
import { useEffect, useState } from 'react';
import { Eye, Search, Users } from 'lucide-react';
import { ownerApi }            from '../../api/owner.api';
import DataTable               from '../../components/common/DataTable';
import OwnerClientDetailDrawer from '../../components/owner/OwnerClientDetailDrawer';
import { formatDate }          from '../../utils/formatDate';

export default function OwnerClientsPage() {
  const [data, setData]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');   // valeur saisie
  const [query, setQuery]     = useState('');   // valeur débouncée
  const [selectedId, setSelectedId] = useState(null);

  // Débounce : on interroge l'API 350 ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    ownerApi.clients.list({ page, search: query })
      .then((res) => {
        setData(res?.data ?? []);
        setMeta(res?.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [page, query]);

  const columns = [
    {
      key: 'name', label: 'Client',
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.profile_photo ? (
            <img
              src={r.profile_photo}
              alt={`${r.last_name ?? ''} ${r.first_name ?? ''}`}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 border-2 border-amber-200"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-extrabold flex-shrink-0 border-2 border-amber-200">
              {r.last_name?.[0]}{r.first_name?.[0]}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-slate-900">{r.last_name} {r.first_name}</p>
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
      key: 'created_at', label: 'Inscrit le',
      render: (r) => <span className="text-sm font-medium text-slate-700">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm"
          title="Aperçu du client"
        >
          <Eye className="h-3.5 w-3.5" /> Voir
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête + recherche */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="h-7 w-7 text-amber-500" />
            Clients
          </h1>
          {meta && (
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-semibold text-slate-800">{meta.total}</span>{' '}
              client{meta.total !== 1 ? 's' : ''} enregistré{meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            className="pl-9 pr-4 py-2.5 w-72 text-sm font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 placeholder:text-slate-400"
            placeholder="Nom ou email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Tableau + pagination uniforme */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyMessage="Aucun client trouvé."
        />
      </div>

      {/* Drawer d'aperçu */}
      {selectedId && (
        <OwnerClientDetailDrawer clientId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
