import { Link } from 'react-router-dom';
import {
  BedDouble, ShieldCheck, Sparkles, ArrowRight,
  Star, Wifi, Coffee, Car, Phone,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const FEATURES = [
  {
    icon: BedDouble,
    title: 'Chambres confortables',
    desc: 'Du lit simple a la suite familiale, trouvez la chambre qui vous correspond.',
    iconClass: 'bg-blue-100 text-blue-700',
  },
  {
    icon: ShieldCheck,
    title: 'Paiement securise',
    desc: 'Payez via Orange CI ou Wave CI — rapide, securise, sans frais caches.',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: Sparkles,
    title: 'Service attentionne',
    desc: 'Une equipe disponible 24h/24 pour rendre votre sejour parfait.',
    iconClass: 'bg-violet-100 text-violet-700',
  },
];

const AMENITIES = [
  { icon: Wifi,   label: 'Wi-Fi gratuit' },
  { icon: Coffee, label: 'Petit-dejeuner' },
  { icon: Car,    label: 'Parking' },
  { icon: Star,   label: 'Note 4.8/5' },
];

const STATS = [
  { value: '4.8/5', label: 'Note clients' },
  { value: '500+',  label: 'Sejours realises' },
  { value: '24h',   label: 'Service disponible' },
  { value: '100%',  label: 'Paiement securise' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="bg-cover bg-center min-h-[560px] lg:min-h-[660px] flex items-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=70)' }}
        >
          {/* Overlay gradient fort pour lisibilite du texte */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36 text-white">
            {/* Badge hotel */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 shadow-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span>Hotel 4 etoiles &mdash; Abidjan, Cote d&apos;Ivoire</span>
            </div>
            {/* Titre principal - tres lisible */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-2xl leading-tight drop-shadow-lg">
              Un sejour d&apos;exception
              <br className="hidden sm:block" />
              <span className="text-brand-300"> au coeur de la ville</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg max-w-xl text-white/90 leading-relaxed font-medium">
              Reservez votre chambre en ligne en quelques clics et profitez d&apos;un service de qualite superieure.
            </p>
            {/* Amenites - badges plus lisibles */}
            <div className="mt-6 flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <span
                  key={a.label}
                  className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm"
                >
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </span>
              ))}
            </div>
            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/rooms" className="btn-primary px-7 py-3 text-base shadow-xl shadow-brand-500/30">
                Voir les chambres <ArrowRight className="h-5 w-5" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="btn border-2 border-white/60 text-white bg-white/10 backdrop-blur-md hover:bg-white/25 font-semibold px-7 py-3 text-base"
                >
                  Creer un compte
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bande */}
      <section className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200">
            {STATS.map((s) => (
              <div key={s.label} className="text-center py-6 px-4">
                <p className="text-2xl font-extrabold text-slate-950">{s.value}</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-950">
            Pourquoi nous choisir ?
          </h2>
          <p className="mt-3 text-base text-slate-600 max-w-md mx-auto">
            Nous mettons tout en oeuvre pour que votre sejour soit inoubliable.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center group hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-5 mx-auto ${f.iconClass}`}>
                <f.icon className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">Pret a reserver votre sejour ?</h2>
          <p className="mt-3 text-brand-100 text-base">
            Des chambres disponibles des aujourd&apos;hui &mdash; reservation en moins de 2 minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/rooms"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-7 py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-base"
            >
              Voir les chambres <ArrowRight className="h-4 w-4" />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                Creer mon compte
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
