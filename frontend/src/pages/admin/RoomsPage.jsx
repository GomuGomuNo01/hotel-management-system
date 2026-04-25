import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useRooms } from '../../hooks/useRooms';
import { adminRoomsApi } from '../../api/rooms.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatXOF } from '../../utils/formatCurrency';

const TYPES = ['simple', 'double', 'suite', 'familiale'];
const STATUSES = ['available', 'occupied', 'maintenance'];

function RoomFormModal({ open, onClose, onSaved, initial }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: initial || { room_type: 'simple', status: 'available', capacity: 1 } });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values) => {
    setSubmitting(true);
    try {
      values.price_per_night = Number(values.price_per_night);
      values.capacity = Number(values.capacity);
      if (initial?.id) await adminRoomsApi.update(initial.id, values);
      else await adminRoomsApi.create(values);
      toast.success('Chambre enregistrée.');
      onSaved(); reset();
    } catch (e) {
      if (e.response?.status !== 422) toast.error("Enregistrement impossible.");
    } finally { setSubmitting(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit(submit)} className="w-full max-w-lg rounded-xl bg-white p-5 space-y-3">
        <h3 className="text-lg font-semibold">{initial?.id ? 'Modifier la chambre' : 'Nouvelle chambre'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Numéro</label>
            <input className="input" {...register('room_number', { required: true })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" {...register('room_type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Prix / nuit</label>
            <input type="number" className="input" {...register('price_per_night', { required: true, valueAsNumber: true })} />
          </div>
          <div>
            <label className="label">Capacité</label>
            <input type="number" className="input" {...register('capacity', { required: true, valueAsNumber: true })} />
          </div>
          <div className="col-span-2">
            <label className="label">Statut</label>
            <select className="input" {...register('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows="3" {...register('description')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '...' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminRoomsPage() {
  const { data, loading, refetch } = useRooms({}, { admin: true });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await adminRoomsApi.remove(toDelete.id);
      toast.success('Chambre supprimée.');
      setToDelete(null);
      refetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Suppression impossible.'); }
    finally { setBusy(false); }
  };

  const columns = [
    { key: 'room_number', label: 'N°' },
    { key: 'room_type', label: 'Type', render: (r) => <span className="capitalize">{r.room_type}</span> },
    { key: 'capacity', label: 'Capacité' },
    { key: 'price_per_night', label: 'Prix/nuit', render: (r) => formatXOF(r.price_per_night) },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-1">
        <button className="btn-ghost p-1.5" onClick={() => { setEditing(r); setShowForm(true); }}><Pencil className="h-4 w-4" /></button>
        <button className="btn-ghost p-1.5 text-red-600" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chambres</h1>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nouvelle chambre
        </button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={data} loading={loading} />
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
        message={`Voulez-vous vraiment supprimer la chambre N° ${toDelete?.room_number} ?`}
        variant="danger"
        confirmLabel="Supprimer"
        loading={busy}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
}
