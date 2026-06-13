/**
 * AdminReportsPage - Rapports financiers
 *
 * Dashboard financier professionnel :
 *   - KPIs executives (6 métriques clés)
 *   - Graphiques SVG natifs (aucune dépendance externe)
 *   - Indicateurs hôteliers : ADR, RevPAR, taux d'occupation
 *   - Réservations / Chambres / Remboursements / Méthodes / Top chambres
 *   - Alertes créances et paiements en suspens
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  BarChart2, TrendingUp, TrendingDown, BedDouble,
  CalendarCheck, RotateCcw, CreditCard, Wallet,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Clock, Hotel, BadgeDollarSign, RefreshCw,
} from 'lucide-react';
import { adminApi }      from '../../api/admin.api';
import LoadingSpinner    from '../../components/common/LoadingSpinner';
import ErrorMessage      from '../../components/common/ErrorMessage';
import { formatXOF }     from '../../utils/formatCurrency';

/* ══════════════════════════════════════════════════════
 │  UTILS
 ══════════════════════════════════════════════════════ */
const PROVIDERS = {
  orange_ci: { label: 'Orange Money CI', color: '#f97316' },
  wave_ci:   { label: 'Wave CI',         color: '#3b82f6' },
  cash:      { label: 'Espèces',         color: '#64748b' },
};

/** Formatage compact pour les axes SVG  */
function compactXOF(v) {
  if (!v) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

/** Label de mois "avr. 25" depuis "2025-04" */
function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

/* ══════════════════════════════════════════════════════
 │  GRAPHIQUES SVG (fiables, sans dépendance)
 ══════════════════════════════════════════════════════ */

/**
 * Graphique en barres SVG - 12 mois
 * Approche SVG avec coordonnées explicites pour éviter les problèmes CSS %.
 */
function SvgBarChart({ data = [], valueKey = 'total', labelFn = (x) => x, color = '#3b82f6' }) {
  const [hovered, setHovered] = useState(null);

  // Dimensions virtuelles (viewBox) - le SVG sera responsive via CSS
  const W = 800, H = 240;
  const PT = 12, PR = 12, PB = 44, PL = 72; // padding top/right/bottom/left
  const cW = W - PL - PR; // largeur zone chart
  const cH = H - PT - PB; // hauteur zone chart

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400 italic">
        Aucune donnée disponible pour la période sélectionnée.
      </div>
    );
  }

  const values = data.map((d) => d[valueKey] ?? 0);
  const max    = Math.max(...values, 1);

  const spacing = cW / data.length;
  const barW    = Math.max(6, spacing * 0.6);
  const barOff  = (spacing - barW) / 2;

  const xOf = (i) => PL + i * spacing + barOff;
  const yOf = (v) => PT + cH - (v / max) * cH;
  const hOf = (v) => (v / max) * cH;

  // 5 lignes de grille horizontale
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    f,
    y:   PT + cH * (1 - f),
    val: max * f,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ height: 240, overflow: 'visible' }}
    >
      {/* Grille horizontale */}
      {ticks.map(({ f, y, val }) => (
        <g key={f}>
          <line
            x1={PL} y1={y} x2={W - PR} y2={y}
            stroke={f === 0 ? '#cbd5e1' : '#e2e8f0'}
            strokeWidth={f === 0 ? 1.5 : 1}
            strokeDasharray={f > 0 ? '4 4' : ''}
          />
          <text x={PL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="system-ui,sans-serif">
            {compactXOF(val)}
          </text>
        </g>
      ))}

      {/* Barres */}
      {data.map((d, i) => {
        const v  = d[valueKey] ?? 0;
        const x  = xOf(i);
        const bH = Math.max(v > 0 ? 2 : 0, hOf(v));
        const y  = PT + cH - bH;
        const isH = hovered === i;
        const label = labelFn(d);

        return (
          <g
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          >
            {/* Barre */}
            <rect
              x={x} y={y}
              width={barW} height={bH}
              rx={3} ry={3}
              fill={isH ? color : color + 'aa'}
              style={{ transition: 'fill 0.15s' }}
            />

            {/* Tooltip SVG */}
            {isH && v > 0 && (() => {
              const tx = Math.min(Math.max(x + barW / 2, PL + 50), W - PR - 50);
              const ty = y - 10;
              return (
                <g>
                  <rect x={tx - 52} y={ty - 24} width={104} height={26} rx={5} fill="#1e293b" />
                  <text x={tx} y={ty - 6} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">
                    {formatXOF(v)}
                  </text>
                </g>
              );
            })()}

            {/* Label axe X */}
            <text
              x={x + barW / 2} y={H - 6}
              textAnchor="middle" fontSize="10"
              fill={isH ? '#475569' : '#94a3b8'}
              fontWeight={isH ? 'bold' : 'normal'}
              fontFamily="system-ui,sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Graphique journalier (sparkline barres) - mois en cours
 */
function SvgDailyChart({ data = [] }) {
  const [hovered, setHovered] = useState(null);

  const W = 800, H = 160;
  const PT = 8, PR = 12, PB = 36, PL = 52;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const today   = new Date().getDate();
  const daysInM = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  // Construire tableau complet 1..today avec 0 pour jours sans données
  const byDay = {};
  data.forEach((d) => { byDay[d.day] = d.total; });
  const fullData = Array.from({ length: today }, (_, i) => ({
    day:   i + 1,
    total: byDay[i + 1] ?? 0,
  }));

  if (!fullData.length) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-slate-400 italic">
        Aucun paiement enregistré ce mois.
      </div>
    );
  }

  const max    = Math.max(...fullData.map((d) => d.total), 1);
  const spacing = cW / today;
  const barW   = Math.max(3, spacing * 0.7);
  const barOff = (spacing - barW) / 2;

  const ticks = [0, 0.5, 1].map((f) => ({ f, y: PT + cH * (1 - f), val: max * f }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height: 160, overflow: 'visible' }}>
      {/* Grille */}
      {ticks.map(({ f, y, val }) => (
        <g key={f}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={f === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={f === 0 ? 1.5 : 1} strokeDasharray={f > 0 ? '3 3' : ''} />
          <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="system-ui,sans-serif">{compactXOF(val)}</text>
        </g>
      ))}

      {/* Barres */}
      {fullData.map((d, i) => {
        const bH  = Math.max(d.total > 0 ? 2 : 0, (d.total / max) * cH);
        const x   = PL + i * spacing + barOff;
        const y   = PT + cH - bH;
        const isH = hovered === i;

        return (
          <g key={d.day} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
            <rect
              x={x} y={y} width={barW} height={bH} rx={2} ry={2}
              fill={d.total === 0 ? '#e2e8f0' : isH ? '#10b981' : '#34d39988'}
              style={{ transition: 'fill 0.15s' }}
            />
            {/* Label jour (tous les 5) */}
            {(d.day === 1 || d.day % 5 === 0) && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                {d.day}
              </text>
            )}
            {/* Tooltip */}
            {isH && d.total > 0 && (() => {
              const tx = Math.min(Math.max(x + barW / 2, PL + 45), W - PR - 45);
              return (
                <g>
                  <rect x={tx - 45} y={y - 28} width={90} height={22} rx={4} fill="#1e293b" />
                  <text x={tx} y={y - 13} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">
                    J{d.day} · {compactXOF(d.total)}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
 │  COMPOSANTS UI
 ══════════════════════════════════════════════════════ */

/** Carte KPI */
function KpiCard({ label, value, sub, icon: Icon, accent = 'brand', trend, alert }) {
  const variants = {
    brand:   'border-brand-100   bg-gradient-to-br from-white to-brand-50/40   icon-bg:bg-brand-50   icon-text:text-brand-600',
    emerald: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 icon-bg:bg-emerald-50 icon-text:text-emerald-600',
    amber:   'border-amber-100   bg-gradient-to-br from-white to-amber-50/40   icon-bg:bg-amber-50   icon-text:text-amber-600',
    red:     'border-red-100     bg-gradient-to-br from-white to-red-50/40     icon-bg:bg-red-50     icon-text:text-red-600',
    slate:   'border-slate-200   bg-white                                       icon-bg:bg-slate-100  icon-text:text-slate-500',
    violet:  'border-violet-100  bg-gradient-to-br from-white to-violet-50/40  icon-bg:bg-violet-50  icon-text:text-violet-600',
    sky:     'border-sky-100     bg-gradient-to-br from-white to-sky-50/40     icon-bg:bg-sky-50     icon-text:text-sky-600',
  };

  const iconBgs   = { brand:'bg-brand-50', emerald:'bg-emerald-50', amber:'bg-amber-50', red:'bg-red-50', slate:'bg-slate-100', violet:'bg-violet-50', sky:'bg-sky-50' };
  const iconTexts = { brand:'text-brand-600', emerald:'text-emerald-600', amber:'text-amber-600', red:'text-red-600', slate:'text-slate-500', violet:'text-violet-600', sky:'text-sky-600' };
  const borderCls = { brand:'border-brand-100', emerald:'border-emerald-100', amber:'border-amber-100', red:'border-red-200', slate:'border-slate-200', violet:'border-violet-100', sky:'border-sky-100' };
  const gradients = { brand:'from-white to-brand-50/30', emerald:'from-white to-emerald-50/30', amber:'from-white to-amber-50/30', red:'from-white to-red-50/30', slate:'from-white to-slate-50', violet:'from-white to-violet-50/30', sky:'from-white to-sky-50/30' };

  return (
    <div className={`rounded-2xl border shadow-sm p-5 flex flex-col gap-3 bg-gradient-to-br ${gradients[accent] ?? gradients.brand} ${borderCls[accent] ?? borderCls.brand}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${iconBgs[accent]}`}>
          <Icon className={`h-5 w-5 ${iconTexts[accent]}`} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {alert && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">{alert}</span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-tight break-all">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

/** Barre de progression colorée */
function ProgressBar({ label, value, max, format, color = 'bg-brand-500', badge }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {badge && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />}
          <span className="text-sm text-slate-600">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900">{format ? format(value) : value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-1.5 ${color} rounded-full transition-[width] duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Ligne de stat simple */
function StatRow({ label, value, dotColor = 'bg-slate-300', valueColor = 'text-slate-900', sub }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div className="text-right">
        <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
        {sub && <span className="text-xs text-slate-400 ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

/** Conteneur de section */
function Card({ title, icon: Icon, iconColor = 'text-brand-500', action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-50">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} /> {title}
        </h2>
        {action}
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
 │  PAGE PRINCIPALE
 ══════════════════════════════════════════════════════ */
export default function AdminReportsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [chartView, setChartView] = useState('monthly'); // 'monthly' | 'daily'

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

  /**
   * Rafraîchissement automatique en temps réel.
   * Tout événement affectant les métriques financières déclenche un rechargement
   * (debounce 1 200 ms pour regrouper les événements rapprochés).
   */
  useAutoRefresh(
    [
      'payment.confirmed',      // Nouveau paiement → revenus
      'checkout.done',          // Check-out → occupation + revenus finalisés
      'checkin.done',           // Check-in → occupation
      'reservation.cancelled',  // Annulation → stats réservations
      'refund.processed',       // Remboursement traité → stats remboursements
      'refund.requested',       // Nouvelle demande → soldes en attente
    ],
    load,
    { debounceMs: 1200 },
  );

  if (loading) return <LoadingSpinner label="Chargement des rapports…" />;
  if (error)   return <ErrorMessage message={error} onRetry={load} />;

  /* ── Calculs dérivés ── */
  const growth = data?.revenue?.last_month > 0
    ? parseFloat(((data.revenue.this_month - data.revenue.last_month) / data.revenue.last_month * 100).toFixed(1))
    : null;

  const totalPaymentVol = data?.payment_methods?.reduce((s, p) => s + p.total, 0) ?? 0;
  const totalRevByRoom  = data?.revenue_by_room?.reduce((s, r) => s + r.revenue, 0) ?? 0;
  const resTotal        = data?.reservations?.total ?? 1;
  const roomTotal       = data?.rooms?.total ?? 1;
  const hasOutstanding  = (data?.outstanding?.balance_amount ?? 0) > 0
                       || (data?.outstanding?.pending_payment_amount ?? 0) > 0;

  /* ── Données graphique mensuel ── */
  const monthlyChartData = (data?.revenue?.by_month ?? []).map((d) => ({
    ...d,
    label: monthLabel(d.month),
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-screen-xl mx-auto">

      {/* ══════════════════════════════════════════
       │  EN-TÊTE
      ══════════════════════════════════════════ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <BarChart2 className="h-6 w-6 text-brand-600" />
            Rapports financiers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Performances de l'hôtel · Période :{' '}
            <span className="font-semibold text-slate-700 capitalize">
              {data?.period?.label ?? '-'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-400">
            <p>Rapport généré le</p>
            <p className="font-semibold text-slate-600">
              {data?.period?.generated_at
                ? new Date(data.period.generated_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : '-'}
            </p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
       │  KPIs - 2 × 3
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ligne 1 : revenus */}
        <KpiCard
          label="Revenus bruts ce mois"
          value={formatXOF(data?.revenue?.this_month ?? 0)}
          sub={growth !== null
            ? `${formatXOF(data.revenue.last_month)} le mois précédent`
            : 'Premier mois enregistré'}
          icon={growth === null || growth >= 0 ? TrendingUp : TrendingDown}
          accent={growth === null || growth >= 0 ? 'emerald' : 'red'}
          trend={growth}
        />
        <KpiCard
          label="Revenus nets ce mois"
          value={formatXOF(data?.revenue?.net_this_month ?? 0)}
          sub={`Déduction : ${formatXOF(data?.refunds?.amount_this_month ?? 0)} remboursés`}
          icon={BadgeDollarSign}
          accent="brand"
        />
        <KpiCard
          label="Revenus de l'année en cours"
          value={formatXOF(data?.revenue?.ytd ?? 0)}
          sub={`Total historique : ${formatXOF(data?.revenue?.all_time ?? 0)}`}
          icon={TrendingUp}
          accent="sky"
        />
        {/* Ligne 2 : indicateurs hôteliers */}
        <KpiCard
          label="Tarif journalier moyen par chambre"
          value={formatXOF(data?.indicators?.adr ?? 0)}
          sub="Revenus bruts ÷ (chambres disponibles × jours du mois)"
          icon={Hotel}
          accent="violet"
        />
        <KpiCard
          label="Revenu par chambre disponible"
          value={formatXOF(data?.indicators?.revpar ?? 0)}
          sub={`Tarif moyen × taux d'occupation (${data?.indicators?.occupancy_rate ?? 0}%)`}
          icon={BedDouble}
          accent="amber"
        />
        <KpiCard
          label="Créances - Soldes en attente"
          value={formatXOF(data?.outstanding?.balance_amount ?? 0)}
          sub={`${data?.outstanding?.balance_count ?? 0} réservation${(data?.outstanding?.balance_count ?? 0) !== 1 ? 's' : ''} en acompte partiel`}
          icon={AlertTriangle}
          accent={(data?.outstanding?.balance_count ?? 0) > 0 ? 'red' : 'slate'}
          alert={(data?.outstanding?.balance_count ?? 0) > 0
            ? `${data.outstanding.balance_count} à solder`
            : null}
        />
      </div>

      {/* ══════════════════════════════════════════
       │  GRAPHIQUE REVENUS
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        {/* Header graphique */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Évolution des revenus</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total cumulé :{' '}
              <span className="font-semibold text-slate-700">{formatXOF(data?.revenue?.all_time ?? 0)}</span>
              {' · '}Ce mois :{' '}
              <span className="font-semibold text-brand-700">{formatXOF(data?.revenue?.this_month ?? 0)}</span>
            </p>
          </div>
          {/* Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { key: 'monthly', label: '12 derniers mois' },
              { key: 'daily',   label: 'Mois en cours (jour/jour)' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setChartView(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  chartView === t.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {/* Zone graphique */}
        <div className="p-6">
          {chartView === 'monthly' ? (
            <SvgBarChart
              data={monthlyChartData}
              valueKey="total"
              labelFn={(d) => d.label ?? monthLabel(d.month)}
              color="#3b82f6"
            />
          ) : (
            <SvgDailyChart data={data?.revenue?.daily ?? []} />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
       │  RÉSERVATIONS · CHAMBRES · REMBOURSEMENTS
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Réservations */}
        <Card title="Réservations" icon={CalendarCheck}>
          {/* Big number */}
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-4xl font-black text-slate-900">{data?.reservations?.total ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">
                au total · <span className="font-semibold text-brand-600">{data?.reservations?.this_month ?? 0} ce mois</span>
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'En attente de confirmation', key: 'pending',    color: 'bg-slate-400' },
              { label: 'Confirmées',                 key: 'confirmed',  color: 'bg-blue-400'   },
              { label: 'En séjour',                  key: 'checked_in', color: 'bg-brand-500'  },
              { label: 'Terminées',                  key: 'completed',  color: 'bg-emerald-500'},
              { label: 'Annulées',                   key: 'cancelled',  color: 'bg-red-400'    },
            ].map(({ label, key, color }) => (
              <ProgressBar
                key={key}
                label={label}
                value={data?.reservations?.[key] ?? 0}
                max={resTotal}
                color={color}
                badge
              />
            ))}
          </div>
        </Card>

        {/* Chambres */}
        <Card title="Chambres & Occupation" icon={BedDouble}>
          {/* Indicateur principal */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-4xl font-black text-slate-900">
                {data?.rooms?.occupancy_rate ?? 0}<span className="text-xl text-slate-400 font-semibold">%</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data?.rooms?.occupied ?? 0} / {data?.rooms?.total ?? 0} chambres occupées
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">RevPAR</p>
              <p className="text-base font-black text-violet-700">{formatXOF(data?.indicators?.revpar ?? 0)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">ADR</p>
              <p className="text-base font-black text-amber-700">{formatXOF(data?.indicators?.adr ?? 0)}</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Disponibles',  key: 'available',   color: 'bg-emerald-500' },
              { label: 'Occupées',     key: 'occupied',    color: 'bg-brand-500'   },
              { label: 'Maintenance',  key: 'maintenance', color: 'bg-amber-400'   },
            ].map(({ label, key, color }) => (
              <ProgressBar
                key={key}
                label={label}
                value={data?.rooms?.[key] ?? 0}
                max={roomTotal}
                color={color}
                badge
              />
            ))}
          </div>
        </Card>

        {/* Remboursements */}
        <Card title="Remboursements" icon={RotateCcw}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-4xl font-black text-slate-900">
                {(data?.refunds?.pending ?? 0) + (data?.refunds?.approved ?? 0) + (data?.refunds?.rejected ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">demandes au total</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Taux ce mois</p>
              <p className={`text-base font-black ${(data?.indicators?.refund_rate ?? 0) > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                {data?.indicators?.refund_rate ?? 0}%
              </p>
            </div>
          </div>
          <div className="space-y-1 mb-4">
            <StatRow
              label="En attente"
              value={data?.refunds?.pending ?? 0}
              dotColor="bg-amber-400"
              valueColor={(data?.refunds?.pending ?? 0) > 0 ? 'text-amber-700' : 'text-slate-500'}
            />
            <StatRow
              label="Approuvés"
              value={data?.refunds?.approved ?? 0}
              dotColor="bg-emerald-500"
              valueColor="text-emerald-700"
            />
            <StatRow
              label="Refusés"
              value={data?.refunds?.rejected ?? 0}
              dotColor="bg-red-400"
              valueColor="text-red-700"
            />
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Remboursé ce mois</span>
              <span className="font-bold text-slate-700">{formatXOF(data?.refunds?.amount_this_month ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total remboursé (tous temps)</span>
              <span className="font-bold text-slate-700">{formatXOF(data?.refunds?.total_amount_refunded ?? 0)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════
       │  MÉTHODES DE PAIEMENT + TOP CHAMBRES
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Méthodes de paiement */}
        <Card title="Répartition des paiements" icon={CreditCard}>
          {data?.payment_methods?.length ? (
            <div className="space-y-5">
              {data.payment_methods
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((pm) => {
                  const pct = totalPaymentVol > 0 ? Math.round((pm.total / totalPaymentVol) * 100) : 0;
                  const cfg = PROVIDERS[pm.method] ?? { label: pm.method, color: '#94a3b8' };
                  return (
                    <div key={pm.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="font-medium text-slate-700">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{pm.count} paiement{pm.count !== 1 ? 's' : ''}</span>
                          <span className="font-bold text-slate-900">{formatXOF(pm.total)}</span>
                          <span className="w-9 text-right font-semibold" style={{ color: cfg.color }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-[width] duration-700"
                          style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="font-medium text-slate-500">Volume total encaissé</span>
                <span className="font-black text-slate-900 text-sm">{formatXOF(totalPaymentVol)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic py-4 text-center">Aucune transaction enregistrée.</p>
          )}
        </Card>

        {/* Top chambres par revenu */}
        <Card title="Top 5 chambres - revenu généré" icon={BedDouble} iconColor="text-amber-500">
          {data?.revenue_by_room?.length ? (
            <div className="space-y-4">
              {data.revenue_by_room.map((r, i) => {
                const pct = totalRevByRoom > 0 ? Math.round((r.revenue / totalRevByRoom) * 100) : 0;
                const medals = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-500', 'bg-orange-100 text-orange-700'];
                return (
                  <div key={r.room_id} className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black flex-shrink-0 ${medals[i] ?? 'bg-slate-50 text-slate-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900">Chambre {r.room_number}</span>
                            <span className="text-xs text-slate-400 capitalize ml-1.5">{r.room_type}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-bold text-slate-900">{formatXOF(r.revenue)}</span>
                            <span className="text-xs text-slate-400 ml-2">{r.bookings} rés.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-9">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-[width] duration-700 bg-brand-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 text-right">{pct}% du revenu total chambres</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic py-4 text-center">Aucune donnée disponible.</p>
          )}
        </Card>
      </div>

      {/* ══════════════════════════════════════════
       │  ALERTES FINANCIÈRES (conditionnelles)
      ══════════════════════════════════════════ */}
      {hasOutstanding && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4" /> Alertes financières - action requise
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.outstanding?.balance_amount ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100 flex-shrink-0">
                  <Wallet className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Soldes partiels à encaisser</p>
                  <p className="text-xl font-black text-amber-900">{formatXOF(data.outstanding.balance_amount)}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {data.outstanding.balance_count} réservation{data.outstanding.balance_count !== 1 ? 's' : ''} en attente de solde
                  </p>
                </div>
              </div>
            )}
            {(data?.outstanding?.pending_payment_amount ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-sky-200 p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-sky-100 flex-shrink-0">
                  <Clock className="h-5 w-5 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-sky-600 uppercase tracking-wide mb-1">Paiements en attente opérateur</p>
                  <p className="text-xl font-black text-sky-900">{formatXOF(data.outstanding.pending_payment_amount)}</p>
                  <p className="text-xs text-sky-600 mt-0.5">
                    {data.outstanding.pending_payment_count} transaction{data.outstanding.pending_payment_count !== 1 ? 's' : ''} initiée{data.outstanding.pending_payment_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
