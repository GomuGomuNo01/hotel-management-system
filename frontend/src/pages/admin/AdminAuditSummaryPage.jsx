import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Filter, ChevronLeft, ChevronRight, X, Clock,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

/* ── Libellés lisibles des types d'action ────────────────────── */
const ACTION_LABELS = {
  // Check-in / Check-out
  CHECKIN_DONE:               'Check-in effectué',
  CHECKOUT_DONE:              'Check-out validé',
  CHECKIN_WITH_DEPOSIT:       'Check-in (acompte soldé)',
  CHECKOUT_WITH_DEPOSIT:      'Check-out (acompte soldé)',
  // Réservations
  RESERVATION_CREATED:        'Réservation créée',
  RESERVATION_MODIFIED:       'Réservation modifiée',
  RESERVATION_CANCELLED:      'Réservation annulée',
  RESERVATION_AUTO_CANCELLED: 'Annulée automatiquement',
  // Paiements
  PAYMENT_RECORDED:           'Paiement espèces enregistré',
  PAYMENT_CONFIRMED:          'Paiement confirmé',
  PAYMENT_FAILED:             'Paiement échoué',
  // Remboursements
  REFUND_APPROVED:            'Remboursement approuvé',
  REFUND_REJECTED:            'Remboursement refusé',
  // Chambres
  ROOM_CREATED:               'Chambre créée',
  ROOM_UPDATED:               'Chambre modifiée',
  ROOM_DELETED:               'Chambre supprimée',
  // Clients & profils
  CLIENT_UPDATED:             'Profil client modifié',
  PROFILE_UPDATED:            'Profil admin modifié',
  PASSWORD_CHANGED:           'Mot de passe changé',
  // Admins (par le patron — apparaissent dans les résumés visibles par les admins autorisés)
  ADMIN_CREATED:              'Administrateur créé',
  ADMIN_UPDATED:              'Administrateur modifié',
  ADMIN_STATUS_CHANGED:       'Statut admin modifié',
  ADMIN_DELETED:              'Administrateur supprimé',
};

const ACTION_COLORS = {
  CHECKIN_DONE:               'bg-teal-100 text-teal-700',
  CHECKOUT_DONE:              'bg-slate-100 text-slate-600',
  CHECKIN_WITH_DEPOSIT:       'bg-amber-100 text-amber-700',
  CHECKOUT_WITH_DEPOSIT:      'bg-orange-100 text-orange-700',
  RESERVATION_CANCELLED:      'bg-red-100 text-red-700',
  RESERVATION_AUTO_CANCELLED: 'bg-orange-100 text-orange-700',
  PAYMENT_CONFIRMED:          'bg-emerald-100 text-emerald-700',
  PAYMENT_FAILED:             'bg-red-100 text-red-700',
  ADMIN_CREATED:              'bg-violet-100 text-violet-700',
  ADMIN_UPDATED:              'bg-blue-100 text-blue-700',
  ADMIN_STATUS_CHANGED:       'bg-amber-100 text-amber-700',
  ADMIN_DELETED:              'bg-red-100 text-red-700',
  PASSWORD_CHANGED:           'bg-amber-100 text-amber-700',
  REFUND_APPROVED:            'bg-emerald-100 text-emerald-700',
  REFUND_REJECTED:            'bg-red-100 text-red-700',
  ROOM_DELETED:               'bg-red-100 text-red-700',
};

function ActionBadge({ action }) {
  const label = ACTION_LABELS[action] ?? action;
  const cls   = ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

/* ── Carte log ───────────────────────────────────────────────── */
function LogCard({ log }) {
  const date = new Date(log.created_at);

  const roleLabels = { manager: 'Manager', receptionist: 'Réceptionniste', accountant: 'Comptable' };
  const systemActions = ['PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'RESERVATION_AUTO_CANCELLED', 'RESERVATION_CREATED'];

  let actorLabel = 'Système';
  let actorSub   = 'Action automatique';

  if (log.admin) {
    actorLabel = `${log.admin.first_name} ${log.admin.last_name}`;
    actorSub   = roleLabels[log.admin.role] || log.admin.role || 'Admin';
  } else if (log.new_values?._performed_by_owner) {
    actorLabel = log.new_values._performed_by_owner;
    actorSub   = '👑 Propriétaire';
  } else if (!systemActions.includes(log.action_type)) {
    actorLabel = 'Client';
    actorSub   = 'Action client';
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <ActionBadge action={log.action_type} />
          <span className="text-xs text-slate-400">
            {log.entity_type} #{log.entity_id}
          </span>
        </div>
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{actorLabel}</span>
          {actorSub && <span className="text-xs text-slate-400 ml-1.5">— {actorSub}</span>}
        </p>
        {log.ip_address && (
          <p className="text-xs text-slate-400">IP : {log.ip_address}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
          <Clock className="h-3 w-3" />
          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <p className="text-xs text-slate-400">
          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────── */
export default function AdminAuditSummaryPage() {
  const [logs, setLogs]         = useState([]);
  const [summary, setSummary]   = useState([]);
  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [page, setPage]         = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.auditSummary.list({
        action_type: actionFilter || undefined,
        date_from:   dateFrom     || undefined,
        date_to:     dateTo       || undefined,
        page,
        per_page: 20,
      });
      const data = res?.data ?? res;
      setLogs(data?.logs?.data ?? []);
      setMeta(data?.logs?.meta ?? null);
      setSummary(data?.summary ?? []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger le journal d\'audit.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setActionFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = actionFilter || dateFrom || dateTo;

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <ShieldCheck className="h-7 w-7 text-brand-600" />
          Journal d'audit
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Historique des actions effectuées dans le système.
        </p>
      </div>

      {/* Résumé des 30 derniers jours */}
      {summary.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Activité des 30 derniers jours
          </h2>
          <div className="flex flex-wrap gap-2">
            {summary.map((s) => (
              <button
                key={s.action_type}
                onClick={() => { setActionFilter(s.action_type); setPage(1); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  actionFilter === s.action_type
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ACTION_LABELS[s.action_type] ?? s.action_type}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  actionFilter === s.action_type ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <Filter className="h-4 w-4 text-slate-400 mt-1 flex-shrink-0" />

        <div>
          <label className="block text-xs text-slate-500 mb-1">Type d'action</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <LoadingSpinner label="Chargement du journal…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : logs.length === 0 ? (
        <EmptyState message="Aucune entrée trouvée dans le journal d'audit." />
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => <LogCard key={log.id} log={log} />)}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-600">
                Page {meta.current_page} / {meta.last_page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
