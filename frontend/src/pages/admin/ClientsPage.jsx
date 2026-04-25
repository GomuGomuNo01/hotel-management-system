import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/formatDate';

export default function ClientsPage() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    adminApi.clients.list({ page })
      .then((res) => {
        setData(res?.data?.data ?? res?.data ?? []);
        setMeta(res?.data?.meta ?? res?.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const columns = [
    { key: 'name', label: 'Nom', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'provider', label: 'Source' },
    { key: 'created_at', label: 'Inscrit le', render: (r) => formatDate(r.created_at) },
    { key: 'actions', label: '', render: (r) => (
      <Link to={`/admin/clients/${r.id}`} className="btn-ghost p-1.5"><Eye className="h-4 w-4" /></Link>
    )},
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Clients</h1>
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
