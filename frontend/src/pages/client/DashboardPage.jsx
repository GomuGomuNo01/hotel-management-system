import { Link } from 'react-router-dom';
import { CalendarCheck, BedDouble, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useReservations } from '../../hooks/useReservations';
import ReservationCard from '../../components/reservations/ReservationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useReservations({ per_page: 4 });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bonjour {user?.first_name || ''} 👋</h1>
        <p className="text-gray-500">Bienvenue dans votre espace personnel.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Link to="/mon-espace/reservations" className="card card-pad flex items-center gap-3 hover:border-brand-300 transition">
          <CalendarCheck className="h-8 w-8 text-brand-500" />
          <div>
            <p className="font-semibold">Mes réservations</p>
            <p className="text-sm text-gray-500">Voir l'historique</p>
          </div>
        </Link>
        <Link to="/rooms" className="card card-pad flex items-center gap-3 hover:border-brand-300 transition">
          <BedDouble className="h-8 w-8 text-brand-500" />
          <div>
            <p className="font-semibold">Chambres</p>
            <p className="text-sm text-gray-500">Réserver une chambre</p>
          </div>
        </Link>
        <Link to="/mon-espace/profil" className="card card-pad flex items-center gap-3 hover:border-brand-300 transition">
          <User className="h-8 w-8 text-brand-500" />
          <div>
            <p className="font-semibold">Profil</p>
            <p className="text-sm text-gray-500">Mes informations</p>
          </div>
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-3">Dernières réservations</h2>
      {loading ? (
        <LoadingSpinner />
      ) : !data.length ? (
        <EmptyState message="Aucune réservation pour le moment." ctaLabel="Faire une réservation" ctaTo="/rooms" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((r) => <ReservationCard key={r.id} reservation={r} />)}
        </div>
      )}
    </div>
  );
}
