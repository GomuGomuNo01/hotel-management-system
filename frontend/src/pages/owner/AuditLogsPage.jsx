import { useEffect, useState } from 'react';
import { ownerApi } from '../../api/owner.api';
import AuditLogTable from '../../components/owner/AuditLogTable';

export default function AuditLogsPage() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ admin_id: '', action_type: '', date: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    ownerApi.audit.list({ ...filters, page })
      .then((res) => {
        setData(res?.data?.data ?? res?.data ?? []);
        setMeta(res?.data?.meta ?? res?.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters), page]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Journal d'audit</h1>

      <div className="card card-pad grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Admin (ID)</label>
          <input className="input" value={filters.admin_id} onChange={(e) => { setFilters({ ...filters, admin_id: e.target.value }); setPage(1); }} />
        </div>
        <div>
          <label className="label">Type d'action</label>
          <input className="input" value={filters.action_type} onChange={(e) => { setFilters({ ...filters, action_type: e.target.value }); setPage(1); }} placeholder="create / update / delete" />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={filters.date} onChange={(e) => { setFilters({ ...filters, date: e.target.value }); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        <AuditLogTable
          logs={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
