import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble, Wallet, LogIn as CheckInIcon, LogOut as CheckOutIcon,
  ArrowRight, RotateCcw, ShieldCheck,
  CalendarCheck, MessageSquareWarning, CheckCircle2, CreditCard,
  Inbox, TrendingUp, Users, BarChart2, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi }          from '../../api/admin.api';
import { useAuth }           from '../../hooks/useAuth';
import { useAutoRefresh }    from '../../hooks/useAutoRefresh';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { useUiStore }        from '../../store/uiStore';
import StatusBadge    from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage   from '../../components/common/ErrorMessage';
import ConfirmModal   from '../../components/common/ConfirmModal';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { formatXOF }  from '../../utils/formatCurrency';
import {
  StatCard, OccupancyBar, SectionCard, ReservationRow, SectionTitle, PaginationBar,
} from '../../components/admin/dashboard/primitives';

/* ─── Libellés et couleurs par rôle ─────────────────────────────── */
const ROLE_LABELS = {
  manager:      'Manager',
  receptionist: 'Réceptionniste',
  accountant:   'Comptable',
};

/* Primitives présentationnelles (StatCard, OccupancyBar, SectionCard,
   ReservationRow, SectionTitle, PaginationBar) extraites dans
   components/admin/dashboard/primitives.jsx — importées ci-dessus. */

/* ══════════════════════════════════════════════════════════════════
   En-tête de page (commun aux 3 vues)
══════════════════════════════════════════════════════════════════ */
const ROLE_GRADIENT = {
  manager:      'from-violet-600 to-violet-500',
  receptionist: 'from-emerald-600 to-emerald-500',
  accountant:   'from-blue-600 to-blue-500',
};

function PageHeader({ user }) {
  const now     = new Date();
  const hour    = now.getHours();
  const salut   = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const todayFr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const role       = user?.role;
  const roleLabel  = ROLE_LABELS[role] ?? 'Administrateur';
  const gradient   = ROLE_GRADIENT[role] ?? 'from-slate-600 to-slate-500';
  const displayName = user?.last_name || user?.full_name?.split(' ')[0] || 'Admin';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} px-6 py-5 text-white shadow-lg`}>
      {/* Bulles décoratives */}
      <div className="absolute right-4 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute right-20 bottom-0 h-14 w-14 rounded-full bg-white/10" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-white/70 text-sm font-medium capitalize">{todayFr}</p>
          <h1 className="text-2xl md:text-3xl font-black mt-0.5 tracking-tight">
            {salut}, {displayName}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Bloc Arrivées & Départs (réutilisé dans les 3 vues)
══════════════════════════════════════════════════════════════════ */
function CheckInOutSection({ checkIns, checkOuts, actioning, setConfirm }) {
  return (
    <section>
      <SectionTitle to="/admin/checkin-checkout" linkLabel="Voir tout">
        Arrivées &amp; Départs - Aujourd'hui
      </SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard
          title="Arrivées prévues"
          subtitle={`${checkIns.length} client${checkIns.length !== 1 ? 's' : ''} attendu${checkIns.length !== 1 ? 's' : ''}`}
          icon={CheckInIcon} iconFg="text-emerald-600" iconBg="bg-emerald-50"
          isEmpty={checkIns.length === 0}
          emptyMsg="Aucune arrivée prévue aujourd'hui."
          action={
            <Link to="/admin/checkin-checkout" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {checkIns.map((r) => (
              <ReservationRow key={r.id} reservation={r} actionLabel="Valider l'arrivée"
                btnClass="bg-emerald-500 hover:bg-emerald-600"
                onAction={() => setConfirm({ type: 'in', reservation: r })}
                loading={actioning === r.id} />
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Départs prévus"
          subtitle={`${checkOuts.length} client${checkOuts.length !== 1 ? 's' : ''} à libérer`}
          icon={CheckOutIcon} iconFg="text-violet-600" iconBg="bg-violet-50"
          isEmpty={checkOuts.length === 0}
          emptyMsg="Aucun départ prévu aujourd'hui."
          action={
            <Link to="/admin/checkin-checkout" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {checkOuts.map((r) => (
              <ReservationRow key={r.id} reservation={r} actionLabel="Valider le départ"
                btnClass="bg-violet-500 hover:bg-violet-600"
                onAction={() => setConfirm({ type: 'out', reservation: r })}
                loading={actioning === r.id} />
            ))}
          </ul>
        </SectionCard>

      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Réservations récentes avec pagination (réutilisé)
══════════════════════════════════════════════════════════════════ */
const RES_PER_PAGE = 6;

function RecentReservationsSection({ recentRes }) {
  const [page, setPage] = useState(1);
  const total    = recentRes.length;
  const lastPage = Math.max(1, Math.ceil(total / RES_PER_PAGE));
  const safePage = Math.min(page, lastPage);
  const items    = recentRes.slice((safePage - 1) * RES_PER_PAGE, safePage * RES_PER_PAGE);

  return (
    <section>
      <SectionTitle to="/admin/reservations" linkLabel="Toutes les réservations">
        Réservations récentes
      </SectionTitle>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
            <Inbox className="h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">Aucune réservation enregistrée.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((r) => {
                const name = r.client?.full_name
                  || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                  || 'Client inconnu';
                const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                return (
                  <li key={r.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0 hidden sm:flex">
                      {initials || '?'}
                    </div>
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">{name}</p>
                        <span className="font-mono text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 flex-shrink-0 hidden md:inline">
                          #{String(r.id).padStart(4, '0')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        Ch. {r.room?.room_number ?? '-'} · {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                      </p>
                    </div>
                    {/* Montant + statut */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-sm font-extrabold text-slate-800 tabular-nums hidden sm:inline">
                        {formatXOF(r.total_amount)}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <PaginationBar
              page={safePage} lastPage={lastPage} total={total}
              itemLabel={`réservation${total !== 1 ? 's' : ''}`}
              setPage={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VUE RÉCEPTIONNISTE
   Focus : opérations du jour (arrivées, départs, réservations)
══════════════════════════════════════════════════════════════════ */
function ReceptionistView({ user, k, data, actioning, setConfirm }) {
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

/* ══════════════════════════════════════════════════════════════════
   VUE COMPTABLE
   Focus : finances (recettes, paiements, soldes, remboursements)
══════════════════════════════════════════════════════════════════ */
function AccountantView({ user, k, data, actioning, setConfirm }) {
  const pendings  = data?.pending_payments ?? [];
  const balances  = data?.pending_balances ?? [];
  const checkIns  = data?.today_check_ins  ?? [];
  const checkOuts = data?.today_check_outs ?? [];

  return (
    <div className="space-y-8 max-w-screen-xl mx-auto">

      <PageHeader user={user} />

      {/* KPI financier */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp}  color="emerald" value={formatXOF(k.revenue_today ?? 0)}       label="Encaissé aujourd'hui" sublabel="Paiements confirmés"       />
        <StatCard icon={BarChart2}   color="blue"    value={formatXOF(k.revenue_this_month ?? 0)}  label="Recettes ce mois"     sublabel="Total confirmé ce mois"    />
        <StatCard icon={CreditCard}  color="red"     value={k.pending_payments ?? 0}               label="Paiements en attente" sublabel={k.pending_payments_amount ? formatXOF(k.pending_payments_amount) : 'Mobile non confirmés'} to="/admin/remboursements" />
        <StatCard icon={Wallet}      color="amber"   value={k.pending_balances ?? 0}               label="Soldes à encaisser"   sublabel="Acomptes non soldés"       to="/admin/checkin-checkout" />
        <StatCard icon={RotateCcw}   color="orange"  value={k.pending_refunds ?? 0}                label="Remboursements"       sublabel="En attente de décision"    to="/admin/remboursements" />
      </div>

      {/* Soldes à encaisser - PRIORITÉ */}
      {balances.length > 0 && (
        <section>
          <SectionTitle to="/admin/checkin-checkout" linkLabel="Gérer">
            Soldes à encaisser
          </SectionTitle>
          <div className="rounded-xl border border-amber-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-bold text-amber-900">
                Ces clients ont payé un acompte - le solde doit être encaissé avant leur départ.
              </p>
            </div>
            <ul className="divide-y divide-amber-50 bg-white">
              {balances.map((r) => {
                const name = r.client?.full_name
                  || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                  || 'Client inconnu';
                return (
                  <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors">
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
          </div>
        </section>
      )}

      {/* Paiements mobile en attente */}
      <section>
        <SectionTitle to="/admin/remboursements" linkLabel="Voir tout">
          Paiements mobile en attente
        </SectionTitle>
        <SectionCard
          title="Transactions à confirmer"
          subtitle={
            (k.pending_payments ?? 0) > 0
              ? `${k.pending_payments} paiement${k.pending_payments > 1 ? 's' : ''} non confirmé${k.pending_payments > 1 ? 's' : ''}`
              : 'Aucun paiement en suspens'
          }
          icon={CreditCard} iconFg="text-red-600" iconBg="bg-red-50"
          isEmpty={pendings.length === 0}
          emptyMsg="Aucun paiement mobile en attente."
          action={
            <Link to="/admin/remboursements" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          }
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
      </section>

      {/* Arrivées & Départs (contexte pour encaissement d'acomptes) */}
      <CheckInOutSection
        checkIns={checkIns} checkOuts={checkOuts}
        actioning={actioning} setConfirm={setConfirm}
      />

      {/* Remboursements - bannière */}
      {(k.pending_refunds ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-orange-900">
                {k.pending_refunds} demande{k.pending_refunds > 1 ? 's' : ''} de remboursement en attente
              </p>
              <p className="text-xs text-orange-700 mt-0.5">Des clients attendent votre décision.</p>
            </div>
          </div>
          <Link to="/admin/remboursements"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-colors">
            Traiter <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VUE MANAGER
   Vue globale complète : KPI opérationnel + financier, alertes,
   chambres, arrivées/départs, prochaines arrivées, finances,
   réservations récentes, réclamations.
══════════════════════════════════════════════════════════════════ */
function BannerAlert({ icon: Icon, iconBg, iconFg, title, subtitle, to, btnLabel = 'Traiter', btnColor = 'bg-orange-600 hover:bg-orange-700' }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconFg}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-orange-900">{title}</p>
          {subtitle && <p className="text-xs text-orange-700 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <Link to={to} className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors ${btnColor}`}>
        {btnLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function BannerOk({ children }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
      <p className="text-sm font-medium text-emerald-800">{children}</p>
    </div>
  );
}

function ManagerView({ user, k, data, badgeCounts, alerts, can, actioning, setConfirm }) {
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

/* ══════════════════════════════════════════════════════════════════
   Tuile d'alerte cliquable (utilisée par ManagerView)
══════════════════════════════════════════════════════════════════ */
const ALERT_C = {
  emerald: { wrap: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', num: 'text-emerald-700', text: 'text-emerald-800', sub: 'text-emerald-600', iBg: 'bg-emerald-100', iFg: 'text-emerald-600', ar: 'text-emerald-400' },
  violet:  { wrap: 'bg-violet-50  border-violet-200  hover:bg-violet-100',  num: 'text-violet-700',  text: 'text-violet-800',  sub: 'text-violet-600',  iBg: 'bg-violet-100',  iFg: 'text-violet-600',  ar: 'text-violet-400'  },
  blue:    { wrap: 'bg-blue-50    border-blue-200    hover:bg-blue-100',    num: 'text-blue-700',    text: 'text-blue-800',    sub: 'text-blue-600',    iBg: 'bg-blue-100',    iFg: 'text-blue-600',    ar: 'text-blue-400'    },
  amber:   { wrap: 'bg-amber-50   border-amber-200   hover:bg-amber-100',   num: 'text-amber-700',   text: 'text-amber-800',   sub: 'text-amber-600',   iBg: 'bg-amber-100',   iFg: 'text-amber-600',   ar: 'text-amber-400'   },
  orange:  { wrap: 'bg-orange-50  border-orange-200  hover:bg-orange-100',  num: 'text-orange-700',  text: 'text-orange-800',  sub: 'text-orange-600',  iBg: 'bg-orange-100',  iFg: 'text-orange-600',  ar: 'text-orange-400'  },
  red:     { wrap: 'bg-red-50     border-red-200     hover:bg-red-100',     num: 'text-red-700',     text: 'text-red-800',     sub: 'text-red-600',     iBg: 'bg-red-100',     iFg: 'text-red-600',     ar: 'text-red-400'     },
};

function AlertTile({ count, label, sublabel, icon: Icon, color, to }) {
  const C = ALERT_C[color] ?? {};
  return (
    <Link to={to} className={`group relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${C.wrap}`}>
      {/* Accent bande droite */}
      <div className={`absolute right-0 top-0 h-full w-1 ${C.iBg} opacity-60`} />
      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${C.iBg}`}>
        <Icon className={`h-6 w-6 ${C.iFg}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-3xl font-black tabular-nums leading-none ${C.num}`}>{count}</p>
        <p className={`text-sm font-bold mt-0.5 ${C.text}`}>{label}</p>
        {sublabel && <p className={`text-xs mt-0.5 ${C.sub}`}>{sublabel}</p>}
      </div>
      <ArrowRight className={`h-4 w-4 ${C.ar} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE - sélectionne la vue selon le rôle
══════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const { user }        = useAuth();
  const { badgeCounts } = useUiStore();

  const { data, loading, error, refetch } = useAdminDashboard();
  const [actioning, setActioning] = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  // Rafraîchissement automatique sur événements métier
  useAutoRefresh(
    ['reservation.created', 'reservation.cancelled', 'payment.confirmed',
     'checkin.done', 'checkout.done', 'refund.requested', 'refund.processed'],
    () => refetch(),
    { debounceMs: 1000 },
  );

  const performAction = async () => {
    if (!confirm) return;
    setActioning(confirm.reservation.id);
    try {
      if (confirm.type === 'in') await adminApi.checkIn(confirm.reservation.id);
      else                       await adminApi.checkOut(confirm.reservation.id);
      toast.success(
        confirm.type === 'in'
          ? `Chambre N° ${confirm.reservation.room?.room_number} - arrivée enregistrée.`
          : `Chambre N° ${confirm.reservation.room?.room_number} libérée. La facture a été envoyée.`,
      );
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "L'opération a échoué. Réessayez.");
    } finally {
      setActioning(null);
      setConfirm(null);
    }
  };

  if (loading && !data) return <LoadingSpinner label="Chargement du tableau de bord…" />;
  if (error   && !data) return <ErrorMessage message={error} onRetry={refetch} />;

  const k    = data?.kpi ?? {};
  const role = user?.role;

  // Vérification des permissions (pour le Manager)
  const perms = new Set(user?.permissions ?? []);
  const can   = (p) => perms.has(p);

  // Alertes urgentes (ManagerView uniquement)
  const alerts = [
    can('manage_checkin_checkout') && (k.today_check_ins ?? 0) > 0 && {
      count: k.today_check_ins, label: "Arrivées aujourd'hui", sublabel: 'Clients attendus à enregistrer',
      icon: CheckInIcon, color: 'emerald', to: '/admin/checkin-checkout',
    },
    can('manage_checkin_checkout') && (k.today_check_outs ?? 0) > 0 && {
      count: k.today_check_outs, label: "Départs aujourd'hui", sublabel: 'Chambres à libérer',
      icon: CheckOutIcon, color: 'violet', to: '/admin/checkin-checkout',
    },
    can('manage_reservations') && (k.pending_reservations ?? 0) > 0 && {
      count: k.pending_reservations, label: 'Réservations non confirmées', sublabel: "En attente d'une action",
      icon: CalendarCheck, color: 'blue', to: '/admin/reservations',
    },
    can('manage_payments') && (k.pending_balances ?? 0) > 0 && {
      count: k.pending_balances, label: 'Soldes à encaisser', sublabel: 'Clients avec acompte non soldé',
      icon: Wallet, color: 'amber', to: '/admin/checkin-checkout',
    },
    can('manage_payments') && (k.pending_refunds ?? 0) > 0 && {
      count: k.pending_refunds, label: 'Remboursements à traiter', sublabel: "Clients en attente d'une réponse",
      icon: RotateCcw, color: 'orange', to: '/admin/remboursements',
    },
    can('manage_payments') && (k.pending_payments ?? 0) > 0 && {
      count: k.pending_payments, label: 'Paiements non confirmés', sublabel: 'Transactions mobile en attente',
      icon: CreditCard, color: 'red', to: '/admin/remboursements',
    },
    can('manage_complaints') && (badgeCounts.complaints ?? 0) > 0 && {
      count: badgeCounts.complaints, label: 'Réclamations ouvertes', sublabel: "Clients en attente d'une réponse",
      icon: MessageSquareWarning, color: 'orange', to: '/admin/reclamations',
    },
  ].filter(Boolean);

  const commonProps = { user, k, data, actioning, setConfirm };

  const modal = (
    <ConfirmModal
      open={!!confirm}
      title={confirm?.type === 'in' ? "Confirmer l'arrivée" : 'Confirmer le départ'}
      message={confirm
        ? `Enregistrer ${confirm.type === 'in' ? "l'arrivée" : 'le départ'} de ${
            confirm.reservation.client?.full_name
            ?? confirm.reservation.client?.first_name
            ?? 'ce client'
          } - Chambre N° ${confirm.reservation.room?.room_number} ?`
        : ''}
      confirmLabel="Valider"
      loading={!!actioning}
      onConfirm={performAction}
      onClose={() => setConfirm(null)}
    />
  );

  /* ── Réceptionniste ── */
  if (role === 'receptionist') {
    return <><ReceptionistView {...commonProps} />{modal}</>;
  }

  /* ── Comptable ── */
  if (role === 'accountant') {
    return <><AccountantView {...commonProps} />{modal}</>;
  }

  /* ── Manager (défaut) ── */
  return (
    <>
      <ManagerView {...commonProps} badgeCounts={badgeCounts} alerts={alerts} can={can} />
      {modal}
    </>
  );
}
