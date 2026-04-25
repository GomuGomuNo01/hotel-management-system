import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Power, Pencil, Trash2 } from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';

export default function AdminsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toToggle, setToToggle] = useState(null);

  const load = () => {
    setLoading(true);
    ownerApi.admins.list()
      .then((res) => setData(res?.data?.data ?? res?.data ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async () => {
    setBusy('toggle');
    try {
      await ownerApi.admins.toggleStatus(toToggle.id);
      toast.success('Statut mis à jour.');
      setToToggle(null); load();
    } catch (e) { toast.error("Action impossible."); }
    finally { setBusy(null); }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await ownerApi.admins.remove(toDelete.id);
      toast.success('Admin supprimé.');
      setToDelete(null); load();
    } catch (e) { toast.error("Suppression impossible."); }
    finally { setBusy(null); }
  };

  const columns = [
    { key: 'name', label: 'Nom', render: (a) => `${a.first_name} ${a.last_name}` },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' },
    { key: 'status', label: 'Statut', render: (a) => (
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700')}>
        {a.is_active ? 'Actif' : 'Inactif'}
      </span>
    )},
    { key: 'last', label: 'Dernière connexion', render: (a) => a.last_login_at ? formatDate(a.last_login_at) : '—' },
    { key: 'actions', label: 'Actions', render: (a) => (
      <div className="flex gap-1">
        <Link to={`/owner/admins/${a.id}`} className="btn-ghost p-1.5"><Pencil className="h-4 w-4" /></Link>
        <button className="btn-ghost p-1.5 text-orange-600" onClick={() => setToToggle(a)}><Power className="h-4 w-4" /></button>
        <button className="btn-ghost p-1.5 text-red-600" onClick={() => setToDelete(a)}><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administrateurs</h1>
        <Link to="/owner/admins/new" className="btn-primary"><Plus className="h-4 w-4" /> Nouvel admin</Link>
      </div>
      <div className="card">
        <DataTable columns={columns} data={data} loading={loading} />
      </div>

      <ConfirmModal
        open={!!toToggle}
        title={toToggle?.is_active ? 'Désactiver l\'admin ?' : 'Activer l\'admin ?'}
        message={`Confirmer le changement de statut pour ${toToggle?.first_name} ${toToggle?.last_name} ?`}
        loading={busy === 'toggle'}
        onClose={() => setToToggle(null)}
        onConfirm={toggle}
      />
      <ConfirmModal
        open={!!toDelete}
        title="Supprimer l'admin"
        variant="danger"
        confirmLabel="Supprimer"
        message={`Cette action est définitive. Supprimer ${toDelete?.first_name} ${toDelete?.last_name} ?`}
        loading={busy === 'delete'}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
}
