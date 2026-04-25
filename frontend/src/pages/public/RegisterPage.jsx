import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('E-mail invalide'),
  phone: z.string().min(8, 'Téléphone invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await authApi.register(values);
      const data = res?.data ?? res;
      const user = data.user || data.client;
      const token = data.token || data.access_token;
      login(user, token, 'client');
      toast.success('Compte créé avec succès !');
      navigate('/mon-espace');
    } catch (e) {
      if (e.response?.status !== 422) toast.error("Inscription impossible. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="card card-pad">
        <h1 className="text-2xl font-bold text-center">Créer un compte</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" {...register('phone')} placeholder="+225 ..." />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mot de passe</label>
              <input type="password" className="input" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirmation</label>
              <input type="password" className="input" {...register('password_confirmation')} />
              {errors.password_confirmation && <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            S'inscrire
          </button>
        </form>
        <p className="text-sm text-center text-gray-600 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-brand-600 font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
