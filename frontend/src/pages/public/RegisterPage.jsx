import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, UserPlus, Hotel, Mail, Phone, User } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';
import PasswordInput from '../../components/common/PasswordInput';

const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name:  z.string().min(1, 'Nom requis'),
  email:      z.string().email('E-mail invalide'),
  phone:      z.string().min(8, 'Téléphone invalide'),
  password:   z.string().min(8, 'Au moins 8 caractères'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirmation'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await authApi.register(values);
      const data = res?.data ?? res;
      const user  = data.user || data.client;
      const token = data.token || data.access_token;
      const role  = data.role || 'client';
      login(user, token, role);
      toast.success('Compte créé avec succès !');
      const redirectParam = searchParams.get('redirect');
      navigate(redirectParam || '/mon-espace');
    } catch (e) {
      if (e.response?.status !== 422) toast.error('Inscription impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo / titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-500 text-white mb-4 shadow-lg shadow-brand-500/30">
            <Hotel className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Créer un compte</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Rejoignez-nous pour réserver vos chambres en ligne
          </p>
        </div>

        <div className="card card-pad shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input className="input pl-9" placeholder="Jean" {...register('first_name')} />
                </div>
                {errors.first_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label className="label">Nom</label>
                <input className="input" placeholder="Dupont" {...register('last_name')} />
                {errors.last_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="votre@email.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label className="label">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  className="input pl-9"
                  placeholder="+225 07 00 00 00"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Mots de passe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Mot de passe</label>
                <PasswordInput
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="label">Confirmation</label>
                <PasswordInput
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password_confirmation}
                  {...register('password_confirmation')}
                />
                {errors.password_confirmation && (
                  <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              S'inscrire
            </button>
          </form>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-5">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
