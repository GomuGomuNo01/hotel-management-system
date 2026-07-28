import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ChevronLeft, Loader2, Save, Shield, Zap, Info,
  User, Phone, FileText, Upload, Camera,
  IdCard, Eye, Trash2,
} from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import { usePdfViewer } from '../../store/pdfViewerStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PhotoLightbox from '../../components/common/PhotoLightbox';
import PhoneInputWithCode from '../../components/common/PhoneInputWithCode';
import SelectInput from '../../components/common/SelectInput';
import {
  PERMISSION_GROUPS, ALL_PERMISSIONS, ROLES, ID_DOCUMENT_TYPES, cropImageToSquare,
} from '../../components/owner/adminForm/config';


/* ─── Schéma de validation ───────────────────────────────────── */
const schema = z.object({
  first_name:              z.string().min(1, 'Le prénom est requis').max(80),
  last_name:               z.string().min(1, 'Le nom est requis').max(80),
  email:                   z.string().email('Adresse e-mail invalide'),
  phone:                   z.string().max(20).optional().or(z.literal('')),
  date_of_birth:           z.string().optional().or(z.literal('')),
  place_of_birth:          z.string().max(150).optional().or(z.literal('')),
  gender:                  z.enum(['', 'male', 'female', 'other']).optional(),
  address_line:            z.string().max(200).optional().or(z.literal('')),
  city:                    z.string().max(100).optional().or(z.literal('')),
  id_document_type:        z.string().optional().or(z.literal('')),
  id_document_number:      z.string().max(50).optional().or(z.literal('')),
  emergency_contact_name:  z.string().max(120).optional().or(z.literal('')),
  emergency_contact_phone: z.string().max(20).optional().or(z.literal('')),
  job_title:               z.string().max(80).optional().or(z.literal('')),
  hired_at:                z.string().optional().or(z.literal('')),
  bio:                     z.string().max(2000).optional().or(z.literal('')),
  role:                    z.string().min(1, 'Le rôle est requis'),
  permissions:             z.array(z.string()).default([]),
});


/* ─── Composant principal ─────────────────────────────────────── */
export default function AdminFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading]       = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [identityPhoto, setIdentityPhoto] = useState(null);          // File (photo de profil)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);            // URL affichable (objet ou existante)
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const photoInputRef = useRef(null);
  // Pièces d'identité (liste) — items : { key, name, file?, path?, url?, isNew }
  const [docs, setDocs] = useState([]);
  const docKeyRef = useRef(0);
  const docInputRef = useRef(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '', last_name: '', email: '', phone: '',
      date_of_birth: '', place_of_birth: '',
      gender: '',
      address_line: '', city: '',
      id_document_type: '', id_document_number: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      job_title: '', hired_at: '', bio: '',
      role: 'manager', permissions: [],
    },
  });

  const selected     = watch('permissions') || [];
  const currentRole  = watch('role');
  const roleInfo     = ROLES.find((r) => r.value === currentRole);

  /* URL d'aperçu de la photo de profil (fichier local ou photo existante) */
  useEffect(() => {
    if (identityPhoto) {
      const url = URL.createObjectURL(identityPhoto);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPhotoPreview(existingPhotoUrl || null);
  }, [identityPhoto, existingPhotoUrl]);

  /* Chargement en mode édition */
  useEffect(() => {
    if (!isEdit) return;
    ownerApi.admins.get(id).then((res) => {
      const a = res?.data ?? res;
      reset({
        first_name:              a.first_name              ?? '',
        last_name:               a.last_name               ?? '',
        email:                   a.email                   ?? '',
        phone:                   a.phone                   ?? '',
        date_of_birth:           a.date_of_birth           ?? '',
        place_of_birth:          a.place_of_birth          ?? '',
        gender:                  a.gender                  ?? '',
        address_line:            a.address_line            ?? '',
        city:                    a.city                    ?? '',
        id_document_type:        a.id_document_type        ?? '',
        id_document_number:      a.id_document_number      ?? '',
        emergency_contact_name:  a.emergency_contact_name  ?? '',
        emergency_contact_phone: a.emergency_contact_phone ?? '',
        job_title:               a.job_title               ?? '',
        hired_at:                a.hired_at                ?? '',
        bio:                     a.bio                     ?? '',
        role:                    a.role                    ?? 'manager',
        permissions:             (a.permissions || []).map((p) => p.permission_key || p),
      });
      if (a.profile_photo) setExistingPhotoUrl(a.profile_photo);
      if (Array.isArray(a.id_documents)) {
        setDocs(a.id_documents.map((d) => ({
          key:   `existing-${d.path}`,
          name:  d.name || d.path?.split('/').pop() || 'Document',
          path:  d.path,
          isNew: false,
        })));
      }
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- (re)chargement uniquement quand l'id change (isEdit/reset stables)
  }, [id]);

  /* Permissions */
  const togglePerm = (key) => {
    const next = selected.includes(key) ? selected.filter((p) => p !== key) : [...selected, key];
    setValue('permissions', next, { shouldDirty: true });
  };
  const applyPreset = () => {
    if (!roleInfo) return;
    setValue('permissions', [...roleInfo.preset], { shouldDirty: true });
    toast.success(`Permissions recommandées pour « ${roleInfo.label} » appliquées.`);
  };
  const toggleAll = () => {
    setValue('permissions',
      selected.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS,
      { shouldDirty: true }
    );
  };

  /* Pièces d'identité (liste) */
  const addDocs = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setDocs((prev) => {
      const room = Math.max(0, 10 - prev.length);
      if (room <= 0) {
        toast.error('Maximum 10 documents.');
        return prev;
      }
      const added = files.slice(0, room).map((file) => ({
        key:   `new-${docKeyRef.current++}`,
        name:  file.name,
        file,
        isNew: true,
      }));
      return [...prev, ...added];
    });
  };

  const removeDoc = (key) => setDocs((prev) => prev.filter((d) => d.key !== key));

  const viewDoc = (doc) => {
    // Même logique que le profil client : ouverture dans le lecteur latéral global.
    // Documents existants : flux authentifié (disque privé) ; nouveaux : fichier local.
    const fetchBlob = doc.isNew
      ? () => Promise.resolve(doc.file)
      : () => ownerApi.admins.idDocumentBlob(id, doc.path);
    usePdfViewer.getState().view(doc.name, doc.name, fetchBlob, "Impossible d'afficher ce document.");
  };

  /* Soumission */
  const submit = async (values) => {
    setSubmitting(true);
    try {
      const fd = new FormData();

      // Champs texte
      const textFields = [
        'first_name','last_name','email','phone',
        'date_of_birth','place_of_birth','gender',
        'address_line','city',
        'id_document_type','id_document_number',
        'emergency_contact_name','emergency_contact_phone',
        'job_title','hired_at','bio','role',
      ];
      textFields.forEach((f) => { if (values[f]) fd.append(f, values[f]); });

      // Permissions
      (values.permissions || []).forEach((p) => fd.append('permissions[]', p));

      // Photo de profil
      if (identityPhoto) fd.append('identity_photo', identityPhoto);

      // Pièces d'identité (liste)
      docs.filter((d) => d.isNew).forEach((d) => fd.append('id_documents[]', d.file));
      if (isEdit) {
        // État souhaité : on conserve les documents existants encore présents,
        // le backend supprime ceux qui ont été retirés.
        fd.append('sync_documents', '1');
        docs.filter((d) => !d.isNew).forEach((d) => fd.append('existing_documents[]', d.path));
      }

      if (isEdit) {
        await ownerApi.admins.update(id, fd);
        toast.success(`Les informations de ${values.last_name} ${values.first_name} ont bien été mises à jour.`);
      } else {
        await ownerApi.admins.create(fd);
        toast.success(
          `Le compte de ${values.last_name} ${values.first_name} a été créé. Les identifiants de connexion ont été envoyés par e-mail.`,
          { duration: 6000 }
        );
      }
      navigate('/owner/admins');
    } catch (e) {
      if (e.response?.status !== 422) {
        toast.error("Impossible d'enregistrer. Vérifiez les informations et réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/owner/admins" className="text-sm text-brand-600 inline-flex items-center gap-1 hover:underline">
          <ChevronLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          {isEdit ? "Modifier l'administrateur" : 'Créer un nouvel administrateur'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEdit
            ? 'Mettez à jour les informations, le rôle, les permissions ou les documents de cet administrateur.'
            : "Remplissez le formulaire. Un mot de passe temporaire sera généré et envoyé automatiquement par e-mail."}
        </p>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-6">

        {/* ── 1. Identité ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <User className="h-4 w-4 text-brand-500" /> Identité
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom <span className="text-red-500">*</span></label>
              <input className="input" {...register('first_name')} placeholder="ex. Mamadou" />
              {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Nom <span className="text-red-500">*</span></label>
              <input className="input" {...register('last_name')} placeholder="ex. Diallo" />
              {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="label">Date de naissance</label>
              <input type="date" className="input" {...register('date_of_birth')}
                max={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Lieu de naissance</label>
              <input className="input" {...register('place_of_birth')} placeholder="ex. Abidjan" />
            </div>
            <div>
              <SelectInput label="Genre" {...register('gender')}>
                <option value="">- Choisir -</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
                <option value="other">Autre</option>
              </SelectInput>
            </div>
            <div>
              <label className="label">Date d'embauche</label>
              <input type="date" className="input" {...register('hired_at')}
                max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
        </div>

        {/* ── 2. Contact & Adresse ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand-500" /> Contact & Adresse
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Adresse e-mail professionnelle <span className="text-red-500">*</span></label>
              <input type="email" className="input" {...register('email')} placeholder="admin@hotel.com" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              {!isEdit && (
                <p className="text-xs text-gray-400 mt-1">
                  Les identifiants de connexion seront envoyés à cette adresse.
                </p>
              )}
            </div>
            <div>
              <PhoneInputWithCode
                label="Téléphone"
                value={watch('phone') || ''}
                onChange={(v) => setValue('phone', v, { shouldDirty: true })}
                error={errors.phone?.message}
              />
            </div>
            <div>
              <label className="label">Adresse</label>
              <input className="input" {...register('address_line')} placeholder="ex. 12 Rue des Palmiers" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input className="input" {...register('city')} placeholder="ex. Abidjan" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Contact d'urgence</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nom complet de la personne à contacter</label>
                <input className="input" {...register('emergency_contact_name')} placeholder="ex. Fatou Traoré" />
              </div>
              <div>
                <PhoneInputWithCode
                  label="Téléphone du contact"
                  value={watch('emergency_contact_phone') || ''}
                  onChange={(v) => setValue('emergency_contact_phone', v, { shouldDirty: true })}
                  error={errors.emergency_contact_phone?.message}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Photo de profil ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand-500" /> Photo de profil
          </h2>
          <p className="text-xs text-gray-500 -mt-2">
            Cette image sera affichée comme photo de profil du compte de l'administrateur.
          </p>

          <div className="flex items-center gap-5">
            <div className="relative group">
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Photo de profil"
                    className="h-24 w-24 rounded-full object-cover border-2 border-brand-200"
          loading="lazy"
          decoding="async"
        />
                  {/* Overlay œil : consulter la photo en grand */}
                  <button
                    type="button"
                    onClick={() => setPhotoLightbox(true)}
                    className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Consulter la photo"
                  >
                    <Eye className="h-6 w-6 text-white" />
                  </button>
                </>
              ) : (
                <div className="h-24 w-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold">
                  {`${watch('last_name')?.[0] ?? ''}${watch('first_name')?.[0] ?? ''}`.toUpperCase() || <User className="h-8 w-8" />}
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                type="file"
                ref={photoInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    setIdentityPhoto(await cropImageToSquare(file, 400));
                  } catch {
                    setIdentityPhoto(file); // repli : on garde le fichier brut
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => photoInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    className="btn-ghost text-red-600"
                    onClick={() => { setIdentityPhoto(null); setExistingPhotoUrl(null); }}
                  >
                    <Trash2 className="h-4 w-4" /> Retirer
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">JPEG / PNG / WebP - 4 Mo max.</p>
            </div>
          </div>
        </div>

        {/* ── 4. Pièce d'identité ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <IdCard className="h-4 w-4 text-brand-500" /> Pièce d'identité
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            <div>
              <SelectInput label="Type de document" {...register('id_document_type')}>
                {ID_DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </SelectInput>
            </div>

            {/* Documents justificatifs (liste — même logique que le profil client) */}
            <div>
              <label className="label">Documents justificatifs</label>
            <input
              type="file"
              ref={docInputRef}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => { addDocs(e.target.files); e.target.value = ''; }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => docInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Ajouter un document
            </button>
            <p className="text-xs text-gray-400 mt-2">JPEG / PNG / WEBP / PDF - 5 Mo max. par fichier.</p>
            </div>
          </div>

          {/* Liste des documents — pleine largeur */}
          {docs.length > 0 && (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li
                  key={doc.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => viewDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5" /> Consulter
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDoc(doc.key)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200"
                      aria-label="Retirer le document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── 5. Rôle ── */}
        <div className="card card-pad space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-500" /> Rôle
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`relative flex flex-col gap-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  currentRole === r.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input type="radio" className="sr-only" value={r.value} {...register('role')} />
                <span className="font-semibold text-sm text-gray-900">{r.label}</span>
                <span className="text-xs text-gray-500 leading-relaxed">{r.description}</span>
                {currentRole === r.value && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-500" />}
              </label>
            ))}
          </div>
          {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
        </div>

        {/* ── 6. Permissions ── */}
        <div className="card card-pad space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-800">Permissions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choisissez précisément ce que cet administrateur peut faire.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
              {roleInfo && (
                <button type="button" onClick={applyPreset} className="btn-ghost text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Suggestion {roleInfo.label}
                </button>
              )}
              <button type="button" onClick={toggleAll} className="btn-ghost text-xs">
                {selected.length === ALL_PERMISSIONS.length ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>
          </div>

          {roleInfo && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Pour un rôle <strong>{roleInfo.label}</strong>, nous recommandons :{' '}
                {roleInfo.preset.map((p) => {
                  const item = PERMISSION_GROUPS.flatMap((g) => g.items).find((i) => i.key === p);
                  return item?.label ?? p;
                }).join(', ')}.
              </span>
            </div>
          )}

          <div className="space-y-5">
            {PERMISSION_GROUPS.map(({ group, items }) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{group}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map(({ key, label, description, Icon, warning }) => {
                    const checked = selected.includes(key);
                    // Couleurs spéciales pour les permissions sensibles (warning)
                    const checkedBg    = warning ? 'border-amber-400 bg-amber-50'      : 'border-brand-400 bg-brand-50';
                    const uncheckedBg  = warning ? 'border-amber-200 hover:border-amber-300 bg-amber-50/30' : 'border-gray-200 hover:border-gray-300 bg-white';
                    const iconChecked  = warning ? 'bg-amber-100 text-amber-600'       : 'bg-brand-100 text-brand-600';
                    const tickChecked  = warning ? 'bg-amber-500 border-amber-500'     : 'bg-brand-500 border-brand-500';
                    const textChecked  = warning ? 'text-amber-800'                    : 'text-brand-800';
                    return (
                      <label key={key}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          checked ? checkedBg : uncheckedBg
                        }`}
                      >
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePerm(key)} />
                        <span className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${
                          checked ? iconChecked : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${checked ? textChecked : 'text-gray-700'}`}>
                            {label}
                            {warning && (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                Sensible
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                        </div>
                        <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          checked ? tickChecked : 'border-gray-300'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-right">
            {selected.length} / {ALL_PERMISSIONS.length} permission{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between">
          <Link to="/owner/admins" className="btn-ghost">Annuler</Link>
          <button type="submit" className="btn-primary min-w-44" disabled={submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : <><Save className="h-4 w-4" /> {isEdit ? 'Enregistrer les modifications' : "Créer l'administrateur"}</>
            }
          </button>
        </div>
      </form>

      {/* Lightbox photo de profil */}
      <PhotoLightbox
        open={photoLightbox}
        src={photoPreview}
        alt="Photo de profil"
        onClose={() => setPhotoLightbox(false)}
      />
    </div>
  );
}
