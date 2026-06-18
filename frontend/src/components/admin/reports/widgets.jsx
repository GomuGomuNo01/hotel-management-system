import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Widgets présentationnels du rapport financier (KPI, barre de progression,
 * ligne de stat, carte de section), extraits de AdminReportsPage.
 */

/** Carte KPI */
export function KpiCard({ label, value, sub, icon: Icon, accent = 'brand', trend, alert }) {
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
export function ProgressBar({ label, value, max, format, color = 'bg-brand-500', badge }) {
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
export function StatRow({ label, value, dotColor = 'bg-slate-300', valueColor = 'text-slate-900', sub }) {
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
export function Card({ title, icon: Icon, iconColor = 'text-brand-500', action, children, className = '' }) {
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
