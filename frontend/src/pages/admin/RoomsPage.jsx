import { useState } from 'react';
import { Plus, Pencil, Trash2, BedDouble, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useRooms } from '../../hooks/useRooms';
import { adminRoomsApi } from '../../api/rooms.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatXOF } from '../../utils/formatCurrency';

const TYPES    = ['simple', 'double', 'suite', 'familiale'];
const STATUSES = ['available', 'occupied', 'maintenance'];
const TYPE_LABELS = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };

function RoomFormModal({ open, onClose, onSaved, initial }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: initial || { room_type: 'simple', status: 'available', capacity: 1 },
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values) => {
    setSubmitting(true);
    try {
      values.price_per_night = Number(values.price_per_night);
      values.capacity = Number(values.capacity);
      if (initial?.id) await adminRoomsApi.update(initial.id, values);
      else await adminRoomsApi.create(values);
      toast.success('Chambre enregistrée.');
      onSaved();
      reset();
    } catch (e) {
      if (e.response?.status !== 422) toast.error('Enregistrement impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center">
            <BedDouble className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {initial?.id ? 'Modifier la chambre' : 'Nouvelle chambre'}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Numéro</label>
              <input className="input" placeholder="101" {...register('room_number', { required: true })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" {...register('room_type')}>
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prix / nuit (XOF)</label>
              <input
                type="number"
                className="input"
                placeholder="25 000"
                {...register('price_per_night', { required: true, valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="label">Capacité (pers.)</label>
              <input
                type="number"
                className="input"
                min={1}
                max={10}
                {...register('capacity', { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Statut</label>
              <select className="input" {...register('status')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'available' ? 'Disponible' : s === 'occupied' ? 'Occupée' : 'Maintenance'}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} {...register('description')} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '...' : initial?.id ? 'Enregistrer les modifications' : 'Créer la chambre'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminRoomsPage() {
  const [filters, setFilters] = useState({});
  const { data, loading, refetch } = useRooms(filters, { admin: true });
  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy]         = useState(false);
  const [search, setSearch]     = useState('');

  const remove = async () => {
    setBusy(true);
    try {
      await adminRoomsApi.remove(toDelete.id);
      toast.success('Chambre supprimée.');
      setToDelete(null);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Suppression impossible.');
    } finally {
      setBusy(false); }
  };

  const columns = [
    { key: 'room_number', label: 'N°', render: (r) => <span className="font-semibold">{r.room_number}</span> },
    { key: 'room_type',   label: 'Type',     render: (r) => <span className="capitalize">{TYPE_LABELS[r.room_type] ?? r.room_type}</span> },
    { key: 'capacity',    label: 'Capacité', render: (r) => `${r.capacity} pers.` },
    { key: 'price',       label: 'Prix / nuit', render: (r) => <span className="font-semibold text-brand-600">{formatXOF(r.price_per_night)}</span> },
    { key: 'status',      label: 'Statut',   render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
            onClick={() => { setEditing(r); setShowForm(true); }}
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="btn-ghost p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            onClick={() => setToDelete(r)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chambres</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {Array.isArray(data) ? data.length : 0} chambre{data?.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <Plus className="h-4 w-4" /> Nouvelle chambre
        </button>
      </div>

      {/* Filtres */}
      <div className="card card-pad">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="input pl-9"
              placeholder="Rechercher N°…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFilters((f) => ({ ...f, search: e.target.value }));
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="input w-auto"
              onChange={(e) => setFilters((f) => ({ ...f, room_type: e.target.value }))}
            >
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select
              className="input w-auto"
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="occupied">Occupée</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="Aucune chambre trouvée." />
      </div>

      <RoomFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); refetch(); }}
        initial={editing}
      />

      <ConfirmModal
        open={!!toDelete}
        title="Supprimer la chambre"
        message={`Voulez-vous vraiment supprimer la chambre N° ${toDelete?.room_number} ? Cette action est irréversible.`}
        variant="danger"
        confirmLabel="Supprimer"
        loading={busy}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
}
