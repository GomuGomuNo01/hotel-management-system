import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { authApi } from '../../api/auth.api';

const schema = z.object({
  email: z.string().email('E-mail invalide'),
});

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sentTo,     setSentTo]     = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await authApi.forgotPassword(values.email);
      setSentTo(values.email);
    } catch {
      toast.error('Envoi impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 mb-6 mx-auto">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Vérifiez votre boîte mail</h1>
          <p className="text-gray-600 leading-relaxed mb-2">
            Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé à :
          </p>
          <p className="font-semibold text-brand-600 text-lg mb-6 break-all">{sentTo}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8 text-left space-y-1">
            <p>⏱ Le lien est valable <strong>60 minutes</strong>.</p>
            <p>📂 Pensez à vérifier votre dossier <strong>Spam / Indésirables</strong>.</p>
          </div>
          <p className="text-sm text-gray-500">
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              ← Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation
          </p>
        </div>

        <div className="card card-pad shadow-xl shadow-black/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer le lien
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
