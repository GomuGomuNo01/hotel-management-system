import { Link } from 'react-router-dom';
import {
  TrendingUp, BarChart2, CreditCard, Wallet, RotateCcw, ArrowRight,
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import { formatXOF } from '../../../utils/formatCurrency';
import { StatCard, SectionCard, SectionTitle } from './primitives';
import { PageHeader, CheckInOutSection } from './sections';

/**
 * Vue Comptable — focus finances (recettes, paiements, soldes,
 * remboursements). Extraite de AdminDashboardPage.
 */
export default function AccountantView({ user, k, data, actioning, setConfirm }) {
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
