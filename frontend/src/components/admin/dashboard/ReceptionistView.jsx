import {
  Users, LogIn as CheckInIcon, LogOut as CheckOutIcon, Clock,
} from 'lucide-react';
import { formatDate } from '../../../utils/formatDate';
import { formatXOF } from '../../../utils/formatCurrency';
import { StatCard, SectionTitle } from './primitives';
import { PageHeader, CheckInOutSection, RecentReservationsSection } from './sections';

/**
 * Vue Réceptionniste — focus opérations du jour (arrivées, départs,
 * réservations). Extraite de AdminDashboardPage.
 */
export default function ReceptionistView({ user, k, data, actioning, setConfirm }) {
  const checkIns    = data?.today_check_ins      ?? [];
  const checkOuts   = data?.today_check_outs     ?? [];
  const recentRes   = data?.recent_reservations  ?? [];
  const upcomingIns = data?.upcoming_checkins    ?? [];

  return (
    <div className="space-y-8 max-w-screen-xl mx-auto">

      <PageHeader user={user} />

      {/* KPI opérationnel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users}        color="indigo"  value={k.checked_in_count ?? 0}     label="Clients en séjour"       sublabel="Actuellement à l'hôtel"    />
        <StatCard icon={CheckInIcon}  color="emerald" value={k.today_check_ins ?? 0}      label="Arrivées aujourd'hui"    sublabel="Clients à enregistrer"     to="/admin/checkin-checkout" />
        <StatCard icon={CheckOutIcon} color="violet"  value={k.today_check_outs ?? 0}     label="Départs aujourd'hui"     sublabel="Chambres à libérer"        to="/admin/checkin-checkout" />
        <StatCard icon={Clock}        color="amber"   value={k.pending_reservations ?? 0} label="Réservations en attente" sublabel="Sans paiement confirmé"     to="/admin/reservations" />
      </div>

      {/* Arrivées & Départs */}
      <CheckInOutSection
        checkIns={checkIns} checkOuts={checkOuts}
        actioning={actioning} setConfirm={setConfirm}
      />

      {/* Prochaines arrivées - 3 jours */}
      {upcomingIns.length > 0 && (
        <section>
          <SectionTitle to="/admin/reservations">
            Prochaines arrivées - 3 prochains jours ({k.upcoming_checkins_3days ?? upcomingIns.length})
          </SectionTitle>
          <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {upcomingIns.map((r) => {
                const name = r.client?.full_name
                  || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                  || 'Client inconnu';
                const diff = Math.round(
                  (new Date(r.check_in_date) - new Date()) / (1000 * 60 * 60 * 24)
                );
                const dayLabel = diff === 1 ? 'Demain' : `J+${diff}`;
                return (
                  <li key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                      diff === 1
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        : 'text-blue-700 bg-blue-50 border-blue-100'
                    }`}>
                      {dayLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        Chambre {r.room?.room_number ?? '-'} · {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-slate-700 tabular-nums flex-shrink-0 hidden sm:inline">
                      {formatXOF(r.total_amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Réservations récentes */}
      <RecentReservationsSection recentRes={recentRes} />

    </div>
  );
}
