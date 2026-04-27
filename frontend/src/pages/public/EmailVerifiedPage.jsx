import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, LogIn } from 'lucide-react';

const STATUSES = {
  success: {
    icon:    CheckCircle,
    color:   'text-emerald-500',
    bg:      'bg-emerald-50',
    title:   'E-mail vérifié avec succès !',
    message: 'Votre adresse e-mail a été confirmée. Votre compte est désormais actif — vous pouvez vous connecter et réserver vos chambres.',
    cta:     'Se connecter',
    ctaTo:   '/login',
  },
  already: {
    icon:    CheckCircle,
    color:   'text-blue-500',
    bg:      'bg-blue-50',
    title:   'Adresse déjà vérifiée',
    message: 'Cette adresse e-mail a déjà été confirmée. Connectez-vous directement.',
    cta:     'Se connecter',
    ctaTo:   '/login',
  },
  expired: {
    icon:    Clock,
    color:   'text-amber-500',
    bg:      'bg-amber-50',
    title:   'Lien expiré',
    message: 'Ce lien de vérification a expiré (valide 24h). Retournez sur la page de connexion pour en demander un nouveau.',
    cta:     'Retour à la connexion',
    ctaTo:   '/login',
  },
  invalid: {
    icon:    XCircle,
    color:   'text-red-500',
    bg:      'bg-red-50',
    title:   'Lien invalide',
    message: 'Ce lien de vérification est invalide ou a déjà été utilisé.',
    cta:     'Retour à la connexion',
    ctaTo:   '/login',
  },
};

export default function EmailVerifiedPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'invalid';
  const cfg    = STATUSES[status] ?? STATUSES.invalid;
  const Icon   = cfg.icon;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">

        <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full ${cfg.bg} mb-6 mx-auto`}>
          <Icon className={`h-10 w-10 ${cfg.color}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{cfg.title}</h1>
        <p className="text-gray-600 leading-relaxed mb-8">{cfg.message}</p>

        <Link to={cfg.ctaTo} className="btn-primary inline-flex">
          <LogIn className="h-4 w-4" />
          {cfg.cta}
        </Link>

        <p className="mt-6 text-sm text-gray-400">
          <Link to="/" className="hover:text-brand-600">← Retour à l'accueil</Link>
        </p>
      </div>
    </div>
  );
}
