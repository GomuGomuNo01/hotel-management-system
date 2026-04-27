import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, MapPin, Calendar, Globe, IdCard,
  ShieldAlert, Languages, Camera, Trash2, KeyRound, Save, Loader2, Heart,
} from 'lucide-react';
import PasswordInput from '../../components/common/PasswordInput';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import { profileApi } from '../../api/profile.api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { cn } from '../../utils/cn';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(80),
  last_name:  z.string().min(1, 'Nom requis').max(80),
  email:      z.string().email('E-mail invalide'),
  phone:      z.string().max(20).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender:     z.enum(['', 'male', 'female', 'other']).optional(),
  nationality: z.string().max(80).optional().or(z.literal('')),
  address_line: z.string().max(200).optional().or(z.literal('')),
  city:        z.string().max(100).optional().or(z.literal('')),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  country:     z.string().max(100).optional().or(z.literal('')),
  id_document_type:   z.enum(['', 'passport', 'national_id', 'driver_license']).optional(),
  id_document_number: z.string().max(50).optional().or(z.literal('')),
  emergency_contact_name:  z.string().max(120).optional().or(z.literal('')),
  emergency_contact_phone: z.string().max(20).optional().or(z.literal('')),
  preferred_language: z.string().max(2).optional().or(z.literal('')),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  password:         z.string().min(8, 'Au moins 8 caractères'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Les mots de passe ne correspondent pas.',
});

const PREFERENCES = ['Lit double', 'Étage élevé', 'Vue jardin', 'Vue piscine', 'Non-fumeur', 'Petit-déjeuner inclus'];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [prefs, setPrefs] = useState([]);

  const {
    register, handleSubmit, reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(profileSchema) });

  const pwdForm = useForm({ resolver: zodResolver(passwordSchema) });

  const fetchProfile = async () => {
    setLoading(true); setError(null);
    try {
      const res = await profileApi.get();
      const data = res?.data ?? res;
      setProfile(data);
      setPrefs(Array.isArray(data.preferences) ? data.preferences : []);
      reset({
        first_name: data.first_name ?? '',
        last_name:  data.last_name ?? '',
        email:      data.email ?? '',
        phone:      data.phone ?? '',
        date_of_birth: data.date_of_birth ?? '',
        gender:     data.gender ?? '',
        nationality: data.nationality ?? '',
        address_line: data.address_line ?? '',
        city:        data.city ?? '',
        postal_code: data.postal_code ?? '',
        country:     data.country ?? '',
        id_document_type: data.id_document_type ?? '',
        id_document_number: data.id_document_number ?? '',
        emergency_contact_name:  data.emergency_contact_name ?? '',
        emergency_contact_phone: data.emergency_contact_phone ?? '',
        preferred_language: data.preferred_language ?? 'fr',
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); /* eslint-disable-next-line */ }, []);

  const onSubmitProfile = async (values) => {
    setSavingProfile(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
      );
      payload.preferences = prefs;
      const res = await profileApi.update(payload);
      const data = res?.data ?? res;
      setProfile(data);
      updateUser(data);
      toast.success('Profil mis à jour.');
      reset(values, { keepValues: true });
    } catch (e) {
      if (e.response?.status !== 422) {
        toast.error(e.response?.data?.message || 'Mise à jour impossible.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const onSubmitPassword = async (values) => {
    setSavingPwd(true);
    try {
      await profileApi.updatePassword(values);
      toast.success('Mot de passe modifié.');
      pwdForm.reset();
    } catch (e) {
      if (e.response?.status !== 422) {
        toast.error('Modification du mot de passe impossible.');
      }
    } finally {
      setSavingPwd(false);
    }
  };

  const onPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await profileApi.uploadPhoto(file);
      const data = res?.data ?? res;
      setProfile(data);
      updateUser(data);
      toast.success('Photo mise à jour.');
    } catch (err) {
      if (err.response?.status !== 422) toast.error('Upload impossible.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onPhotoDelete = async () => {
    setUploading(true);
    try {
      const res = await profileApi.deletePhoto();
      const data = res?.data ?? res;
      setProfile(data);
      updateUser(data);
      toast.success('Photo supprimée.');
    } catch {
      toast.error('Suppression impossible.');
    } finally {
      setUploading(false);
    }
  };

  const togglePref = (p) =>
    setPrefs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  if (loading) return <LoadingSpinner label="Chargement du profil…" />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchProfile} />;

  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-gray-500">Gérez vos informations personnelles, votre photo et vos préférences de séjour.</p>
      </div>

      {/* Photo de profil */}
      <section className="card card-pad">
        <div className="flex items-center gap-5">
          <div className="relative">
            {profile?.profile_photo ? (
              <img
                src={profile.profile_photo}
                alt="Photo de profil"
                className="h-24 w-24 rounded-full object-cover border-2 border-brand-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold">
                {initials || <User className="h-8 w-8" />}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{profile?.full_name}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPhotoSelect}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" /> Changer la photo
              </button>
              {profile?.profile_photo && (
                <button type="button" className="btn-ghost text-red-600" disabled={uploading} onClick={onPhotoDelete}>
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">JPEG / PNG / WebP — 4 Mo max.</p>
          </div>
        </div>
      </section>

      {/* Informations personnelles */}
      <form onSubmit={handleSubmit(onSubmitProfile)} className="card card-pad space-y-6">
        <SectionTitle icon={User}>Informations personnelles</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Prénom" error={errors.first_name?.message}>
            <input className="input" {...register('first_name')} />
          </Field>
          <Field label="Nom" error={errors.last_name?.message}>
            <input className="input" {...register('last_name')} />
          </Field>
          <Field label="E-mail" icon={Mail} error={errors.email?.message}>
            <input className="input" type="email" {...register('email')} />
          </Field>
          <Field label="Téléphone" icon={Phone} error={errors.phone?.message}>
            <input className="input" type="tel" placeholder="+225 07 00 00 00" {...register('phone')} />
          </Field>
          <Field label="Date de naissance" icon={Calendar} error={errors.date_of_birth?.message}>
            <input className="input" type="date" {...register('date_of_birth')} />
          </Field>
          <Field label="Genre" error={errors.gender?.message}>
            <select className="input" {...register('gender')}>
              <option value="">—</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </select>
          </Field>
          <Field label="Nationalité" icon={Globe} error={errors.nationality?.message}>
            <input className="input" {...register('nationality')} />
          </Field>
          <Field label="Langue préférée" icon={Languages} error={errors.preferred_language?.message}>
            <select className="input" {...register('preferred_language')}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>

        <SectionTitle icon={MapPin}>Adresse</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Adresse" className="md:col-span-2" error={errors.address_line?.message}>
            <input className="input" {...register('address_line')} />
          </Field>
          <Field label="Ville" error={errors.city?.message}>
            <input className="input" {...register('city')} />
          </Field>
          <Field label="Code postal" error={errors.postal_code?.message}>
            <input className="input" {...register('postal_code')} />
          </Field>
          <Field label="Pays" error={errors.country?.message}>
            <input className="input" {...register('country')} />
          </Field>
        </div>

        <SectionTitle icon={IdCard}>Pièce d'identité</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Type de document" error={errors.id_document_type?.message}>
            <select className="input" {...register('id_document_type')}>
              <option value="">—</option>
              <option value="passport">Passeport</option>
              <option value="national_id">Carte nationale d'identité</option>
              <option value="driver_license">Permis de conduire</option>
            </select>
          </Field>
          <Field label="Numéro de document" error={errors.id_document_number?.message}>
            <input className="input" {...register('id_document_number')} />
          </Field>
        </div>

        <SectionTitle icon={ShieldAlert}>Contact d'urgence</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom du contact" error={errors.emergency_contact_name?.message}>
            <input className="input" {...register('emergency_contact_name')} />
          </Field>
          <Field label="Téléphone du contact" error={errors.emergency_contact_phone?.message}>
            <input className="input" type="tel" {...register('emergency_contact_phone')} />
          </Field>
        </div>

        <SectionTitle icon={Heart}>Préférences de séjour</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {PREFERENCES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePref(p)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition',
                prefs.includes(p)
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t">
          <button type="submit" className="btn-primary mt-4" disabled={savingProfile}>
            {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</> : <><Save className="h-4 w-4" /> Enregistrer</>}
          </button>
        </div>
      </form>

      {/* Mot de passe */}
      {profile?.provider === 'local' && (
        <form onSubmit={pwdForm.handleSubmit(onSubmitPassword)} className="card card-pad space-y-4">
          <SectionTitle icon={KeyRound}>Sécurité — Mot de passe</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Mot de passe actuel" error={pwdForm.formState.errors.current_password?.message}>
              <PasswordInput autoComplete="current-password" error={pwdForm.formState.errors.current_password} {...pwdForm.register('current_password')} />
            </Field>
            <Field label="Nouveau mot de passe" error={pwdForm.formState.errors.password?.message}>
              <PasswordInput autoComplete="new-password" error={pwdForm.formState.errors.password} {...pwdForm.register('password')} />
              <PasswordStrengthIndicator password={pwdForm.watch('password')} />
            </Field>
            <Field label="Confirmation" error={pwdForm.formState.errors.password_confirmation?.message}>
              <PasswordInput autoComplete="new-password" error={pwdForm.formState.errors.password_confirmation} {...pwdForm.register('password_confirmation')} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={savingPwd}>
              {savingPwd ? <><Loader2 className="h-4 w-4 animate-spin" /> …</> : <>Changer le mot de passe</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
      <Icon className="h-4 w-4 text-brand-500" /> {children}
    </h2>
  );
}

function Field({ label, icon: Icon, error, className, children }) {
  return (
    <div className={className}>
      <label className="label flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />} {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
