import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PERMISSIONS = [
  'manage_rooms',
  'manage_reservations',
  'manage_clients',
  'manage_checkin_checkout',
  'manage_payments',
  'view_reports',
  'view_audit_summary',
];

const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  role: z.string().min(1, 'Rôle requis'),
  permissions: z.array(z.string()).default([]),
});

export default function AdminFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', email: '', role: 'manager', permissions: [] },
  });

  const selected = watch('permissions') || [];

  useEffect(() => {
    if (!isEdit) return;
    ownerApi.admins.get(id)
      .then((res) => {
        const a = res?.data ?? res;
        reset({
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          role: a.role,
          permissions: (a.permissions || []).map((p) => p.permission_key || p),
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const togglePerm = (key) => {
    const next = selected.includes(key) ? selected.filter((p) => p !== key) : [...selected, key];
    setValue('permissions', next, { shouldDirty: true });
  };

  const submit = async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) await ownerApi.admins.update(id, values);
      else await ownerApi.admins.create(values);
      toast.success(isEdit ? 'Admin mis à jour.' : 'Admin créé. Identifiants envoyés par email.');
      navigate('/owner/admins');
    } catch (e) {
      if (e.response?.status !== 422) toast.error("Enregistrement impossible.");
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/owner/admins" className="text-sm text-brand-600 inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>
      <h1 className="text-2xl font-bold">{isEdit ? 'Modifier l\'admin' : 'Nouvel admin'}</h1>

      <form onSubmit={handleSubmit(submit)} className="card card-pad space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom</label>
            <input className="input" {...register('first_name')} />
            {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" {...register('last_name')} />
            {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" {...register('role')}>
              <option value="manager">Manager</option>
              <option value="receptionist">Réceptionniste</option>
              <option value="accountant">Comptable</option>
            </select>
          </div>
        </div>

        <div>
          <p className="label">Permissions</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {PERMISSIONS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" className="accent-brand-500" checked={selected.includes(key)} onChange={() => togglePerm(key)} />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
