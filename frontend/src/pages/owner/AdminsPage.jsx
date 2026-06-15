import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';

const ROLE_LABELS = {
  manager:      'Manager',
  receptionist: 'Réceptionniste',
  accountant:   'Comptable',
};

const ROLE_COLORS = {
  manager:      'bg-violet-50 text-violet-700 border-violet-200',
  receptionist: 'bg-teal-50 text-teal-700 border-teal-200',
  accountant:   'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AdminsPage() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toToggle, setToToggle] = useState(null);

  const load = () => {
    setLoading(true);
    ownerApi.admins.list()
      .then((res) => setData(res?.data?.data ?? res?.data ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const fullName = (a) => `${a.last_name} ${a.first_name}`;

  const toggle = async () => {
    if (!toToggle) return;
    setBusy('toggle');
    const wasActive = toToggle.is_active;
    try {
      await ownerApi.admins.toggleStatus(toToggle.id);
      toast.success(
        wasActive
          ? `Le compte de ${fullName(toToggle)} a été désactivé. Il ne peut plus se connecter.`
          : `Le compte de ${fullName(toToggle)} est à nouveau actif. Il peut se connecter normalement.`
      );
      setToToggle(null);
      load();
    } catch {
      toast.error(`Impossible de modifier le statut de ${fullName(toToggle)}. Réessayez.`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy('delete');
    const name = fullName(toDelete);
    try {
      await ownerApi.admins.remove(toDelete.id);
      toast.success(`${name} a été définitivement supprimé de l'équipe.`);
      setToDelete(null);
      load();
    } catch {
      toast.error(`La suppression de ${name} a échoué. Réessayez ou contactez le support.`);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Administrateur',
      render: (a) => (
        <div>
          <p className="font-semibold text-gray-900">{fullName(a)}</p>
          <p className="text-xs text-gray-400 truncate max-w-xs">{a.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (a) => (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', ROLE_COLORS[a.role] ?? 'bg-gray-100 text-gray-700 border-gray-200')}>
          {ROLE_LABELS[a.role] ?? a.role}
        </span>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (a) => {
        const count = (a.permissions || []).length;
        return (
          <span className="text-sm text-gray-500">
            {count === 0 ? 'Aucune' : `${count} permission${count > 1 ? 's' : ''}`}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (a) => (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
          a.is_active
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-100 text-gray-500 border-gray-200')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', a.is_active ? 'bg-green-500' : 'bg-gray-400')} />
          {a.is_active ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'last',
      label: 'Dernière connexion',
      render: (a) => (
        <span className="text-sm text-gray-500">
          {a.last_login_at ? formatDate(a.last_login_at) : 'Jamais connecté'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (a) => (
        <div className="flex gap-1 justify-end">
          <Link
            to={`/owner/admins/${a.id}`}
            className="btn-ghost p-1.5 text-gray-600"
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            className={cn('btn-ghost p-1.5', a.is_active ? 'text-orange-600' : 'text-green-600')}
            title={a.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
            onClick={() => setToToggle(a)}
          >
            {a.is_active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </button>
          <button
            className="btn-ghost p-1.5 text-red-600"
            title="Supprimer définitivement"
            onClick={() => setToDelete(a)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez l'équipe, leurs rôles et leurs droits d'accès.
          </p>
        </div>
        <Link to="/owner/admins/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter un admin
        </Link>
      </div>

      <div className="card">
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="Aucun administrateur enregistré pour le moment." />
      </div>

      {/* Modal activation / désactivation */}
      <ConfirmModal
        open={!!toToggle}
        title={toToggle?.is_active ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
        message={
          toToggle?.is_active
            ? `${fullName(toToggle ?? {})} ne pourra plus se connecter tant que son compte est désactivé. Vous pourrez le réactiver à tout moment.`
            : `${fullName(toToggle ?? {})} pourra à nouveau se connecter et accéder à ses fonctionnalités habituelles.`
        }
        confirmLabel={toToggle?.is_active ? 'Désactiver' : 'Réactiver'}
        variant="primary"
        loading={busy === 'toggle'}
        onClose={() => setToToggle(null)}
        onConfirm={toggle}
      />

      {/* Modal suppression */}
      <ConfirmModal
        open={!!toDelete}
        title="Supprimer définitivement ?"
        message={`Vous êtes sur le point de supprimer le compte de ${fullName(toDelete ?? {})}. Cette action est irréversible - toutes ses données et permissions seront effacées.`}
        confirmLabel="Oui, supprimer"
        variant="danger"
        loading={busy === 'delete'}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
}
