import { useEffect, useRef, useState } from 'react';
import {
  BedDouble, Filter, Image as ImageIcon, Loader2, Pencil,
  Plus, Search, Star, Trash2, Upload, Wifi, Wind, Tv, Beer, X,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useRooms } from '../../hooks/useRooms';
import { adminRoomsApi } from '../../api/rooms.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatXOF } from '../../utils/formatCurrency';

/* ─── Constantes ──────────────────────────────────────────────────────────── */
const TYPES       = ['simple', 'double', 'suite', 'familiale'];
const STATUSES    = ['available', 'occupied', 'maintenance'];
const TYPE_LABELS = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };

const AMENITY_OPTIONS = [
  { value: 'wifi',          label: 'WiFi',          Icon: Wifi },
  { value: 'climatisation', label: 'Climatisation', Icon: Wind },
  { value: 'tv',            label: 'TV',            Icon: Tv   },
  { value: 'minibar',       label: 'Mini-bar',      Icon: Beer },
];

/* ─── Modal formulaire ────────────────────────────────────────────────────── */
function RoomFormModal({ open, onClose, onSaved, initial }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { room_type: 'simple', status: 'available', capacity: 1, amenities: [] },
  });

  const [submitting, setSubmitting]         = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles]             = useState([]);
  const [previews, setPreviews]             = useState([]);
  const [deletingId, setDeletingId]         = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      reset(initial
        ? {
            room_number:     initial.room_number,
            room_type:       initial.room_type,
            price_per_night: initial.price_per_night,
            capacity:        initial.capacity,
            status:          initial.status,
            description:     initial.description ?? '',
            amenities:       initial.amenities ?? [],
          }
        : { room_type: 'simple', status: 'available', capacity: 1, amenities: [] }
      );
      setExistingImages(initial?.images ?? []);
      setNewFiles([]);
      setPreviews([]);
    }
  }, [open, initial, reset]);

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const handleFileChange = (e) => {
    const files   = Array.from(e.target.files);
    const allowed = files.filter((f) => f.size <= 5 * 1024 * 1024);
    if (allowed.length < files.length)
      toast.error('Certains fichiers dépassent 5 Mo et ont été ignorés.');
    setNewFiles((p) => [...p, ...allowed]);
    setPreviews((p) => [...p, ...allowed.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeNew = (i) => {
    URL.revokeObjectURL(previews[i]);
    setNewFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const removeExisting = async (img) => {
    setDeletingId(img.id);
    try {
      await adminRoomsApi.deleteImage(initial.id, img.id);
      setExistingImages((p) => p.filter((i) => i.id !== img.id));
    } catch {
      toast.error('Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  const setPrimary = async (img) => {
    try {
      await adminRoomsApi.setPrimaryImage(initial.id, img.id);
      setExistingImages((p) =>
        p.map((i) => ({ ...i, is_primary: i.id === img.id }))
      );
    } catch {
      toast.error('Action impossible.');
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
      (values.amenities ?? []).forEach((a) => formData.append('amenities[]', a));
      newFiles.forEach((f) => formData.append('images[]', f));

      if (initial?.id) await adminRoomsApi.update(initial.id, formData);
      else             await adminRoomsApi.create(formData);

      toast.success('Chambre enregistrée.');
      onSaved();
    } catch (e) {
      if (e.response?.status !== 422) toast.error('Enregistrement impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const amenities     = watch('amenities') ?? [];
  const toggleAmenity = (val) =>
    setValue('amenities', amenities.includes(val)
      ? amenities.filter((v) => v !== val)
      : [...amenities, val]
    );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh]"
      >
        {/* En-tête */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <BedDouble className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 flex-1">
            {initial?.id ? 'Modifier la chambre' : 'Nouvelle chambre'}
          </h3>
          <button type="button" onClick={onClose} className="btn-ghost p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Numéro de chambre</label>
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
              <input type="number" className="input" placeholder="25000"
                {...register('price_per_night', { required: true, valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Capacité (pers.)</label>
              <input type="number" className="input" min={1} max={10}
                {...register('capacity', { required: true, valueAsNumber: true })} />
            </div>
            <div className="col-span-2">
              <label className="label">Statut</label>
              <select className="input" {...register('status')}>
                <option value="available">Disponible</option>
                <option value="occupied">Occupée</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Description de la chambre…" {...register('description')} />
            </div>
          </div>

          {/* Équipements */}
          <div>
            <label className="label mb-3">Équipements disponibles</label>
            <div className="grid grid-cols-2 gap-2">
              {AMENITY_OPTIONS.map(({ value, label, Icon }) => {
                const checked = amenities.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleAmenity(value)}
                    className={[
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all select-none',
                      checked
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{label}</span>
                    {checked && (
                      <span className="ml-auto h-4 w-4 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" fill="none"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="label mb-3">Photos de la chambre</label>

            {existingImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.is_primary && (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500 text-white">
                        <Star className="h-2.5 w-2.5 fill-white" /> Principale
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      {!img.is_primary && (
                        <button type="button" onClick={() => setPrimary(img)} title="Définir comme principale"
                          className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors">
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" disabled={deletingId === img.id} onClick={() => removeExisting(img)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                        {deletingId === img.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {previews.map((url, i) => (
                  <div key={url} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 ring-2 ring-brand-400">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNew(i)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/90 text-white">
                      Nouveau
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">Cliquer pour ajouter des photos</span>
              <span className="text-xs">JPG, PNG, WebP — 5 Mo max par image</span>
            </button>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp"
              className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Pied */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 rounded-b-2xl">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : initial?.id ? 'Enregistrer les modifications' : 'Créer la chambre'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function AdminRoomsPage() {
  const [filters, setFilters]   = useState({});
  const [search, setSearch]     = useState('');
  const { data, loading, refetch } = useRooms(filters, { admin: true });

  const [editing, setEditing]   = useState(null);
  const [showForm, setShowForm] = useState(false);

  /* Suppression unitaire */
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy]         = useState(false);

  /* Sélection multiple */
  const [selected, setSelected]       = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy]       = useState(false);

  /* Réinitialiser la sélection quand les données changent */
  useEffect(() => { setSelected(new Set()); }, [data]);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit   = (r)  => { setEditing(r);   setShowForm(true); };

  /* Suppression unitaire */
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

  /* Suppression multiple */
  const bulkRemove = async () => {
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      const results = await Promise.allSettled(ids.map((id) => adminRoomsApi.remove(id)));
      const failed  = results.filter((r) => r.status === 'rejected').length;
      const success = results.length - failed;

      if (success > 0) toast.success(`${success} chambre${success > 1 ? 's' : ''} supprimée${success > 1 ? 's' : ''}.`);
      if (failed  > 0) toast.error(`${failed} suppression${failed > 1 ? 's' : ''} ont échoué.`);

      setBulkConfirm(false);
      setSelected(new Set());
      refetch();
    } catch {
      toast.error('Suppression impossible.');
    } finally {
      setBulkBusy(false);
    }
  };

  const getPrimaryImage = (r) =>
    r.images?.find((i) => i.is_primary) || r.images?.[0];

  const columns = [
    {
      key: 'photo', label: '',
      render: (r) => {
        const img = getPrimaryImage(r);
        return img
          ? <img src={img.url} alt="" className="h-10 w-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
          : (
            <div className="h-10 w-14 rounded-lg bg-gray-100 flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-gray-300" />
            </div>
          );
      },
    },
    {
      key: 'room_number', label: 'N°',
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-900">{r.room_number}</span>
          {r.images?.length > 1 && (
            <span className="ml-1.5 text-[11px] text-gray-400">{r.images.length} photos</span>
          )}
        </div>
      ),
    },
    { key: 'room_type', label: 'Type',     render: (r) => TYPE_LABELS[r.room_type] ?? r.room_type },
    { key: 'capacity',  label: 'Capacité', render: (r) => `${r.capacity} pers.` },
    {
      key: 'amenities', label: 'Équipements',
      render: (r) => {
        const icons = {
          wifi:          <Wifi className="h-3.5 w-3.5" />,
          climatisation: <Wind className="h-3.5 w-3.5" />,
          tv:            <Tv   className="h-3.5 w-3.5" />,
          minibar:       <Beer className="h-3.5 w-3.5" />,
        };
        return r.amenities?.length > 0
          ? (
            <div className="flex flex-wrap gap-1">
              {r.amenities.map((a) => (
                <span key={a} title={AMENITY_OPTIONS.find((o) => o.value === a)?.label ?? a}
                  className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {icons[a]}
                  <span>{AMENITY_OPTIONS.find((o) => o.value === a)?.label ?? a}</span>
                </span>
              ))}
            </div>
          )
          : <span className="text-gray-400 text-xs">—</span>;
      },
    },
    {
      key: 'price', label: 'Prix / nuit',
      render: (r) => <span className="font-semibold text-brand-600">{formatXOF(r.price_per_night)}</span>,
    },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600"
            onClick={() => openEdit(r)} title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="btn-ghost p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600"
            onClick={() => setToDelete(r)} title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const selectedCount = selected.size;

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-brand-500" /> Chambres
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {Array.isArray(data) ? data.length : 0} chambre{data?.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
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
              onChange={(e) => { setSearch(e.target.value); setFilters((f) => ({ ...f, search: e.target.value })); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select className="input w-auto" onChange={(e) => setFilters((f) => ({ ...f, room_type: e.target.value }))}>
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select className="input w-auto" onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="occupied">Occupée</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Barre d'action bulk — visible seulement quand ≥ 1 sélectionné */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-700">
            <ShieldAlert className="h-4 w-4" />
            <span>
              {selectedCount} chambre{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-sm px-3 py-1.5"
              onClick={() => setSelected(new Set())}
            >
              Désélectionner tout
            </button>
            <button
              className="btn-danger text-sm px-3 py-1.5"
              onClick={() => setBulkConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer la sélection ({selectedCount})
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="Aucune chambre trouvée."
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
        />
      </div>

      {/* Modal formulaire */}
      <RoomFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); refetch(); }}
        initial={editing}
      />

      {/* Modal suppression unitaire */}
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

      {/* Modal suppression multiple */}
      <ConfirmModal
        open={bulkConfirm}
        title={`Supprimer ${selectedCount} chambre${selectedCount > 1 ? 's' : ''}`}
        message={`Vous allez supprimer définitivement ${selectedCount} chambre${selectedCount > 1 ? 's' : ''} ainsi que toutes leurs photos et réservations associées. Cette action est irréversible.`}
        variant="danger"
        confirmLabel={`Supprimer ${selectedCount} chambre${selectedCount > 1 ? 's' : ''}`}
        loading={bulkBusy}
        onClose={() => setBulkConfirm(false)}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
