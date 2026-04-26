import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LogIn, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';

// Le role n'est plus selectionne par l'utilisateur :
// le backend detecte automatiquement le role a partir de l'email
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
  const [submitting, setSubmitting] = useState(false);

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
      toast.success('Connexion reussie !');

      const redirectParam = searchParams.get('redirect');
      const from          = location.state?.from?.pathname;
      navigate(redirectParam || from || ROLE_REDIRECT[role] || '/', { replace: true });
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) {
        toast.error('Identifiants invalides.');
      } else if (status === 403) {
        toast.error('Votre compte est desactive. Contactez un administrateur.');
      } else if (status !== 422) {
        toast.error('Connexion impossible. Reessayez.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = authApi.googleRedirectUrl();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card card-pad">
        <h1 className="text-2xl font-bold text-center">Connexion</h1>
        <p className="text-sm text-gray-500 text-center mt-1">Acces a votre espace</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              placeholder="votre@email.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <LogIn className="h-4 w-4" />}
            Se connecter
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          ou
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button onClick={handleGoogle} className="btn-secondary w-full flex items-center justify-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09a7.18 7.18 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continuer avec Google
        </button>

        <p className="text-sm text-center text-gray-600 mt-6">
          Pas encore de compte ?{' '}
          <Link
            to={
              searchParams.get('redirect')
                ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect'))}`
                : '/register'
            }
            className="text-brand-600 font-medium"
          >
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
