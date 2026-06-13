/**
 * OwnerProfilePage — /owner/profil
 * Le propriétaire peut consulter ET modifier ses informations (nom, e-mail),
 * gérer sa photo de profil (même logique que la photo admin : crop serveur
 * 400×400, consultation en lightbox) et changer son mot de passe.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal }                from 'react-dom';
import { useForm }                     from 'react-hook-form';
import { zodResolver }                 from '@hookform/resolvers/zod';
import { z }                           from 'zod';
import toast                           from 'react-hot-toast';
import {
  User, Mail, KeyRound, Loader2, Crown,
  Camera, Trash2, Eye, X, Save,
} from 'lucide-react';
import PasswordInput             from '../../components/common/PasswordInput';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import LoadingSpinner            from '../../components/common/LoadingSpinner';
import ErrorMessage              from '../../components/common/ErrorMessage';
import { ownerApi }              from '../../api/owner.api';
import { useAuth }               from '../../hooks/useAuth';

/* ── Schémas de validation ────────────────────────────────────── */
const profileSchema = z.object({
  full_name: z.string().min(1, 'Le nom complet est requis').max(100),
  email:     z.string().email('Adresse e-mail invalide').max(150),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  password: z.string()
    .min(8, 'Au moins 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[a-z]/, 'Au moins une minuscule')
    .regex(/[0-9]/, 'Au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Les mots de passe ne correspondent pas.',
});

export default function OwnerProfilePage() {
  const { updateUser } = useAuth();
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd,     setSavingPwd]     = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const fileInputRef = useRef(null);

  const profileForm = useForm({ resolver: zodResolver(profileSchema) });
  const pwdForm     = useForm({ resolver: zodResolver(passwordSchema) });

  const fetchProfile = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await ownerApi.profile.get();
      const data = res?.data ?? res;
      setProfile(data);
      profileForm.reset({ full_name: data.full_name ?? '', email: data.email ?? '' });
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); /* eslint-disable-next-line */ }, []);

  /* Synchronise le profil local + le store (en-tête) */
  const applyProfile = (data) => {
    setProfile(data);
    updateUser(data);
  };

  const map422 = (e, form) => {
    if (e.response?.status === 422) {
      const errs = e.response.data?.errors ?? {};
      Object.entries(errs).forEach(([field, msgs]) =>
        form.setError(field, { message: Array.isArray(msgs) ? msgs[0] : msgs })
      );
      return true;
    }
    return false;
  };

  /* ── Enregistrer les informations ───────────────────────────── */
  const onSubmitProfile = async (values) => {
    setSavingProfile(true);
    try {
      const res  = await ownerApi.profile.update(values);
      const data = res?.data ?? res;
      applyProfile(data);
      profileForm.reset({ full_name: data.full_name, email: data.email });
      toast.success('Profil mis à jour.');
    } catch (e) {
      if (!map422(e, profileForm)) toast.error('La mise à jour a échoué. Réessayez.');
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Photo de profil ────────────────────────────────────────── */
  const onPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res  = await ownerApi.profile.uploadPhoto(file);
      applyProfile(res?.data ?? res);
      toast.success('Photo de profil mise à jour.');
    } catch (err) {
      if (err.response?.status !== 422) toast.error("Impossible d'envoyer cette photo (JPG, PNG, WebP, max 4 Mo).");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onPhotoDelete = async () => {
    setUploading(true);
    try {
      const res = await ownerApi.profile.deletePhoto();
      applyProfile(res?.data ?? res);
      toast.success('Photo de profil supprimée.');
    } catch {
      toast.error('Impossible de supprimer la photo. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  /* ── Mot de passe ───────────────────────────────────────────── */
  const onSubmitPassword = async (values) => {
    setSavingPwd(true);
    try {
      await ownerApi.profile.updatePassword(values);
      toast.success('Mot de passe modifié avec succès.');
      pwdForm.reset();
    } catch (e) {
      if (!map422(e, pwdForm)) toast.error('Mot de passe actuel incorrect ou erreur serveur. Réessayez.');
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du profil…" />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchProfile} />;

  /* Initiales depuis full_name */
  const initials = (() => {
    const parts = (profile?.full_name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() || 'P';
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-gray-500">Gérez vos informations, votre photo et votre mot de passe.</p>
      </div>

      {/* ── Photo de profil ──────────────────────────────────── */}
      <section className="card card-pad">
        <div className="flex items-center gap-5">
          <div className="relative group flex-shrink-0">
            {profile?.profile_photo ? (
              <>
                <img
                  src={profile.profile_photo}
                  alt="Photo de profil"
                  className="h-24 w-24 rounded-full object-cover border-2 border-amber-200"
                  style={{ imageRendering: 'auto' }}
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
              <div className="h-24 w-24 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl font-extrabold shadow ring-4 ring-amber-100">
                {initials}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-xl leading-tight break-words">{profile?.full_name}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                <Crown className="h-3 w-3" /> Propriétaire
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" /> {profile?.email}
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPhotoSelect}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" /> {profile?.profile_photo ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {profile?.profile_photo && (
                <button type="button" className="btn-ghost text-red-600" disabled={uploading} onClick={onPhotoDelete}>
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">JPEG / PNG / WebP - 4 Mo max.</p>
          </div>
        </div>
      </section>

      {/* ── Informations du compte (éditables) ───────────────── */}
      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="card card-pad space-y-4">
        <SectionTitle icon={User}>Informations du compte</SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom complet" error={profileForm.formState.errors.full_name?.message}>
            <input className="input" {...profileForm.register('full_name')} placeholder="ex. Patron Principal" />
          </Field>
          <Field label="Adresse e-mail" error={profileForm.formState.errors.email?.message}>
            <input className="input" type="email" {...profileForm.register('email')} placeholder="patron@hotel.com" />
          </Field>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : <><Save className="h-4 w-4" /> Enregistrer</>
            }
          </button>
        </div>
      </form>

      {/* ── Mot de passe ─────────────────────────────────────── */}
      <form onSubmit={pwdForm.handleSubmit(onSubmitPassword)} className="card card-pad space-y-4">
        <SectionTitle icon={KeyRound}>Sécurité — Mot de passe</SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Mot de passe actuel" error={pwdForm.formState.errors.current_password?.message}>
            <PasswordInput
              autoComplete="current-password"
              error={pwdForm.formState.errors.current_password}
              {...pwdForm.register('current_password')}
            />
          </Field>
          <Field label="Nouveau mot de passe" error={pwdForm.formState.errors.password?.message}>
            <PasswordInput
              autoComplete="new-password"
              error={pwdForm.formState.errors.password}
              {...pwdForm.register('password')}
            />
            <PasswordStrengthIndicator password={pwdForm.watch('password')} />
          </Field>
          <Field label="Confirmation" error={pwdForm.formState.errors.password_confirmation?.message}>
            <PasswordInput
              autoComplete="new-password"
              error={pwdForm.formState.errors.password_confirmation}
              {...pwdForm.register('password_confirmation')}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={savingPwd}>
            {savingPwd
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : <>Changer le mot de passe</>
            }
          </button>
        </div>
      </form>

      {/* Lightbox photo de profil */}
      {photoLightbox && profile?.profile_photo && createPortal(
        <div
          className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPhotoLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={() => setPhotoLightbox(false)}
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={profile.profile_photo}
            alt="Photo de profil"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ── Titre de section ────────────────────────────────────────── */
function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
      <Icon className="h-4 w-4 text-amber-500" /> {children}
    </h2>
  );
}

/* ── Champ formulaire avec label + erreur ─────────────────────── */
function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
