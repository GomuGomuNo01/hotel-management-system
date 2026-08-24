import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Lock, KeyRound, Loader2, AlertTriangle } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { passwordRule, withPasswordConfirmation } from '../../utils/validation';
import PasswordInput from '../../components/common/PasswordInput';

const schema = withPasswordConfirmation(z.object({
  password:              passwordRule,
  password_confirmation: z.string().min(1, 'Confirmation requise'),
}));

export default function ResetPasswordPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, email, ...values });
      toast.success('Mot de passe réinitialisé. Connectez-vous.');
      navigate('/login', { replace: true });
    } catch (e) {
      const msg = e.response?.data?.message;
      toast.error(msg || 'Réinitialisation impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-50 text-red-600 mb-6 mx-auto">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Lien invalide</h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            Ce lien de réinitialisation est incomplet ou a expiré. Veuillez en demander un nouveau.
          </p>
          <Link to="/mot-de-passe-oublie" className="btn-primary inline-flex">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-slate-500 break-all">
            Pour le compte <span className="font-medium text-brand-600">{email}</span>
          </p>
        </div>

        <div className="card card-pad shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <PasswordInput
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <PasswordInput
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password_confirmation}
                  {...register('password_confirmation')}
                />
              </div>
              {errors.password_confirmation && (
                <p className="mt-1 text-xs text-red-600">{errors.password_confirmation.message}</p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Réinitialiser le mot de passe
            </button>
          </form>

          <p className="text-sm text-center text-gray-600 mt-5">
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              ← Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
