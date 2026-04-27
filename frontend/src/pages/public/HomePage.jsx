import { Link } from 'react-router-dom';
import {
  BedDouble, ShieldCheck, Sparkles, ArrowRight,
  Star, Wifi, Coffee, Car,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const FEATURES = [
  {
    icon: BedDouble,
    title: 'Chambres confortables',
    desc: 'Du lit simple à la suite familiale, trouvez la chambre qui vous correspond.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'Paiement sécurisé',
    desc: 'Payez via Orange CI ou Wave CI — rapide, sécurisé, sans frais cachés.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Sparkles,
    title: 'Service attentionné',
    desc: 'Une équipe disponible 24h/24 pour rendre votre séjour parfait.',
    color: 'bg-violet-50 text-violet-600',
  },
];

const AMENITIES = [
  { icon: Wifi,    label: 'Wi-Fi gratuit' },
  { icon: Coffee,  label: 'Petit-déjeuner' },
  { icon: Car,     label: 'Parking' },
  { icon: Star,    label: 'Noté 4.8/5' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="bg-cover bg-center min-h-[520px] lg:min-h-[620px] flex items-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=70)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-sm mb-5">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span>Hôtel 4 étoiles — Abidjan</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold max-w-2xl leading-tight">
              Un séjour d'exception<br className="hidden sm:block" /> au cœur de la ville
            </h1>
            <p className="mt-4 text-base sm:text-lg max-w-xl text-gray-200 leading-relaxed">
              Réservez votre chambre en ligne en quelques clics et profitez d'un service de qualité supérieure.
            </p>

            {/* Amenities rapides */}
            <div className="mt-6 flex flex-wrap gap-3">
              {AMENITIES.map((a) => (
                <span
                  key={a.label}
                  className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-xs font-medium"
                >
                  <a.icon className="h-3.5 w-3.5" />
                  {a.label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/rooms" className="btn-primary shadow-lg shadow-brand-500/30 px-6 py-2.5">
                Voir les chambres <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="btn border border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 px-6 py-2.5"
                >
                  Créer un compte
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Caractéristiques ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Pourquoi nous choisir ?
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Nous mettons tout en œuvre pour que votre séjour soit inoubliable.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card card-pad text-center group hover:shadow-md transition-shadow duration-200"
            >
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 mx-auto ${f.color}`}>
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA bas de page ────────────────────────────────────── */}
      <section className="bg-brand-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center text-white">
          <h2 className="text-2xl font-bold">Prêt à réserver votre séjour ?</h2>
          <p className="mt-2 text-brand-100">
            Des chambres disponibles dès aujourd'hui — réservation en moins de 2 minutes.
          </p>
          <Link to="/rooms" className="inline-flex items-center gap-2 mt-6 bg-white text-brand-600 font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-50 transition-colors shadow-lg">
            Voir les chambres <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
