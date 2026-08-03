import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import { profileApi } from '../../api/profile.api';
import toast from 'react-hot-toast';

/**
 * Page intermédiaire appelée après le callback Google.
 * L'URL reçue est : /auth/google/callback?code=xxx (jamais le token en clair).
 * On échange le code contre le token, on charge le profil, puis on redirige.
 */
export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code  = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      toast.error('Connexion Google échouée. Veuillez réessayer.');
      navigate('/login', { replace: true });
      return;
    }

    // 1. Échanger le code à usage unique contre le token, puis charger le profil.
    authApi
      .googleExchange(code)
      .then((res) => {
        const { token, role } = res?.data ?? res;
        if (!token) throw new Error('no token');

        // Stocker le token pour que l'intercepteur axios puisse l'utiliser
        login(null, token, role);

        return profileApi.get().then((profileRes) => {
          const user = profileRes?.data ?? profileRes;
          login(user, token, role);
          toast.success(`Bienvenue, ${user.first_name} !`);

          if (role === 'admin')  return navigate('/admin',      { replace: true });
          if (role === 'owner')  return navigate('/owner',      { replace: true });
          return navigate('/mon-espace', { replace: true });
        });
      })
      .catch(() => {
        toast.error('Connexion Google échouée. Veuillez réessayer.');
        navigate('/login', { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-600">
      <svg
        className="animate-spin h-10 w-10 text-brand-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      <p className="text-sm font-medium">Connexion en cours…</p>
    </div>
  );
}
