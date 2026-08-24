import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import toast from '../../lib/toast';
import { authApi } from '../../api/auth.api';

export default function VerifyEmailPage() {
  const [searchParams]  = useSearchParams();
  const email           = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);

  const handleResend = async () => {
    if (!email) { toast.error('Adresse e-mail introuvable.'); return; }
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
      toast.success('E-mail de vérification renvoyé !');
    } catch (e) {
      const msg = e.response?.data?.message;
      if (msg) toast.error(msg);
      else toast.error('Impossible de renvoyer l\'e-mail.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">

        {/* Icône */}
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-brand-50 text-brand-600 mb-6 mx-auto">
          <Mail className="h-10 w-10" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Vérifiez votre adresse e-mail
        </h1>

        <p className="text-gray-600 leading-relaxed mb-2">
          Votre compte a bien été créé. Un e-mail de vérification a été envoyé à :
        </p>
        {email && (
          <p className="font-semibold text-brand-600 text-lg mb-6 break-all">{email}</p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8 text-left space-y-1">
          <p>📬 <strong>Cliquez sur le lien dans l'e-mail</strong> pour activer votre compte.</p>
          <p>⏱ Le lien est valable <strong>24 heures</strong>.</p>
          <p>📂 Pensez à vérifier votre dossier <strong>Spam / Indésirables</strong> si vous ne trouvez pas l'e-mail.</p>
        </div>

        {/* Bouton renvoyer */}
        {resent ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium mb-6">
            <CheckCircle className="h-5 w-5" />
            E-mail renvoyé avec succès
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="btn-secondary w-full mb-4"
          >
            {resending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
              : <><RefreshCw className="h-4 w-4" /> Renvoyer l'e-mail de vérification</>
            }
          </button>
        )}

        <p className="text-sm text-gray-500">
          <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
