import { Link } from 'react-router-dom';
import {
  CalendarCheck, BedDouble, UserCircle, ArrowRight,
  Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useReservations } from '../../hooks/useReservations';
import ReservationCard from '../../components/reservations/ReservationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const QUICK_LINKS = [
  {
    to:    '/mon-espace/reservations',
    icon:  CalendarCheck,
    label: 'Mes réservations',
    desc:  'Historique & suivi',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    border:'hover:border-blue-200 dark:hover:border-blue-800',
  },
  {
    to:    '/rooms',
    icon:  BedDouble,
    label: 'Chambres',
    desc:  'Réserver une chambre',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    border:'hover:border-emerald-200 dark:hover:border-emerald-800',
  },
  {
    to:    '/mon-espace/profil',
    icon:  UserCircle,
    label: 'Mon profil',
    desc:  'Informations & sécurité',
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    border:'hover:border-violet-200 dark:hover:border-violet-800',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useReservations({ per_page: 4 });

  const pending   = data.filter((r) => r.status === 'pending').length;
  const confirmed = data.filter((r) => r.status === 'confirmed' || r.status === 'checked_in').length;
  const cancelled = data.filter((r) => r.status === 'cancelled').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Bienvenue */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bonjour, {user?.first_name || 'cher client'} 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Bienvenue dans votre espace personnel.
          </p>
        </div>
      </div>

      {/* Mini stats */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'En attente',  value: pending,   icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Actives',     value: confirmed, icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Annulées',    value: cancelled, icon: XCircle,       color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map((s) => (
            <div key={s.label} className="card card-pad flex items-center gap-3">
              <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accès rapides */}
      <div className="grid sm:grid-cols-3 gap-4">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`card card-pad flex items-center gap-4 transition-all duration-150 hover:shadow-md ${l.border} group`}
          >
            <div className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${l.color} transition-transform duration-200 group-hover:scale-110`}>
              <l.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{l.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{l.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>

      {/* Dernières réservations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Dernières réservations
          </h2>
          <Link
            to="/mon-espace/reservations"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : !data.length ? (
          <EmptyState
            icon={CalendarCheck}
            title="Aucune réservation"
            message="Vous n'avez pas encore effectué de réservation."
            ctaLabel="Parcourir les chambres"
            ctaTo="/rooms"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.map((r) => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
