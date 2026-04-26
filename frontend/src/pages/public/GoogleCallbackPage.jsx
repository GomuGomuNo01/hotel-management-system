import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { profileApi } from '../../api/profile.api';
import toast from 'react-hot-toast';

/**
 * Page intermédiaire appelée après le callback Google.
 * L'URL reçue est : /auth/google/callback?token=xxx&role=yyy
 * Elle stocke le token, charge le profil utilisateur, puis redirige.
 */
export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get('token');
    const role  = params.get('role');
    const error = params.get('error');

    if (error || !token) {
      toast.error('Connexion Google échouée. Veuillez réessayer.');
      navigate('/login', { replace: true });
      return;
    }

    // Stocker temporairement le token pour que profileApi puisse l'utiliser
    login(null, token, role);

    // Charger le profil complet depuis l'API
    profileApi
      .get()
      .then((user) => {
        login(user, token, role);
        toast.success(`Bienvenue, ${user.first_name} !`);
        if (role === 'admin')  return navigate('/admin',  { replace: true });
        if (role === 'owner')  return navigate('/owner',  { replace: true });
        navigate('/mon-espace', { replace: true });
      })
      .catch(() => {
        toast.error('Impossible de charger votre profil.');
        navigate('/login', { replace: true });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-600">
      <svg className="animate-spin h-10 w-10 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-sm font-medium">Connexion en cours…</p>
    </div>
  );
}
