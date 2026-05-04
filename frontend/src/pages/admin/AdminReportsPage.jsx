import { useCallback, useEffect, useState } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, BedDouble,
  CalendarCheck, RotateCcw, CreditCard, Loader2,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatXOF } from '../../utils/formatCurrency';

/* ── Petite carte KPI ──────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, color = 'brand' }) {
  const colors = {
    brand:   'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    slate:   'bg-slate-100 text-slate-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Barre de progression ──────────────────────────────────────── */
function ProgressBar({ label, value, max, format }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{format ? format(value) : value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-2 bg-brand-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Graphique simplifié des revenus mensuels ──────────────────── */
function RevenueChart({ data }) {
  if (!data?.length) return <p className="text-sm text-slate-400 italic text-center py-4">Aucune donnée disponible.</p>;

  const max = Math.max(...data.map((d) => d.total), 1);

  const monthLabel = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="flex items-end gap-1.5 h-32 pt-2">
      {data.map((d) => {
        const h = Math.max(4, Math.round((d.total / max) * 100));
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-brand-500/80 hover:bg-brand-600 rounded-t-sm transition-colors cursor-default"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-slate-400 group-hover:text-slate-600 whitespace-nowrap">
              {monthLabel(d.month)}
            </span>
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10 shadow">
              {formatXOF(d.total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Page principale ───────────────────────────────────────────── */
export default function AdminReportsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.reports.summary();
      setData(res?.data ?? res);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les rapports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Chargement des rapports…" />;
  if (error)   return <ErrorMessage message={error} onRetry={load} />;

  const revenueGrowth = data?.revenue?.last_month > 0
    ? (((data.revenue.this_month - data.revenue.last_month) / data.revenue.last_month) * 100).toFixed(1)
    : null;

  const isGrowthPositive = revenueGrowth >= 0;

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <BarChart2 className="h-7 w-7 text-brand-600" />
          Rapports financiers
        </h1>
        <p className="text-sm text-slate-500 mt-1">Aperçu global des performances de l'hôtel.</p>
      </div>

      {/* KPI revenus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenus ce mois"
          value={formatXOF(data?.revenue?.this_month ?? 0)}
          sub={
            revenueGrowth !== null
              ? `${isGrowthPositive ? '+' : ''}${revenueGrowth}% vs mois dernier`
              : 'Premier mois enregistré'
          }
          icon={isGrowthPositive ? TrendingUp : TrendingDown}
          color={isGrowthPositive ? 'emerald' : 'red'}
        />
        <KpiCard
          label="Revenus mois précédent"
          value={formatXOF(data?.revenue?.last_month ?? 0)}
          icon={TrendingUp}
          color="slate"
        />
        <KpiCard
          label="Réservations (total)"
          value={data?.reservations?.total ?? 0}
          sub={`${data?.reservations?.this_month ?? 0} ce mois`}
          icon={CalendarCheck}
          color="brand"
        />
        <KpiCard
          label="Taux d'occupation"
          value={`${data?.rooms?.occupancy_rate ?? 0} %`}
          sub={`${data?.rooms?.occupied ?? 0} / ${data?.rooms?.total ?? 0} chambres`}
          icon={BedDouble}
          color="amber"
        />
      </div>

      {/* Graphique revenus mensuels */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Revenus des 12 derniers mois
        </h2>
        <RevenueChart data={data?.revenue?.by_month} />
      </div>

      {/* Réservations + Chambres + Remboursements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Réservations par statut */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brand-500" /> Réservations
          </h2>
          {[
            { label: 'Confirmées',  key: 'confirmed' },
            { label: 'En cours',    key: 'checked_in' },
            { label: 'Terminées',   key: 'completed' },
            { label: 'Annulées',    key: 'cancelled' },
          ].map(({ label, key }) => (
            <ProgressBar
              key={key}
              label={label}
              value={data?.reservations?.[key] ?? 0}
              max={data?.reservations?.total ?? 1}
            />
          ))}
        </div>

        {/* Chambres */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-brand-500" /> Chambres
          </h2>
          {[
            { label: 'Disponibles',   key: 'available' },
            { label: 'Occupées',      key: 'occupied' },
            { label: 'Maintenance',   key: 'maintenance' },
          ].map(({ label, key }) => (
            <ProgressBar
              key={key}
              label={label}
              value={data?.rooms?.[key] ?? 0}
              max={data?.rooms?.total ?? 1}
            />
          ))}
        </div>

        {/* Remboursements */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-brand-500" /> Remboursements
          </h2>
          <div className="space-y-2">
            {[
              { label: 'En attente', value: data?.refunds?.pending   ?? 0, cls: 'text-amber-700 bg-amber-50'   },
              { label: 'Approuvés',  value: data?.refunds?.approved  ?? 0, cls: 'text-emerald-700 bg-emerald-50' },
              { label: 'Refusés',    value: data?.refunds?.rejected  ?? 0, cls: 'text-red-700 bg-red-50'       },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${cls}`}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 text-xs text-slate-500 flex justify-between">
              <span>Total remboursé</span>
              <span className="font-semibold text-slate-700">
                {formatXOF(data?.refunds?.total_amount_refunded ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Méthodes de paiement + Top chambres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Méthodes de paiement */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-500" /> Méthodes de paiement
          </h2>
          {data?.payment_methods?.length ? (
            <div className="space-y-3">
              {data.payment_methods.map((pm) => {
                const totalAmount = data.payment_methods.reduce((s, p) => s + p.total, 0);
                return (
                  <ProgressBar
                    key={pm.method}
                    label={pm.method}
                    value={pm.total}
                    max={totalAmount}
                    format={formatXOF}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucune donnée.</p>
          )}
        </div>

        {/* Top chambres */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-brand-500" /> Chambres les plus réservées
          </h2>
          {data?.top_rooms?.length ? (
            <div className="space-y-2">
              {data.top_rooms.map((r, i) => (
                <div key={r.room_id} className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 w-4 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      Chambre {r.room_number}
                    </p>
                    <p className="text-xs text-slate-400">{r.room_type}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-600 flex-shrink-0">
                    {r.bookings} rés.
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucune donnée.</p>
          )}
        </div>
      </div>
    </div>
  );
}
