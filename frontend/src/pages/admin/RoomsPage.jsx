import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Star, X } from 'lucide-react';
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

const AMENITIES = [
  { value: 'wifi',          label: 'WiFi',          icon: '📶' },
  { value: 'climatisation', label: 'Climatisation',  icon: '❄️' },
  { value: 'tv',            label: 'TV',             icon: '📺' },
  { value: 'minibar',       label: 'Mini-bar',       icon: '🍹' },
];

// ─── Formulaire ──────────────────────────────────────────────
function RoomFormModal({ open, onClose, onSaved, initial }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: initial || { room_type: 'simple', status: 'available', capacity: 1, amenities: [] },
  });

  const [submitting, setSubmitting]     = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState(initial?.images || []);

  const selectedAmenities = watch('amenities') || [];

  useEffect(() => {
    if (open) {
      reset(initial || { room_type: 'simple', status: 'available', capacity: 1, amenities: [] });
      setExistingImages(initial?.images || []);
      setImagePreviews([]);
      setSelectedFiles([]);
    }
  }, [open, initial]);

  const toggleAmenity = (value) => {
    const current = selectedAmenities.includes(value)
      ? selectedAmenities.filter((a) => a !== value)
      : [...selectedAmenities, value];
    setValue('amenities', current);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const removeExistingImage = async (img) => {
    if (!initial?.id) return;
    try {
      await adminRoomsApi.deleteImage(initial.id, img.id);
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success('Image supprimée.');
    } catch {
      toast.error('Suppression impossible.');
    }
  };

  const submit = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('room_number',     values.room_number);
      formData.append('room_type',       values.room_type);
      formData.append('price_per_night', Number(values.price_per_night));
      formData.append('capacity',        Number(values.capacity));
      formData.append('status',          values.status);
      if (values.description) formData.append('description', values.description);

      const amenities = values.amenities || [];
      amenities.forEach((a) => formData.append('amenities[]', a));

      selectedFiles.forEach((file) => formData.append('images[]', file));

      if (initial?.id) await adminRoomsApi.update(initial.id, formData);
      else             await adminRoomsApi.create(formData);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-lg rounded-xl bg-white p-5 space-y-4 my-8"
      >
        <h3 className="text-lg font-semibold">
          {initial?.id ? 'Modifier la chambre' : 'Nouvelle chambre'}
        </h3>

        {/* Champs de base */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Numéro</label>
            <input className="input" {...register('room_number', { required: true })} />
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

        {/* ── Équipements (checkboxes) ── */}
        <div>
          <label className="label mb-2">Équipements</label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITIES.map(({ value, label, icon }) => (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 px-3 py-2 transition select-none ${
                  selectedAmenities.includes(value)
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedAmenities.includes(value)}
                  onChange={() => toggleAmenity(value)}
                />
                <span className="text-lg">{icon}</span>
                <span className="text-sm">{label}</span>
                {selectedAmenities.includes(value) && (
                  <span className="ml-auto text-brand-500">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* ── Upload images ── */}
        <div>
          <label className="label mb-2">Images de la chambre</label>

          {/* Images existantes */}
          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {existingImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url}
                    alt=""
                    className={`h-16 w-20 object-cover rounded-lg border-2 ${
                      img.is_primary ? 'border-brand-500' : 'border-gray-200'
                    }`}
                  />
                  {img.is_primary && (
                    <span className="absolute top-0.5 left-0.5 bg-brand-500 text-white rounded text-[10px] px-1">
                      ⭐
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input file */}
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition">
            <ImageIcon className="h-7 w-7 text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} image(s) sélectionnée(s)`
                : 'Cliquez ou glissez des images ici'}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WEBP — max 5 Mo chacune</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {/* Prévisualisations */}
          {imagePreviews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative">
                  <img src={src} alt="" className="h-16 w-20 object-cover rounded-lg border border-gray-200" />
                  {idx === 0 && existingImages.length === 0 && (
                    <span className="absolute top-0.5 left-0.5 bg-brand-500 text-white rounded text-[10px] px-1">⭐</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────
export default function AdminRoomsPage() {
  const { data, loading, refetch } = useRooms({}, { admin: true });
  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy]         = useState(false);

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
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'photo',
      label: 'Photo',
      render: (r) => {
        const primary = r.images?.find((i) => i.is_primary) || r.images?.[0];
        return primary
          ? <img src={primary.url} alt="" className="h-10 w-14 object-cover rounded" />
          : <div className="h-10 w-14 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">—</div>;
      },
    },
    { key: 'room_number', label: 'N°' },
    { key: 'room_type', label: 'Type', render: (r) => <span className="capitalize">{r.room_type}</span> },
    { key: 'capacity', label: 'Capacité' },
    { key: 'price_per_night', label: 'Prix/nuit', render: (r) => formatXOF(r.price_per_night) },
    {
      key: 'amenities',
      label: 'Équipements',
      render: (r) => {
        const icons = { wifi: '📶', climatisation: '❄️', tv: '📺', minibar: '🍹' };
        return (
          <div className="flex gap-1">
            {(r.amenities || []).map((a) => (
              <span key={a} title={a} className="text-base">{icons[a] || a}</span>
            ))}
            {(!r.amenities || r.amenities.length === 0) && <span className="text-gray-400 text-xs">—</span>}
          </div>
        );
      },
    },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1">
          <button
            className="btn-ghost p-1.5"
            onClick={() => { setEditing(r); setShowForm(true); }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="btn-ghost p-1.5 text-red-600"
            onClick={() => setToDelete(r)}
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
