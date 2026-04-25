import { Link } from 'react-router-dom';
import { BedDouble, ShieldCheck, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=70)' }}
        >
          <div className="bg-black/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36 text-white">
              <h1 className="text-3xl lg:text-5xl font-bold max-w-2xl">
                Un séjour confortable au cœur de la ville
              </h1>
              <p className="mt-4 text-lg max-w-xl text-gray-200">
                Réservez votre chambre en ligne en quelques clics et profitez d'un service de qualité.
              </p>
              <div className="mt-8 flex gap-3">
                <Link to="/rooms" className="btn-primary">Voir les chambres</Link>
                <Link to="/register" className="btn-secondary">Créer un compte</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: BedDouble, title: 'Chambres confortables', desc: 'Du lit simple à la suite familiale, trouvez ce qu\'il vous faut.' },
          { icon: ShieldCheck, title: 'Paiement sécurisé', desc: 'Payez via Orange CI ou Wave CI en toute sérénité.' },
          { icon: Sparkles, title: 'Service attentionné', desc: 'Une équipe disponible 24h/24 pour rendre votre séjour parfait.' },
        ].map((f) => (
          <div key={f.title} className="card card-pad text-center">
            <f.icon className="h-10 w-10 mx-auto text-brand-500" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
