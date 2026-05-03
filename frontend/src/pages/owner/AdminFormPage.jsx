import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ChevronLeft, Loader2, Save, BedDouble, Calendar, Users,
  ArrowRightToLine, Banknote, BarChart2, Shield, Zap, Info,
  User, Phone, FileText, Upload, X, Camera,
} from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PhoneInputWithCode from '../../components/common/PhoneInputWithCode';
import SelectInput from '../../components/common/SelectInput';

/* ─── Permissions par groupe ──────────────────────────────────── */
const PERMISSION_GROUPS = [
  {
    group: 'Hébergement',
    items: [
      { key: 'manage_rooms',             label: 'Gestion des chambres',      description: 'Créer, modifier et supprimer les chambres, types et tarifs.', Icon: BedDouble },
      { key: 'manage_checkin_checkout',  label: 'Check-in / Check-out',      description: 'Valider les arrivées et départs des clients.',               Icon: ArrowRightToLine },
    ],
  },
  {
    group: 'Réservations & Clients',
    items: [
      { key: 'manage_reservations', label: 'Gestion des réservations', description: 'Consulter, modifier et annuler les réservations.',                    Icon: Calendar },
      { key: 'manage_clients',      label: 'Gestion des clients',      description: 'Accéder aux profils clients et modifier leurs informations.',          Icon: Users },
    ],
  },
  {
    group: 'Finances',
    items: [
      { key: 'manage_payments', label: 'Paiements & Remboursements', description: 'Enregistrer les paiements espèces et gérer les demandes de remboursement.', Icon: Banknote },
    ],
  },
  {
    group: 'Rapports & Audit',
    items: [
      { key: 'view_reports',       label: 'Rapports financiers',        description: "Consulter les statistiques de revenus, taux d'occupation, etc.", Icon: BarChart2 },
      { key: 'view_audit_summary', label: "Journal d'audit (résumé)",   description: 'Voir un résumé des actions réalisées — sans accès aux détails complets.', Icon: Shield },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

/* ─── Rôles ───────────────────────────────────────────────────── */
const ROLES = [
  { value: 'manager',      label: 'Manager',        description: "Accès complet à la gestion opérationnelle de l'hôtel.", preset: ALL_PERMISSIONS },
  { value: 'receptionist', label: 'Réceptionniste', description: 'Gère les arrivées, départs et les réservations au quotidien.', preset: ['manage_reservations', 'manage_clients', 'manage_checkin_checkout'] },
  { value: 'accountant',   label: 'Comptable',      description: 'Accès aux finances, paiements et rapports uniquement.', preset: ['manage_payments', 'view_reports', 'view_audit_summary'] },
];

/* ─── Type de document ────────────────────────────────────────── */
const ID_DOCUMENT_TYPES = [
  { value: '',             label: '— Choisir —' },
  { value: 'passport',     label: 'Passeport' },
  { value: 'national_id',  label: "Carte nationale d'identité" },
  { value: 'driver_license', label: 'Permis de conduire' },
];

/* ─── Schéma de validation ───────────────────────────────────── */
const schema = z.object({
  first_name:              z.string().min(1, 'Le prénom est requis').max(80),
  last_name:               z.string().min(1, 'Le nom est requis').max(80),
  email:                   z.string().email('Adresse e-mail invalide'),
  phone:                   z.string().max(20).optional().or(z.literal('')),
  date_of_birth:           z.string().optional().or(z.literal('')),
  place_of_birth:          z.string().max(150).optional().or(z.literal('')),
  gender:                  z.enum(['', 'male', 'female', 'other']).optional(),
  nationality:             z.string().max(80).optional().or(z.literal('')),
  address_line:            z.string().max(200).optional().or(z.literal('')),
  city:                    z.string().max(100).optional().or(z.literal('')),
  postal_code:             z.string().max(20).optional().or(z.literal('')),
  country:                 z.string().max(100).optional().or(z.literal('')),
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

/* ─── Composant de prévisualisation de fichier ───────────────── */
function FilePreview({ file, existingUrl, label, onClear, accept, onChange, icon: Icon }) {
  const inputRef = useRef(null);
  const previewUrl = file ? URL.createObjectURL(file) : existingUrl;
  const isImage = file ? file.type.startsWith('image/') : (existingUrl && !existingUrl.endsWith('.pdf'));

  return (
    <div>
      <p className="label flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      {previewUrl ? (
        <div className="relative inline-flex flex-col items-start gap-1.5">
          {isImage ? (
            <img src={previewUrl} alt={label} className="h-28 w-28 object-cover rounded-xl border border-gray-200 shadow-sm" />
          ) : (
            <a href={previewUrl} target="_blank" rel="noreferrer"
               className="flex items-center gap-2 text-sm text-brand-600 underline bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              <FileText className="h-4 w-4" /> Voir le document
            </a>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="text-xs btn-ghost flex items-center gap-1">
              <Upload className="h-3 w-3" /> Remplacer
            </button>
            <button type="button" onClick={onClear}
              className="text-xs text-red-600 btn-ghost flex items-center gap-1">
              <X className="h-3 w-3" /> Retirer
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer">
          <Upload className="h-5 w-5" />
          <span>Cliquez pour uploader</span>
          <span className="text-xs">{accept?.includes('pdf') ? 'PDF, JPG, PNG — max 5 Mo' : 'JPG, PNG, WEBP — max 4 Mo'}</span>
        </button>
      )}
      <input ref={inputRef} type="file" className="hidden" accept={accept}
        onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

/* ─── Composant principal ─────────────────────────────────────── */
export default function AdminFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading]       = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [identityPhoto, setIdentityPhoto]   = useState(null); // File
  const [documentFile, setDocumentFile]     = useState(null); // File
  const [existingPhotoUrl, setExistingPhotoUrl]   = useState(null);
  const [existingDocUrl, setExistingDocUrl]       = useState(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '', last_name: '', email: '', phone: '',
      date_of_birth: '', place_of_birth: '',
      gender: '', nationality: '',
      address_line: '', city: '', postal_code: '', country: '',
      id_document_type: '', id_document_number: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      job_title: '', hired_at: '', bio: '',
      role: 'manager', permissions: [],
    },
  });

  const selected     = watch('permissions') || [];
  const currentRole  = watch('role');
  const roleInfo     = ROLES.find((r) => r.value === currentRole);

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
        nationality:             a.nationality             ?? '',
        address_line:            a.address_line            ?? '',
        city:                    a.city                    ?? '',
        postal_code:             a.postal_code             ?? '',
        country:                 a.country                 ?? '',
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
      if (a.profile_photo)   setExistingPhotoUrl(a.profile_photo);
      if (a.id_document_path) setExistingDocUrl(a.id_document_path);
    }).finally(() => setLoading(false));
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

  /* Soumission */
  const submit = async (values) => {
    setSubmitting(true);
    try {
      const fd = new FormData();

      // Champs texte
      const textFields = [
        'first_name','last_name','email','phone',
        'date_of_birth','place_of_birth','gender','nationality',
        'address_line','city','postal_code','country',
        'id_document_type','id_document_number',
        'emergency_contact_name','emergency_contact_phone',
        'job_title','hired_at','bio','role',
      ];
      textFields.forEach((f) => { if (values[f]) fd.append(f, values[f]); });

      // Permissions
      (values.permissions || []).forEach((p) => fd.append('permissions[]', p));

      // Fichiers
      if (identityPhoto) fd.append('identity_photo', identityPhoto);
      if (documentFile)  fd.append('id_document_path', documentFile);

      if (isEdit) {
        await ownerApi.admins.update(id, fd);
        toast.success(`Les informations de ${values.first_name} ${values.last_name} ont bien été mises à jour.`);
      } else {
        await ownerApi.admins.create(fd);
        toast.success(
          `Le compte de ${values.first_name} ${values.last_name} a été créé. Les identifiants de connexion ont été envoyés par e-mail.`,
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
              <label className="label">Nom de famille <span className="text-red-500">*</span></label>
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
                <option value="">— Choisir —</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
                <option value="other">Autre</option>
              </SelectInput>
            </div>
            <div>
              <label className="label">Nationalité</label>
              <input className="input" {...register('nationality')} placeholder="ex. Ivoirienne" />
            </div>
            <div>
              <label className="label">Date d'embauche</label>
              <input type="date" className="input" {...register('hired_at')}
                max={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Bio / Notes</label>
              <textarea rows={2} className="input" {...register('bio')}
                placeholder="Langues parlées, spécialités, notes…" />
            </div>
          </div>
        </div>

        {/* ── 2. Contact & Adresse ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand-500" /> Contact & Adresse
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Adresse e-mail professionnelle <span className="text-red-500">*</span></label>
              <input type="email" className="input" {...register('email')} placeholder="admin@hotel.com" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              {!isEdit && (
                <p className="text-xs text-gray-400 mt-1">
                  Les identifiants de connexion seront envoyés à cette adresse.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <PhoneInputWithCode
                label="Téléphone"
                value={watch('phone') || ''}
                onChange={(v) => setValue('phone', v, { shouldDirty: true })}
                error={errors.phone?.message}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input className="input" {...register('address_line')} placeholder="ex. 12 Rue des Palmiers" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input className="input" {...register('city')} placeholder="ex. Abidjan" />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input className="input" {...register('postal_code')} placeholder="ex. 01 BP 1234" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Pays</label>
              <input className="input" {...register('country')} placeholder="ex. Côte d'Ivoire" />
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

        {/* ── 3. Pièce d'identité ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-500" /> Pièce d'identité
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <SelectInput label="Type de document" {...register('id_document_type')}>
                {ID_DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="label">Numéro du document</label>
              <input className="input" {...register('id_document_number')} placeholder="ex. CI123456789" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <FilePreview
              label="Photo d'identité (visage)"
              icon={Camera}
              file={identityPhoto}
              existingUrl={existingPhotoUrl}
              accept="image/jpeg,image/png,image/webp"
              onChange={setIdentityPhoto}
              onClear={() => { setIdentityPhoto(null); setExistingPhotoUrl(null); }}
            />
            <FilePreview
              label="Scan de la pièce d'identité"
              icon={Upload}
              file={documentFile}
              existingUrl={existingDocUrl}
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={setDocumentFile}
              onClear={() => { setDocumentFile(null); setExistingDocUrl(null); }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Formats acceptés : JPG, PNG, WEBP (photo) · PDF, JPG, PNG (document). Max 5 Mo par fichier.
          </p>
        </div>

        {/* ── 4. Rôle ── */}
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

        {/* ── 5. Permissions ── */}
        <div className="card card-pad space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-800">Permissions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choisissez précisément ce que cet administrateur peut faire.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
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
                  {items.map(({ key, label, description, Icon }) => {
                    const checked = selected.includes(key);
                    return (
                      <label key={key}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          checked ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePerm(key)} />
                        <span className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${
                          checked ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${checked ? 'text-brand-800' : 'text-gray-700'}`}>{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                        </div>
                        <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          checked ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
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
    </div>
  );
}
