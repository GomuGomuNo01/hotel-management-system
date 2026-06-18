import { Link } from 'react-router-dom';
import {
  BedDouble, Wallet, LogIn as CheckInIcon, LogOut as CheckOutIcon,
  ArrowRight, RotateCcw, MessageSquareWarning,
  CheckCircle2, CreditCard, TrendingUp, Users, BarChart2,
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import { formatXOF } from '../../../utils/formatCurrency';
import { StatCard, OccupancyBar, SectionCard, SectionTitle } from './primitives';
import {
  PageHeader, CheckInOutSection, RecentReservationsSection,
  BannerAlert, BannerOk, AlertTile,
} from './sections';

/**
 * Vue Manager — vue globale complète : KPI opérationnel + financier, alertes,
 * chambres, arrivées/départs, finances détaillées, réservations récentes.
 * Extraite de AdminDashboardPage.
 */
export default function ManagerView({ user, k, data, badgeCounts, alerts, can, actioning, setConfirm }) {
  const checkIns    = data?.today_check_ins     ?? [];
  const checkOuts   = data?.today_check_outs    ?? [];
  const pendings    = data?.pending_payments    ?? [];
  const balances    = data?.pending_balances    ?? [];
  const recentRes   = data?.recent_reservations ?? [];
  const upcomingIns = data?.upcoming_checkins   ?? [];

  const canRooms = can('manage_rooms');
  const canPay   = can('manage_payments');
  const canCheck = can('manage_checkin_checkout');
  const canRes   = can('manage_reservations');

  return (
    <div className="space-y-8 max-w-screen-xl mx-auto">

      <PageHeader user={user} />

      {/* ══ KPI OPÉRATIONNEL ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {canRooms && (
          <StatCard icon={BedDouble}    color="emerald" value={k.available_rooms ?? 0}  label="Chambres libres"    sublabel={`${k.occupied_rooms ?? 0} occupées`}    to="/admin/rooms" />
        )}
        <StatCard   icon={Users}        color="indigo"  value={k.checked_in_count ?? 0} label="Clients en séjour"  sublabel="Actuellement à l'hôtel" />
        {canCheck && (
          <StatCard icon={CheckInIcon}  color="blue"    value={k.today_check_ins ?? 0}  label="Arrivées aujourd'hui" sublabel="À enregistrer"       to="/admin/checkin-checkout" />
        )}
        {canCheck && (
          <StatCard icon={CheckOutIcon} color="violet"  value={k.today_check_outs ?? 0} label="Départs aujourd'hui"  sublabel="Chambres à libérer"   to="/admin/checkin-checkout" />
        )}
      </div>

      {/* ══ KPI FINANCIER ══ */}
      {canPay && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} color="emerald" value={formatXOF(k.revenue_today ?? 0)}       label="Encaissé aujourd'hui" sublabel="Paiements confirmés"    />
          <StatCard icon={BarChart2}  color="blue"    value={formatXOF(k.revenue_this_month ?? 0)}  label="Recettes ce mois"     sublabel="Total confirmé ce mois" />
          <StatCard icon={Wallet}     color="amber"   value={k.pending_balances ?? 0}               label="Soldes à encaisser"   sublabel="Acomptes non soldés"    to="/admin/checkin-checkout" />
        </div>
      )}

      {/* ══ CE QUI DEMANDE VOTRE ATTENTION ══ */}
      <section>
        <SectionTitle>Ce qui demande votre attention</SectionTitle>
        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {alerts.map((a) => <AlertTile key={a.label} {...a} />)}
          </div>
        ) : (
          <div className="flex items-center gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Tout est en ordre pour l'instant</p>
              <p className="text-xs text-emerald-700 mt-0.5">Aucune action urgente à traiter - bonne journée !</p>
            </div>
          </div>
        )}
      </section>

      {/* ══ ÉTAT DE L'HÔTEL (chambres + réclamations/remboursements) ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chambres */}
        {canRooms && (
          <section>
            <SectionTitle to="/admin/rooms" linkLabel="Gérer les chambres">
              État des chambres
            </SectionTitle>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">
              <OccupancyBar
                available={k.available_rooms    ?? 0}
                occupied={k.occupied_rooms      ?? 0}
                maintenance={k.maintenance_rooms ?? 0}
              />
            </div>
          </section>
        )}

        {/* Réclamations & Remboursements */}
        <section>
          <SectionTitle>Réclamations &amp; Remboursements</SectionTitle>
          <div className="space-y-3">
            {(badgeCounts.complaints ?? 0) > 0 ? (
              <BannerAlert
                icon={MessageSquareWarning} iconBg="bg-orange-100" iconFg="text-orange-600"
                title={`${badgeCounts.complaints} réclamation${badgeCounts.complaints > 1 ? 's' : ''} ouverte${badgeCounts.complaints > 1 ? 's' : ''}`}
                subtitle="Des clients signalent un problème et attendent votre réponse."
                to="/admin/reclamations"
              />
            ) : (
              <BannerOk>Aucune réclamation ouverte</BannerOk>
            )}
            {canPay && ((k.pending_refunds ?? 0) > 0 ? (
              <BannerAlert
                icon={RotateCcw} iconBg="bg-orange-100" iconFg="text-orange-600"
                title={`${k.pending_refunds} demande${k.pending_refunds > 1 ? 's' : ''} de remboursement en attente`}
                subtitle="Des clients attendent votre décision."
                to="/admin/remboursements"
              />
            ) : (
              <BannerOk>Aucun remboursement en attente</BannerOk>
            ))}
          </div>
        </section>

      </div>

      {/* ══ ARRIVÉES & DÉPARTS DU JOUR ══ */}
      <CheckInOutSection
        checkIns={checkIns} checkOuts={checkOuts}
        actioning={actioning} setConfirm={setConfirm}
      />

      {/* ══ PROCHAINES ARRIVÉES (3 jours) ══ */}
      {upcomingIns.length > 0 && (
        <section>
          <SectionTitle to="/admin/reservations">
            Prochaines arrivées — 3 prochains jours ({k.upcoming_checkins_3days ?? upcomingIns.length})
          </SectionTitle>
          <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {upcomingIns.map((r) => {
                const name = r.client?.full_name
                  || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                  || 'Client inconnu';
                const diff = Math.round((new Date(r.check_in_date) - new Date()) / (1000 * 60 * 60 * 24));
                const dayLabel = diff === 1 ? 'Demain' : `J+${diff}`;
                return (
                  <li key={r.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                      diff === 1
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        : 'text-blue-700 bg-blue-50 border-blue-100'
                    }`}>{dayLabel}</span>
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

      {/* ══ FINANCES DÉTAIL (soldes + paiements) ══ */}
      {canPay && (
        <section>
          <SectionTitle>Finances — détail</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <SectionCard
              title="Soldes à encaisser"
              subtitle={balances.length > 0
                ? `${balances.length} client${balances.length > 1 ? 's' : ''} avec acompte non soldé`
                : 'Tout est réglé'}
              icon={Wallet} iconFg="text-amber-600" iconBg="bg-amber-50"
              isEmpty={balances.length === 0}
              emptyMsg="Aucun solde en attente."
              action={<Link to="/admin/checkin-checkout" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">Gérer <ArrowRight className="h-3 w-3" /></Link>}
            >
              <ul className="divide-y divide-slate-100">
                {balances.map((r) => {
                  const name = r.client?.full_name
                    || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                    || 'Client inconnu';
                  return (
                    <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          Chambre {r.room?.room_number ?? '-'} · {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-extrabold text-amber-700 tabular-nums">{formatXOF(r.remaining_amount)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Solde restant</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard
              title="Paiements mobile en attente"
              subtitle={pendings.length > 0
                ? `${pendings.length} paiement${pendings.length > 1 ? 's' : ''} non confirmé${pendings.length > 1 ? 's' : ''}`
                : 'Aucun paiement en suspens'}
              icon={CreditCard} iconFg="text-red-600" iconBg="bg-red-50"
              isEmpty={pendings.length === 0}
              emptyMsg="Aucun paiement mobile en attente."
              action={<Link to="/admin/remboursements" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">Voir tout <ArrowRight className="h-3 w-3" /></Link>}
            >
              <ul className="divide-y divide-slate-100">
                {pendings.map((p) => {
                  const name = p.reservation?.client?.full_name
                    || `${p.reservation?.client?.last_name ?? ''} ${p.reservation?.client?.first_name ?? ''}`.trim()
                    || 'Client inconnu';
                  return (
                    <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(p.created_at)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-extrabold text-slate-900 tabular-nums">{formatXOF(p.amount)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">En attente</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

          </div>
        </section>
      )}

      {/* ══ RÉSERVATIONS RÉCENTES ══ */}
      {canRes && <RecentReservationsSection recentRes={recentRes} />}

    </div>
  );
}
