import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  User, Mail, Calendar, IdCard, ShieldAlert,
  Camera, Trash2, KeyRound, Save, Loader2, Eye, Upload, FileText, X,
} from 'lucide-react';
import PasswordInput from '../../components/common/PasswordInput';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import PhoneInputWithCode from '../../components/common/PhoneInputWithCode';
import SelectInput from '../../components/common/SelectInput';
import { profileApi } from '../../api/profile.api';
import { useAuth } from '../../hooks/useAuth';
import { usePdfViewer } from '../../store/pdfViewerStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(80),
  last_name:  z.string().min(1, 'Nom requis').max(80),
  email:      z.string().email('E-mail invalide'),
  phone:      z.string().max(20).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender:     z.enum(['', 'male', 'female', 'other']).optional(),
  id_document_type:   z.enum(['', 'passport', 'national_id', 'driver_license']).optional(),
  emergency_contact_name:  z.string().max(120).optional().or(z.literal('')),
  emergency_contact_phone: z.string().max(20).optional().or(z.literal('')),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  password:         z.string().min(8, 'Au moins 8 caractères'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Les mots de passe ne correspondent pas.',
});

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(profileSchema) });

  const pwdForm = useForm({ resolver: zodResolver(passwordSchema) });

  const fetchProfile = async () => {
    setLoading(true); setError(null);
    try {
      const res = await profileApi.get();
      const data = res?.data ?? res;
      setProfile(data);
      reset({
        first_name: data.first_name ?? '',
        last_name:  data.last_name ?? '',
        email:      data.email ?? '',
        phone:      data.phone ?? '',
        date_of_birth: data.date_of_birth ?? '',
        gender:     data.gender ?? '',
        id_document_type: data.id_document_type ?? '',
        emergency_contact_name:  data.emergency_contact_name ?? '',
        emergency_contact_phone: data.emergency_contact_phone ?? '',
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
      const res = await profileApi.update(payload);
      const data = res?.data ?? res;
      setProfile(data);
      updateUser(data);
      toast.success('Votre profil a bien été mis à jour.');
      reset(values, { keepValues: true });
    } catch (e) {
      if (e.response?.status !== 422) {
        toast.error(e.response?.data?.message || 'La mise à jour a échoué. Vérifiez vos informations et réessayez.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const onSubmitPassword = async (values) => {
    setSavingPwd(true);
    try {
      await profileApi.updatePassword(values);
      toast.success('Votre mot de passe a été modifié avec succès. Utilisez-le lors de votre prochaine connexion.');
      pwdForm.reset();
    } catch (e) {
      if (e.response?.status !== 422) {
        toast.error('Impossible de modifier le mot de passe. Vérifiez que l\'ancien mot de passe est correct.');
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
      toast.success('Votre photo de profil a été mise à jour.');
    } catch (err) {
      if (err.response?.status !== 422) toast.error("Impossible d'envoyer cette photo. Vérifiez que le fichier est valide (JPG, PNG, max 4 Mo).");
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
      toast.success('Votre photo de profil a été supprimée.');
    } catch {
      toast.error('Impossible de supprimer la photo. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  const onDocsSelect = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingDoc(true);
    try {
      const res = await profileApi.uploadDocuments(files);
      const data = res?.data ?? res;
      setProfile(data);
      updateUser(data);
      toast.success('Pièce(s) d\'identité enregistrée(s).');
    } catch (err) {
      if (err.response?.status !== 422) toast.error("Échec de l'envoi. Formats acceptés : JPG, PNG, WebP ou PDF (max 8 Mo).");
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const onDocDelete = async (path) => {
    try {
      const res = await profileApi.deleteDocument(path);
      const data = res?.data ?? res;
      setProfile(data);
      updateUser(data);
      toast.success('Document supprimé.');
    } catch {
      toast.error('Impossible de supprimer le document.');
    }
  };

  const viewDoc = (doc) => {
    usePdfViewer.getState().view(
      doc.name,
      doc.name,
      () => profileApi.documentBlob(doc.path),
      "Impossible d'afficher ce document.",
    );
  };

  if (loading) return <LoadingSpinner label="Chargement du profil…" />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchProfile} />;

  const initials = `${profile?.last_name?.[0] ?? ''}${profile?.first_name?.[0] ?? ''}`.toUpperCase();
  const documents = profile?.id_documents ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-gray-500">Gérez vos informations personnelles et votre photo.</p>
      </div>

      {/* Photo de profil */}
      <section className="card card-pad">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {profile?.profile_photo ? (
              <>
                <img
                  src={profile.profile_photo}
                  alt="Photo de profil"
                  className="h-24 w-24 rounded-full object-cover border-2 border-brand-200"
                />
                {/* Overlay œil : consulter la photo */}
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
            <p className="text-xs text-gray-400 mt-2">JPEG / PNG / WebP - 4 Mo max.</p>
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
          <PhoneInputWithCode
            label="Téléphone"
            value={watch('phone') || ''}
            onChange={(v) => setValue('phone', v, { shouldDirty: true })}
            error={errors.phone?.message}
          />
          <Field label="Date de naissance" icon={Calendar} error={errors.date_of_birth?.message}>
            <input className="input" type="date" {...register('date_of_birth')} />
          </Field>
          <Field label="Genre" error={errors.gender?.message}>
            <SelectInput {...register('gender')} error={errors.gender?.message}>
              <option value="">-</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </SelectInput>
          </Field>
        </div>

        <SectionTitle icon={IdCard}>Pièce d'identité</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <Field label="Type de document" error={errors.id_document_type?.message}>
              <SelectInput {...register('id_document_type')} error={errors.id_document_type?.message}>
                <option value="">-</option>
                <option value="passport">Passeport</option>
                <option value="national_id">Carte nationale d'identité</option>
                <option value="driver_license">Permis de conduire</option>
              </SelectInput>
            </Field>

            {/* Upload des documents */}
            <div>
              <label className="label">Documents justificatifs</label>
              <input
                type="file"
                ref={docInputRef}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                className="hidden"
                onChange={onDocsSelect}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={uploadingDoc}
                onClick={() => docInputRef.current?.click()}
              >
                {uploadingDoc
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi…</>
                  : <><Upload className="h-4 w-4" /> Ajouter un document</>}
              </button>
              <p className="text-xs text-gray-400 mt-2">JPEG / PNG / WebP / PDF - 25 Mo max. par fichier.</p>
            </div>
          </div>

          {/* Liste des documents — pleine largeur */}
          {documents.length > 0 && (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.path}
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
                      onClick={() => onDocDelete(doc.path)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200"
                      aria-label="Supprimer le document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SectionTitle icon={ShieldAlert}>Contact d'urgence</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom du contact" error={errors.emergency_contact_name?.message}>
            <input className="input" {...register('emergency_contact_name')} />
          </Field>
          <PhoneInputWithCode
            label="Téléphone du contact"
            value={watch('emergency_contact_phone') || ''}
            onChange={(v) => setValue('emergency_contact_phone', v, { shouldDirty: true })}
            error={errors.emergency_contact_phone?.message}
          />
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
          <SectionTitle icon={KeyRound}>Sécurité - Mot de passe</SectionTitle>
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
