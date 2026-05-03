import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ChevronLeft, Loader2, Save, BedDouble, Calendar, Users,
  ArrowRightToLine, Banknote, BarChart2, Shield, Zap, Info,
} from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/* ─── Définition des permissions avec descriptions ────────────── */
const PERMISSION_GROUPS = [
  {
    group: 'Hébergement',
    items: [
      {
        key: 'manage_rooms',
        label: 'Gestion des chambres',
        description: 'Créer, modifier et supprimer les chambres, types et tarifs.',
        Icon: BedDouble,
      },
      {
        key: 'manage_checkin_checkout',
        label: 'Check-in / Check-out',
        description: 'Valider les arrivées et départs des clients.',
        Icon: ArrowRightToLine,
      },
    ],
  },
  {
    group: 'Réservations & Clients',
    items: [
      {
        key: 'manage_reservations',
        label: 'Gestion des réservations',
        description: 'Consulter, modifier et annuler les réservations.',
        Icon: Calendar,
      },
      {
        key: 'manage_clients',
        label: 'Gestion des clients',
        description: 'Accéder aux profils clients et modifier leurs informations.',
        Icon: Users,
      },
    ],
  },
  {
    group: 'Finances',
    items: [
      {
        key: 'manage_payments',
        label: 'Paiements & Remboursements',
        description: 'Enregistrer les paiements espèces et gérer les demandes de remboursement.',
        Icon: Banknote,
      },
    ],
  },
  {
    group: 'Rapports & Audit',
    items: [
      {
        key: 'view_reports',
        label: 'Rapports financiers',
        description: 'Consulter les statistiques de revenus, taux d\'occupation, etc.',
        Icon: BarChart2,
      },
      {
        key: 'view_audit_summary',
        label: 'Journal d\'audit (résumé)',
        description: 'Voir un résumé des actions réalisées — sans accès aux détails complets.',
        Icon: Shield,
      },
    ],
  },
];

/* ─── Rôles avec descriptions et permissions recommandées ─────── */
const ROLES = [
  {
    value: 'manager',
    label: 'Manager',
    description: 'Accès complet à la gestion opérationnelle de l\'hôtel.',
    preset: ['manage_rooms', 'manage_reservations', 'manage_clients', 'manage_checkin_checkout', 'manage_payments', 'view_reports', 'view_audit_summary'],
  },
  {
    value: 'receptionist',
    label: 'Réceptionniste',
    description: 'Gère les arrivées, départs et les réservations au quotidien.',
    preset: ['manage_reservations', 'manage_clients', 'manage_checkin_checkout'],
  },
  {
    value: 'accountant',
    label: 'Comptable',
    description: 'Accès aux finances, paiements et rapports uniquement.',
    preset: ['manage_payments', 'view_reports', 'view_audit_summary'],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

const schema = z.object({
  first_name:  z.string().min(1, 'Le prénom est requis'),
  last_name:   z.string().min(1, 'Le nom est requis'),
  email:       z.string().email('Adresse e-mail invalide'),
  role:        z.string().min(1, 'Le rôle est requis'),
  permissions: z.array(z.string()).default([]),
});

export default function AdminFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading]     = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', email: '', role: 'manager', permissions: [] },
  });

  const selected = watch('permissions') || [];
  const currentRole = watch('role');
  const roleInfo = ROLES.find((r) => r.value === currentRole);

  /* Chargement des données en mode édition */
  useEffect(() => {
    if (!isEdit) return;
    ownerApi.admins.get(id)
      .then((res) => {
        const a = res?.data ?? res;
        reset({
          first_name:  a.first_name,
          last_name:   a.last_name,
          email:       a.email,
          role:        a.role,
          permissions: (a.permissions || []).map((p) => p.permission_key || p),
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* Cocher / décocher une permission */
  const togglePerm = (key) => {
    const next = selected.includes(key)
      ? selected.filter((p) => p !== key)
      : [...selected, key];
    setValue('permissions', next, { shouldDirty: true });
  };

  /* Appliquer les permissions recommandées pour le rôle sélectionné */
  const applyPreset = () => {
    if (!roleInfo) return;
    setValue('permissions', [...roleInfo.preset], { shouldDirty: true });
    toast.success(`Permissions recommandées pour « ${roleInfo.label} » appliquées.`);
  };

  /* Tout cocher / tout décocher */
  const toggleAll = () => {
    if (selected.length === ALL_PERMISSIONS.length) {
      setValue('permissions', [], { shouldDirty: true });
    } else {
      setValue('permissions', ALL_PERMISSIONS, { shouldDirty: true });
    }
  };

  const submit = async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await ownerApi.admins.update(id, values);
        toast.success(`Les informations de ${values.first_name} ${values.last_name} ont bien été mises à jour.`);
      } else {
        await ownerApi.admins.create(values);
        toast.success(
          `Le compte de ${values.first_name} ${values.last_name} a été créé avec succès. Les identifiants de connexion ont été envoyés par e-mail.`,
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to="/owner/admins" className="text-sm text-brand-600 inline-flex items-center gap-1 hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          {isEdit ? 'Modifier l\'administrateur' : 'Créer un nouvel administrateur'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEdit
            ? 'Modifiez les informations, le rôle ou les permissions de cet administrateur.'
            : 'Remplissez le formulaire ci-dessous. Les identifiants seront envoyés automatiquement par e-mail.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        {/* ── Informations personnelles ── */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-gray-800">Informations personnelles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input className="input" {...register('first_name')} placeholder="ex. Mamadou" />
              {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Nom de famille</label>
              <input className="input" {...register('last_name')} placeholder="ex. Diallo" />
              {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse e-mail professionnelle</label>
              <input type="email" className="input" {...register('email')} placeholder="admin@hotel.com" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              {!isEdit && (
                <p className="text-xs text-gray-400 mt-1">
                  Un e-mail contenant les identifiants de connexion sera envoyé à cette adresse.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Rôle ── */}
        <div className="card card-pad space-y-3">
          <h2 className="font-semibold text-gray-800">Rôle</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`relative flex flex-col gap-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  currentRole === r.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input type="radio" className="sr-only" value={r.value} {...register('role')} />
                <span className="font-semibold text-sm text-gray-900">{r.label}</span>
                <span className="text-xs text-gray-500 leading-relaxed">{r.description}</span>
                {currentRole === r.value && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-500" />
                )}
              </label>
            ))}
          </div>
          {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
        </div>

        {/* ── Permissions ── */}
        <div className="card card-pad space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-800">Permissions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choisissez précisément ce que cet administrateur peut faire.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {roleInfo && (
                <button
                  type="button"
                  onClick={applyPreset}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                  title={`Permissions recommandées pour le rôle « ${roleInfo.label} »`}
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Suggestion {roleInfo.label}
                </button>
              )}
              <button type="button" onClick={toggleAll} className="btn-ghost text-xs">
                {selected.length === ALL_PERMISSIONS.length ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>
          </div>

          {/* Indicateur de suggestion */}
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

          {/* Groupes de permissions */}
          <div className="space-y-5">
            {PERMISSION_GROUPS.map(({ group, items }) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{group}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map(({ key, label, description, Icon }) => {
                    const checked = selected.includes(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          checked
                            ? 'border-brand-400 bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => togglePerm(key)}
                        />
                        {/* Icône */}
                        <span className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${
                          checked ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {/* Texte */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${checked ? 'text-brand-800' : 'text-gray-700'}`}>
                            {label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                        </div>
                        {/* Checkbox visuelle */}
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

          {/* Compteur */}
          <p className="text-xs text-gray-400 text-right">
            {selected.length} / {ALL_PERMISSIONS.length} permission{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between">
          <Link to="/owner/admins" className="btn-ghost">Annuler</Link>
          <button type="submit" className="btn-primary min-w-36" disabled={submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : <><Save className="h-4 w-4" /> {isEdit ? 'Enregistrer les modifications' : 'Créer l\'administrateur'}</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
