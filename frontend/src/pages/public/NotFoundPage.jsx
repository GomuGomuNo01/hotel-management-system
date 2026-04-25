import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-6xl font-bold text-brand-500">404</h1>
      <p className="mt-4 text-lg text-gray-700">Cette page est introuvable.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">Retour à l'accueil</Link>
    </div>
  );
}
