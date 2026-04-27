import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LogIn, Loader2, Hotel, Mail, Lock, MailWarning } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';
import PasswordInput from '../../components/common/PasswordInput';

const schema = z.object({
  email:    z.string().email('E-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const ROLE_REDIRECT = { client: '/mon-espace', admin: '/admin', owner: '/owner' };

export default function LoginPage() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const { login }      = useAuth();
  const [submitting, setSubmitting]               = useState(false);
  const [unverifiedEmail, setUnverifiedEmail]     = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res  = await authApi.login(values);
      const data = res?.data ?? res;
      const user  = data.user  || data.client || data.admin || data.owner;
      const token = data.token || data.access_token;
      const role  = data.role;

      login(user, token, role);
      toast.success('Connexion réussie !');

      const redirectParam = searchParams.get('redirect');
      const from          = location.state?.from?.pathname;
      navigate(redirectParam || from || ROLE_REDIRECT[role] || '/', { replace: true });
    } catch (e) {
      const status = e.response?.status;
      const errors = e.response?.data?.errors;
      if (status === 401) {
        toast.error('Identifiants invalides.');
      } else if (status === 403 && errors?.email_not_verified) {
        /* Email non vérifié — afficher le bandeau dédié */
        setUnverifiedEmail(errors.email || values.email);
      } else if (status === 403) {
        toast.error('Votre compte est désactivé. Contactez un administrateur.');
      } else if (status !== 422) {
        toast.error('Connexion impossible. Réessayez.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = authApi.googleRedirectUrl();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-500 text-white mb-4 shadow-lg shadow-brand-500/30">
            <Hotel className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Connexion</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Accédez à votre espace personnel
          </p>
        </div>

        {/* Bandeau email non vérifié */}
        {unverifiedEmail && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
            <MailWarning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-800">E-mail non vérifié</p>
              <p className="text-amber-700 mt-0.5">
                Vous devez confirmer votre adresse e-mail avant de vous connecter.
              </p>
              <Link
                to={`/verifier-email?email=${encodeURIComponent(unverifiedEmail)}`}
                className="inline-block mt-2 text-brand-600 font-semibold hover:underline"
              >
                Renvoyer le lien de vérification →
              </Link>
            </div>
          </div>
        )}

        <div className="card card-pad shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <PasswordInput
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={errors.password}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Se connecter
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            ou continuer avec
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <button
            onClick={handleGoogle}
            className="btn-secondary w-full"
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09a7.18 7.18 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Google
          </button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-5">
            Pas encore de compte ?{' '}
            <Link
              to={
                searchParams.get('redirect')
                  ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect'))}`
                  : '/register'
              }
              className="text-brand-600 font-semibold hover:text-brand-700"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
