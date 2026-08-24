import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from '../../lib/toast';
import { KeyRound, Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { useAuth } from '../../hooks/useAuth';
import { passwordRule, withPasswordConfirmation } from '../../utils/validation';
import PasswordInput from '../common/PasswordInput';
import PasswordStrengthIndicator from '../common/PasswordStrengthIndicator';

const schema = withPasswordConfirmation(z.object({
  current_password:      z.string().min(1, 'Mot de passe actuel requis'),
  password:              passwordRule,
  password_confirmation: z.string(),
}));

export default function ForcePasswordChange() {
  const { user, updateUser, logout } = useAuth();
  const [submitting, setSubmitting]  = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  const newPassword = watch('password') || '';

  const submit = async (values) => {
    setSubmitting(true);
    try {
      await adminApi.profile.updatePassword(values);
      const updated = { ...user, must_change_password: false };
      updateUser(updated);
      toast.success('Mot de passe défini avec succès. Bienvenue !');
    } catch (e) {
      if (e.response?.status === 422) {
        toast.error(e.response.data?.errors?.current_password?.[0] || 'Mot de passe actuel incorrect.');
      } else {
        toast.error("Impossible de changer le mot de passe. Réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-5 flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Changement de mot de passe obligatoire</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Bonjour <strong>{user?.first_name}</strong>, votre compte utilise un mot de passe temporaire.
              Vous devez en définir un nouveau avant de continuer.
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(submit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Mot de passe temporaire (actuel)</label>
            <PasswordInput
              {...register('current_password')}
              placeholder="Entrez le mot de passe reçu par e-mail"
              error={errors.current_password?.message}
            />
            {errors.current_password && <p className="text-xs text-red-600 mt-1">{errors.current_password.message}</p>}
          </div>

          <div>
            <label className="label">Nouveau mot de passe</label>
            <PasswordInput
              {...register('password')}
              placeholder="Au moins 8 caractères"
              error={errors.password?.message}
            />
            <PasswordStrengthIndicator password={newPassword} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <PasswordInput
              {...register('password_confirmation')}
              placeholder="Répétez le nouveau mot de passe"
              error={errors.password_confirmation?.message}
            />
            {errors.password_confirmation && <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                : <><KeyRound className="h-4 w-4" /> Définir mon mot de passe</>
              }
            </button>
            <button
              type="button"
              onClick={logout}
              className="btn-ghost w-full text-sm text-gray-500 flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Se déconnecter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
