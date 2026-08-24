import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  User, Mail, MapPin, Calendar, IdCard,
  ShieldAlert, Briefcase, KeyRound, Loader2,
  ShieldCheck, FileText, Phone, Lock, Info,
  Eye,
} from 'lucide-react';
import PasswordInput from '../../components/common/PasswordInput';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import { adminApi } from '../../api/admin.api';
import { useAuth } from '../../hooks/useAuth';
import { usePdfViewer } from '../../store/pdfViewerStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PhotoLightbox from '../../components/common/PhotoLightbox';
import ErrorMessage from '../../components/common/ErrorMessage';
import { passwordRule, withPasswordConfirmation } from '../../utils/validation';

/* ─── Libellés lisibles ──────────────────────────────────────── */
const ROLE_LABELS = {
  manager:      'Manager',
  receptionist: 'Réceptionniste',
  accountant:   'Comptable',
};
const GENDER_LABELS  = { male: 'Homme', female: 'Femme', other: 'Autre' };
const DOC_LABELS     = { passport: 'Passeport', national_id: "Carte nationale d'identité", driver_license: 'Permis de conduire' };
const PERM_LABELS    = {
  manage_rooms:            'Gestion des chambres',
  manage_housekeeping:     'Ménage des chambres',
  manage_checkin_checkout: 'Arrivées & Départs',
  checkin_with_deposit:    "Encaissement d'acomptes",
  manage_reservations:     'Gestion des réservations',
  manage_clients:          'Gestion des clients',
  manage_payments:         'Paiements & Remboursements',
  manage_complaints:       'Gestion des réclamations',
  view_reports:            'Rapports financiers',
  view_audit_summary:      "Journal d'audit",
  view_reviews:            'Consultation des avis',
};

/* ─── Schéma mot de passe ────────────────────────────────────── */
const passwordSchema = withPasswordConfirmation(z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  password:         passwordRule,
  password_confirmation: z.string(),
}));

export default function AdminProfilePage() {
  useAuth();
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [profile, setProfile]     = useState(null);
  const [savingPwd, setSavingPwd] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState(false);

  const pwdForm = useForm({ resolver: zodResolver(passwordSchema) });

  // Lecture seule : l'admin peut uniquement CONSULTER la pièce d'identité
  // fournie par le propriétaire (aucun ajout / suppression côté admin).
  const viewIdDocument = () => {
    usePdfViewer.getState().view(
      "Pièce d'identité",
      'piece-identite',
      () => adminApi.profile.idDocumentBlob(),
      "Impossible d'afficher le document.",
    );
  };

  const fetchProfile = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await adminApi.profile.get();
      setProfile(res?.data ?? res);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile();   }, []);

  const onSubmitPassword = async (values) => {
    setSavingPwd(true);
    try {
      await adminApi.profile.updatePassword(values);
      toast.success('Mot de passe modifié avec succès.');
      pwdForm.reset();
    } catch (e) {
      if (e.response?.status !== 422) {
        toast.error("Mot de passe actuel incorrect ou erreur serveur. Réessayez.");
      }
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du profil…" />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchProfile} />;

  const initials = `${profile?.last_name?.[0] ?? ''}${profile?.first_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-gray-500">
          Vos informations personnelles et professionnelles.
        </p>
      </div>

      {/* ── Bandeau info lecture seule ── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Vos informations personnelles sont <strong>gérées par le propriétaire de l'hôtel</strong>.
          Pour toute modification, contactez-le directement.
          Vous pouvez uniquement changer votre mot de passe ci-dessous.
        </p>
      </div>

      {/* ── Carte identité + photo ── */}
      <section className="card card-pad">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 relative group">
            {profile?.profile_photo ? (
              <>
                <img
                  src={profile.profile_photo}
                  alt="Photo de profil"
                  className="h-24 w-24 rounded-full object-cover border-2 border-brand-200"
                  style={{ imageRendering: 'auto' }}
          loading="lazy"
          decoding="async"
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
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg">{profile?.full_name}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <p className="text-sm font-medium text-brand-600 mt-0.5">
              {ROLE_LABELS[profile?.role] ?? profile?.role}
            </p>
            {profile?.hired_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Embauché le {new Date(profile.hired_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        {/* Permissions */}
        {profile?.permissions?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-1 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Permissions accordées par le propriétaire
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.permissions.map((p) => (
                <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                  {PERM_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Informations personnelles (lecture seule) ── */}
      <section className="card card-pad space-y-5">
        <SectionTitle icon={User}>Informations personnelles</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadField label="Prénom"       value={profile?.first_name} />
          <ReadField label="Nom"          value={profile?.last_name} />
          <ReadField label="E-mail"       value={profile?.email} icon={Mail} />
          <ReadField label="Téléphone"    value={profile?.phone} icon={Phone} />
          <ReadField label="Date de naissance"
            value={profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('fr-FR') : null}
            icon={Calendar} />
          <ReadField label="Genre"        value={GENDER_LABELS[profile?.gender]} />
          <ReadField label="Poste / Rôle" value={ROLE_LABELS[profile?.role] ?? profile?.role} icon={Briefcase} />
          {profile?.bio && (
            <div className="md:col-span-2">
              <ReadField label="Bio" value={profile.bio} />
            </div>
          )}
        </div>

        <SectionTitle icon={MapPin}>Adresse</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadField label="Adresse"      value={profile?.address_line} className="md:col-span-2" />
          <ReadField label="Ville"        value={profile?.city} className="md:col-span-2" />
        </div>

        <SectionTitle icon={IdCard}>Pièce d'identité</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadField label="Type de document" value={DOC_LABELS[profile?.id_document_type]} />
          </div>

          {/* Document fourni par le propriétaire - consultation seule */}
          <div>
            <label className="label">Document justificatif</label>
            {profile?.id_document_path ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-brand-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate">Pièce d'identité</span>
                </span>
                <button
                  type="button"
                  onClick={viewIdDocument}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex-shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" /> Consulter
                </button>
              </div>
            ) : (
              <div className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-400 italic">
                Aucun document fourni.
              </div>
            )}
          </div>
        </div>

        <SectionTitle icon={ShieldAlert}>Contact d'urgence</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadField label="Nom du contact"    value={profile?.emergency_contact_name} />
          <ReadField label="Téléphone"         value={profile?.emergency_contact_phone} icon={Phone} />
        </div>

        {profile?.place_of_birth && (
          <>
            <SectionTitle icon={FileText}>Lieu de naissance</SectionTitle>
            <ReadField label="Lieu de naissance" value={profile.place_of_birth} />
          </>
        )}
      </section>

      {/* ── Changement de mot de passe ── */}
      <form onSubmit={pwdForm.handleSubmit(onSubmitPassword)} className="card card-pad space-y-4">
        <SectionTitle icon={KeyRound}>Sécurité - Changer le mot de passe</SectionTitle>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>Choisissez un mot de passe fort (min. 8 caractères, majuscule, chiffre et caractère spécial).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Mot de passe actuel</label>
            <PasswordInput autoComplete="current-password"
              error={pwdForm.formState.errors.current_password}
              {...pwdForm.register('current_password')} />
            {pwdForm.formState.errors.current_password && (
              <p className="mt-1 text-xs text-red-600">{pwdForm.formState.errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <PasswordInput autoComplete="new-password"
              error={pwdForm.formState.errors.password}
              {...pwdForm.register('password')} />
            <PasswordStrengthIndicator password={pwdForm.watch('password')} />
            {pwdForm.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">{pwdForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirmation</label>
            <PasswordInput autoComplete="new-password"
              error={pwdForm.formState.errors.password_confirmation}
              {...pwdForm.register('password_confirmation')} />
            {pwdForm.formState.errors.password_confirmation && (
              <p className="mt-1 text-xs text-red-600">{pwdForm.formState.errors.password_confirmation.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary" disabled={savingPwd}>
            {savingPwd
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : <><KeyRound className="h-4 w-4" /> Changer le mot de passe</>}
          </button>
        </div>
      </form>

      {/* Lightbox photo de profil */}
      <PhotoLightbox
        open={photoLightbox}
        src={profile?.profile_photo}
        alt="Photo de profil"
        onClose={() => setPhotoLightbox(false)}
      />
    </div>
  );
}

/* ── Composants utilitaires ────────────────────────────────────── */
function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
      <Icon className="h-4 w-4 text-brand-500" /> {children}
    </h2>
  );
}

function ReadField({ label, value, icon: Icon, className }) {
  return (
    <div className={className}>
      <label className="label flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />} {label}
      </label>
      <div className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 min-h-[42px]">
        {value || <span className="text-slate-400 italic">-</span>}
      </div>
    </div>
  );
}
