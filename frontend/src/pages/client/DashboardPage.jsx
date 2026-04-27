import { Link } from 'react-router-dom';
import {
  CalendarCheck, BedDouble, UserCircle, ArrowRight,
  Clock, CheckCircle2, XCircle, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useReservations } from '../../hooks/useReservations';
import ReservationCard from '../../components/reservations/ReservationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const QUICK_LINKS = [
  {
    to: '/mon-espace/reservations',
    icon: CalendarCheck,
    label: 'Mes reservations',
    desc: 'Historique & suivi',
    iconClass: 'bg-blue-100 text-blue-700',
    border: 'hover:border-blue-300',
    accent: 'group-hover:bg-blue-50',
  },
  {
    to: '/rooms',
    icon: BedDouble,
    label: 'Chambres',
    desc: 'Reserver une chambre',
    iconClass: 'bg-emerald-100 text-emerald-700',
    border: 'hover:border-emerald-300',
    accent: 'group-hover:bg-emerald-50',
  },
  {
    to: '/mon-espace/profil',
    icon: UserCircle,
    label: 'Mon profil',
    desc: 'Informations & securite',
    iconClass: 'bg-violet-100 text-violet-700',
    border: 'hover:border-violet-300',
    accent: 'group-hover:bg-violet-50',
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
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl px-6 py-7 text-white shadow-lg shadow-brand-500/20">
        <p className="text-sm font-medium text-brand-100 mb-1">Bienvenue dans votre espace personnel</p>
        <h1 className="text-2xl font-bold">
          Bonjour, {user?.first_name || 'cher client'} !
        </h1>
        <p className="mt-1 text-sm text-brand-100">
          Gerez vos reservations et votre profil depuis ce tableau de bord.
        </p>
        <Link
          to="/rooms"
          className="inline-flex items-center gap-2 mt-4 bg-white text-brand-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors shadow-sm"
        >
          <BedDouble className="h-4 w-4" />
          Voir les chambres
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Mini stats - toujours affichees, meme a zero */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'En attente',
            value: pending,
            icon: Clock,
            iconClass: 'bg-amber-100 text-amber-700',
            border: 'border-l-4 border-l-amber-500',
          },
          {
            label: 'Actives',
            value: confirmed,
            icon: CheckCircle2,
            iconClass: 'bg-emerald-100 text-emerald-700',
            border: 'border-l-4 border-l-emerald-500',
          },
          {
            label: 'Annulees',
            value: cancelled,
            icon: XCircle,
            iconClass: 'bg-red-100 text-red-700',
            border: 'border-l-4 border-l-red-500',
          },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 ${s.border}`}>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${s.iconClass}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-950 tabular-nums leading-none">
                  {loading ? '...' : s.value}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Acces rapides */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Acces rapide</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`group bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 transition-all duration-150 hover:shadow-md ${l.border}`}
            >
              <div className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${l.iconClass} transition-transform duration-200 group-hover:scale-110`}>
                <l.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{l.label}</p>
                <p className="text-xs font-medium text-slate-600 truncate">{l.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 ml-auto flex-shrink-0 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* Dernieres reservations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Dernieres reservations
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">Vos 4 sejours les plus recents</p>
          </div>
          <Link
            to="/mon-espace/reservations"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 transition-colors"
          >
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : !data.length ? (
          <EmptyState
            icon={CalendarCheck}
            title="Aucune reservation"
            message="Vous n'avez pas encore effectue de reservation."
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
