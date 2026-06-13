import { useEffect, useRef, useState } from 'react';
import {
  BedDouble, Filter, Image as ImageIcon, Loader2, Pencil, Plus,
  Search, Star, Trash2, Upload, Wifi, Wind, Tv, Beer, X, ShieldAlert,
  ChevronRight, Users, LayoutGrid, Info, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useRooms }        from '../../hooks/useRooms';
import { useAutoRefresh }  from '../../hooks/useAutoRefresh';
import { adminRoomsApi } from '../../api/rooms.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import ModalPortal from '../../components/common/ModalPortal';
import { formatXOF } from '../../utils/formatCurrency';

/* ─── Constantes ──────────────────────────────────────────────────────────── */
const TYPES = ['simple', 'double', 'suite', 'familiale'];
const TYPE_LABELS = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };
const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'WiFi', Icon: Wifi },
  { value: 'climatisation', label: 'Climatisation', Icon: Wind },
  { value: 'tv', label: 'TV', Icon: Tv },
  { value: 'minibar', label: 'Mini-bar', Icon: Beer },
];

/* ─── Modal formulaire ────────────────────────────────────────────────────── */
function RoomFormModal({ open, onClose, onSaved, initial }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { room_type: 'simple', status: 'available', capacity: 1, amenities: [] },
  });
  const [submitting, setSubmitting] = useState(false);
  // Statut verrouillé (géré automatiquement) si la chambre est occupée/réservée
  const lockedStatus = ['occupied', 'reserved'].includes(initial?.status);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      reset(initial ? {
        room_number: initial.room_number,
        room_type: initial.room_type,
        price_per_night: initial.price_per_night,
        capacity: initial.capacity,
        status: initial.status,
        description: initial.description ?? '',
        amenities: initial.amenities ?? [],
      } : { room_type: 'simple', status: 'available', capacity: 1, amenities: [] });
      setExistingImages(initial?.images ?? []);
      setNewFiles([]);
      setPreviews([]);
    }
  }, [open, initial, reset]);

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowed = files.filter((f) => f.size <= 5 * 1024 * 1024);
    if (allowed.length < files.length) toast.error('Certaines photos sont trop lourdes - maximum 5 Mo par image.');
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
      toast.error('Impossible de supprimer cette photo. Réessayez.');
    } finally {
      setDeletingId(null);
    }
  };

  const setPrimary = async (img) => {
    try {
      await adminRoomsApi.setPrimaryImage(initial.id, img.id);
      setExistingImages((p) => p.map((i) => ({ ...i, is_primary: i.id === img.id })));
    } catch {
      toast.error('Impossible de définir cette photo comme principale. Réessayez.');
    }
  };

  const submit = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('room_number', values.room_number);
      formData.append('room_type', values.room_type);
      formData.append('price_per_night', Number(values.price_per_night));
      formData.append('capacity', Number(values.capacity));
      formData.append('status', values.status);
      if (values.description) formData.append('description', values.description);
      (values.amenities ?? []).forEach((a) => formData.append('amenities[]', a));
      newFiles.forEach((f) => formData.append('images[]', f));

      if (initial?.id) await adminRoomsApi.update(initial.id, formData);
      else await adminRoomsApi.create(formData);
      
      toast.success(initial?.id ? 'Les informations de la chambre ont bien été mises à jour.' : 'Chambre créée et disponible à la réservation.');
      onSaved();
    } catch (e) {
      if (e.response?.status !== 422) toast.error("Impossible d'enregistrer la chambre. Vérifiez les informations et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const amenities = watch('amenities') ?? [];
  const toggleAmenity = (val) => setValue('amenities', amenities.includes(val) ? amenities.filter((v) => v !== val) : [...amenities, val]);

  if (!open) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-blue-600" />
            {initial?.id ? 'Modifier la chambre' : 'Nouvelle chambre'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col max-h-[85vh]">
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Numéro</label>
                <input className="w-full p-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors" placeholder="101" {...register('room_number', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                <div className="relative">
                  <select className="w-full appearance-none p-3 pr-9 text-sm font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors cursor-pointer" {...register('room_type')}>
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Prix / nuit (XOF)</label>
                <input type="number" className="w-full p-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors" placeholder="25000" {...register('price_per_night', { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Capacité</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="number" className="w-full p-3 pl-10 text-sm font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors" min={1} max={10} {...register('capacity', { required: true, valueAsNumber: true })} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
              <textarea className="w-full p-3 text-sm font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors min-h-[80px]" rows={2} placeholder="Description courte..." {...register('description')} />
            </div>

            {/* Statut / maintenance */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Statut</label>
              <div className="relative">
                <select
                  className="w-full appearance-none p-3 pr-9 text-sm font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  {...register('status')}
                  disabled={lockedStatus}
                >
                  <option value="available">Disponible</option>
                  <option value="maintenance">En maintenance (réparations)</option>
                  {lockedStatus && (
                    <option value={initial.status}>
                      {initial.status === 'occupied' ? 'Occupée' : 'Réservée'}
                    </option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              {lockedStatus
                ? <p className="text-[11px] text-slate-400 ml-1">Statut géré automatiquement (chambre {initial.status === 'occupied' ? 'occupée' : 'réservée'}).</p>
                : <p className="text-[11px] text-slate-400 ml-1">Mettez la chambre « En maintenance » lors de réparations : elle n&apos;apparaîtra plus côté client.</p>
              }
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Équipements</label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITY_OPTIONS.map(({ value, label, Icon }) => {
                  const checked = amenities.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => toggleAmenity(value)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${checked ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm shadow-blue-100' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}>
                      <Icon className={`h-4 w-4 ${checked ? 'text-blue-600' : 'text-slate-400'}`} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Photos</label>
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.is_primary && <div className="absolute top-2 left-2 bg-amber-500 text-white p-1 rounded-lg shadow-lg"><Star className="h-3 w-3 fill-current" /></div>}
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!img.is_primary && <button type="button" onClick={() => setPrimary(img)} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"><Star className="h-4 w-4" /></button>}
                      <button type="button" onClick={() => removeExisting(img)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                {previews.map((url, i) => (
                  <div key={url} className="relative aspect-video rounded-xl overflow-hidden bg-blue-50 border-2 border-blue-200 ring-4 ring-blue-50/50 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNew(i)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow-lg"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} className="aspect-video rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-500 transition-all">
                  <Upload className="h-6 w-6" />
                  <span className="text-[10px] font-black uppercase">Ajouter</span>
                </button>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button type="button" className="px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-200 rounded-xl transition-colors" onClick={onClose}>Annuler</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : initial?.id ? 'Mettre à jour' : 'Créer la chambre'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function AdminRoomsPage() {
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const { data, loading, refetch } = useRooms(filters, { admin: true });
  const [editing, setEditing] = useState(null);

  // Rafraîchissement automatique : le statut des chambres change lors des check-in/out
  useAutoRefresh(
    ['checkin.done', 'checkout.done', 'reservation.cancelled'],
    () => refetch(),
  );
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => { setSelected(new Set()); }, [data]);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setShowForm(true); };

  const remove = async () => {
    setBusy(true);
    try {
      await adminRoomsApi.remove(toDelete.id);
      toast.success(`La chambre N° ${toDelete.room_number} a été supprimée définitivement.`);
      setToDelete(null);
      refetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Impossible de supprimer cette chambre. Elle est peut-être liée à une réservation active.'); }
    finally { setBusy(false); }
  };

  const bulkRemove = async () => {
    setBulkBusy(true);
    try {
      await Promise.allSettled(Array.from(selected).map(id => adminRoomsApi.remove(id)));
      toast.success(`${selected.size} chambre${selected.size > 1 ? 's supprimées' : ' supprimée'} avec succès.`);
      setBulkConfirm(false);
      setSelected(new Set());
      refetch();
    } catch { toast.error('Certaines chambres n\'ont pas pu être supprimées. Réessayez.'); }
    finally { setBulkBusy(false); }
  };

  const columns = [
    {
      key: 'photo', label: '',
      render: (r) => {
        const img = r.images?.find(i => i.is_primary) || r.images?.[0];
        return (
          <div className="h-12 w-20 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm flex-shrink-0 bg-slate-50">
            {img ? <img src={img.url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-3 text-slate-300" />}
          </div>
        );
      },
    },
    {
      key: 'room_number', label: 'Numéro',
      render: (r) => (
        <div>
          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">N° {r.room_number}</span>
          {r.images?.length > 0 && <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{r.images.length} photos</p>}
        </div>
      ),
    },
    { key: 'room_type', label: 'Type', render: (r) => <span className="text-sm font-bold text-slate-700 uppercase tracking-tighter">{TYPE_LABELS[r.room_type] || r.room_type}</span> },
    { key: 'capacity', label: 'Cap.', render: (r) => <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600 border border-slate-200"><Users className="h-3 w-3" /> {r.capacity}</span> },
    {
      key: 'price', label: 'Prix / nuit',
      render: (r) => <span className="text-sm font-black text-slate-900 tabular-nums">{formatXOF(r.price_per_night)}</span>,
    },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100" onClick={() => openEdit(r)} title="Modifier"><Pencil className="h-4 w-4" /></button>
          <button className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100" onClick={() => setToDelete(r)} title="Supprimer"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <LayoutGrid className="h-7 w-7 text-blue-600" />
            Gestion des Chambres
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            <span className="text-blue-700 font-black">{data?.length || 0}</span> chambres configurées
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-blue-100 flex items-center gap-2 transition-all active:scale-95" onClick={openCreate}>
          <Plus className="h-5 w-5" /> Nouvelle chambre
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
          <input className="w-full pl-11 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400" placeholder="Rechercher par numéro..." value={search} onChange={(e) => { setSearch(e.target.value); setFilters(f => ({ ...f, search: e.target.value })); }} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border-2 border-slate-100">
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <div className="relative">
              <select className="appearance-none bg-transparent text-xs font-black text-slate-700 uppercase tracking-tighter focus:outline-none cursor-pointer pr-5" onChange={(e) => setFilters(f => ({ ...f, room_type: e.target.value }))}>
                <option value="">Tous les types</option>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border-2 border-slate-100">
            <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <div className="relative">
              <select className="appearance-none bg-transparent text-xs font-black text-slate-700 uppercase tracking-tighter focus:outline-none cursor-pointer pr-5" onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">Tous les statuts</option>
                <option value="available">Disponible</option>
                <option value="reserved">Réservée</option>
                <option value="occupied">Occupée</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-red-50 border-2 border-red-100 rounded-3xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 text-sm font-black text-red-700">
            <ShieldAlert className="h-5 w-5" />
            {selected.size} chambre{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-700" onClick={() => setSelected(new Set())}>Annuler</button>
            <button className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-red-100" onClick={() => setBulkConfirm(true)}>Supprimer la sélection</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="Aucune chambre trouvée." selectable selectedIds={selected} onSelectionChange={setSelected} />
      </div>

      <RoomFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refetch(); }} initial={editing} />
      
      <ConfirmModal open={!!toDelete} title="Supprimer" message={`Voulez-vous supprimer la chambre N° ${toDelete?.room_number} ?`} variant="danger" confirmLabel="Supprimer" loading={busy} onClose={() => setToDelete(null)} onConfirm={remove} />
      <ConfirmModal open={bulkConfirm} title="Suppression multiple" message={`Supprimer ${selected.size} chambres ?`} variant="danger" confirmLabel="Supprimer" loading={bulkBusy} onClose={() => setBulkConfirm(false)} onConfirm={bulkRemove} />
    </div>
  );
}
