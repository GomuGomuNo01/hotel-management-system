/**
 * AdminAuditSummaryPage - Journal d'audit
 *
 * Conçu pour des admins non-développeurs :
 * – Langage simple, zéro terme technique
 * – Résumé contextuel extrait des valeurs (montant, dates, chambre…)
 * – Acteur clairement identifié (nom + rôle ou "Système")
 * – Entité en référence lisible (RES-000056, N° 101…)
 * – Catégories groupées sur 30 jours
 * – Filtre date + filtre action via chips
 * – Pagination DataTable
 * – Auto-refresh WebSocket
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, X, ChevronDown, ChevronsLeft, ChevronsRight,
  ChevronLeft, ChevronRight,
  LogIn, LogOut, CalendarPlus, CalendarDays, CalendarMinus,
  Banknote, CheckCircle2, XCircle, RotateCcw,
  MessageCircle, Bed, User, UserCog, UserPlus, UserMinus,
  UserCheck, Lock, AlertCircle, Crown, Clock, RefreshCw,
  ScanEye, Wifi,
} from 'lucide-react';
import { adminApi }       from '../../api/admin.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import LoadingSpinner     from '../../components/common/LoadingSpinner';
import ErrorMessage       from '../../components/common/ErrorMessage';
import EmptyState         from '../../components/common/EmptyState';
import AuditDiffPanel     from '../../components/common/AuditDiffPanel';
import { formatXOF }      from '../../utils/formatCurrency';

/* ═══════════════════════════════════════════════════════════
   DONNÉES STATIQUES - tout en français simple
══════════════════════════════════════════════════════════ */

const ACTION_LABELS = {
  CHECKIN_DONE:               'Arrivée enregistrée',
  CHECKOUT_DONE:              'Départ validé',
  CHECKIN_WITH_DEPOSIT:       'Arrivée avec solde d\'acompte',
  CHECKOUT_WITH_DEPOSIT:      'Départ avec solde d\'acompte',
  RESERVATION_CREATED:        'Nouvelle réservation',
  RESERVATION_MODIFIED:       'Réservation modifiée',
  RESERVATION_CANCELLED:      'Réservation annulée',
  RESERVATION_AUTO_CANCELLED: 'Réservation annulée automatiquement',
  PAYMENT_RECORDED:           'Paiement espèces enregistré',
  DEPOSIT_SETTLED:            'Acompte soldé',
  PAYMENT_CONFIRMED:          'Paiement confirmé',
  PAYMENT_FAILED:             'Paiement échoué',
  REFUND_APPROVED:            'Remboursement accordé',
  REFUND_REJECTED:            'Remboursement refusé',
  COMPLAINT_CREATED:          'Réclamation soumise',
  COMPLAINT_HANDLED:          'Réclamation traitée',
  COMPLAINT_CANCELLED:        'Réclamation annulée',
  ROOM_CREATED:               'Nouvelle chambre ajoutée',
  ROOM_UPDATED:               'Chambre modifiée',
  ROOM_DELETED:               'Chambre supprimée',
  CLIENT_UPDATED:             'Fiche client modifiée',
  PROFILE_UPDATED:            'Profil administrateur modifié',
  PASSWORD_CHANGED:           'Mot de passe changé',
  ADMIN_CREATED:              'Nouvel administrateur créé',
  ADMIN_UPDATED:              'Administrateur modifié',
  ADMIN_STATUS_CHANGED:       'Accès administrateur modifié',
  ADMIN_DELETED:              'Administrateur supprimé',
};

const PROVIDER_LABELS = {
  orange_ci: 'Orange Money',
  wave_ci:   'Wave',
  cash:      'Espèces',
};

/* Icône dans le rond de la timeline */
const ACTION_ICONS = {
  CHECKIN_DONE:               LogIn,
  CHECKOUT_DONE:              LogOut,
  CHECKIN_WITH_DEPOSIT:       LogIn,
  CHECKOUT_WITH_DEPOSIT:      LogOut,
  RESERVATION_CREATED:        CalendarPlus,
  RESERVATION_MODIFIED:       CalendarDays,
  RESERVATION_CANCELLED:      CalendarMinus,
  RESERVATION_AUTO_CANCELLED: CalendarMinus,
  PAYMENT_RECORDED:           Banknote,
  DEPOSIT_SETTLED:            Banknote,
  PAYMENT_CONFIRMED:          CheckCircle2,
  PAYMENT_FAILED:             XCircle,
  REFUND_APPROVED:            RotateCcw,
  REFUND_REJECTED:            RotateCcw,
  COMPLAINT_CREATED:          MessageCircle,
  COMPLAINT_HANDLED:          MessageCircle,
  COMPLAINT_CANCELLED:        MessageCircle,
  ROOM_CREATED:               Bed,
  ROOM_UPDATED:               Bed,
  ROOM_DELETED:               Bed,
  CLIENT_UPDATED:             User,
  PROFILE_UPDATED:            UserCog,
  PASSWORD_CHANGED:           Lock,
  ADMIN_CREATED:              UserPlus,
  ADMIN_UPDATED:              UserCog,
  ADMIN_STATUS_CHANGED:       UserCheck,
  ADMIN_DELETED:              UserMinus,
};

/* Couleur du rond timeline */
const DOT_COLORS = {
  CHECKIN_DONE:               'bg-teal-100    text-teal-600',
  CHECKOUT_DONE:              'bg-slate-100   text-slate-500',
  CHECKIN_WITH_DEPOSIT:       'bg-amber-100   text-amber-600',
  CHECKOUT_WITH_DEPOSIT:      'bg-amber-100   text-amber-600',
  RESERVATION_CREATED:        'bg-blue-100    text-blue-600',
  RESERVATION_MODIFIED:       'bg-blue-100    text-blue-600',
  RESERVATION_CANCELLED:      'bg-red-100     text-red-600',
  RESERVATION_AUTO_CANCELLED: 'bg-orange-100  text-orange-600',
  PAYMENT_RECORDED:           'bg-emerald-100 text-emerald-600',
  DEPOSIT_SETTLED:            'bg-amber-100   text-amber-600',
  PAYMENT_CONFIRMED:          'bg-emerald-100 text-emerald-600',
  PAYMENT_FAILED:             'bg-red-100     text-red-600',
  REFUND_APPROVED:            'bg-emerald-100 text-emerald-600',
  REFUND_REJECTED:            'bg-red-100     text-red-600',
  COMPLAINT_CREATED:          'bg-orange-100  text-orange-600',
  COMPLAINT_HANDLED:          'bg-emerald-100 text-emerald-600',
  COMPLAINT_CANCELLED:        'bg-slate-100   text-slate-500',
  ROOM_CREATED:               'bg-violet-100  text-violet-600',
  ROOM_UPDATED:               'bg-violet-100  text-violet-600',
  ROOM_DELETED:               'bg-red-100     text-red-600',
  CLIENT_UPDATED:             'bg-slate-100   text-slate-600',
  PROFILE_UPDATED:            'bg-slate-100   text-slate-600',
  PASSWORD_CHANGED:           'bg-amber-100   text-amber-600',
  ADMIN_CREATED:              'bg-violet-100  text-violet-600',
  ADMIN_UPDATED:              'bg-blue-100    text-blue-600',
  ADMIN_STATUS_CHANGED:       'bg-amber-100   text-amber-600',
  ADMIN_DELETED:              'bg-red-100     text-red-600',
};

/* Catégories pour le résumé 30 jours */
const CATEGORIES = [
  { key: 'stays',        label: 'Séjours',        Icon: LogIn,        color: 'teal',    actions: ['CHECKIN_DONE','CHECKOUT_DONE','CHECKIN_WITH_DEPOSIT','CHECKOUT_WITH_DEPOSIT'] },
  { key: 'reservations', label: 'Réservations',   Icon: CalendarDays, color: 'blue',    actions: ['RESERVATION_CREATED','RESERVATION_MODIFIED','RESERVATION_CANCELLED','RESERVATION_AUTO_CANCELLED'] },
  { key: 'payments',     label: 'Paiements',      Icon: Banknote,     color: 'emerald', actions: ['PAYMENT_RECORDED','DEPOSIT_SETTLED','PAYMENT_CONFIRMED','PAYMENT_FAILED'] },
  { key: 'refunds',      label: 'Remboursements', Icon: RotateCcw,    color: 'amber',   actions: ['REFUND_APPROVED','REFUND_REJECTED'] },
  { key: 'complaints',   label: 'Réclamations',   Icon: MessageCircle, color: 'orange', actions: ['COMPLAINT_CREATED','COMPLAINT_HANDLED','COMPLAINT_CANCELLED'] },
  { key: 'rooms',        label: 'Chambres',       Icon: Bed,          color: 'violet',  actions: ['ROOM_CREATED','ROOM_UPDATED','ROOM_DELETED'] },
  { key: 'accounts',     label: 'Comptes',        Icon: UserCog,      color: 'slate',   actions: ['CLIENT_UPDATED','PROFILE_UPDATED','PASSWORD_CHANGED','ADMIN_CREATED','ADMIN_UPDATED','ADMIN_STATUS_CHANGED','ADMIN_DELETED'] },
];

const CAT_COLORS = {
  teal:    { tile: 'border-teal-200',    dot: 'bg-teal-100    text-teal-600',    count: 'text-teal-700'    },
  blue:    { tile: 'border-blue-200',    dot: 'bg-blue-100    text-blue-600',    count: 'text-blue-700'    },
  emerald: { tile: 'border-emerald-200', dot: 'bg-emerald-100 text-emerald-600', count: 'text-emerald-700' },
  amber:   { tile: 'border-amber-200',   dot: 'bg-amber-100   text-amber-600',   count: 'text-amber-700'   },
  orange:  { tile: 'border-orange-200',  dot: 'bg-orange-100  text-orange-600',  count: 'text-orange-700'  },
  violet:  { tile: 'border-violet-200',  dot: 'bg-violet-100  text-violet-600',  count: 'text-violet-700'  },
  slate:   { tile: 'border-slate-200',   dot: 'bg-slate-100   text-slate-600',   count: 'text-slate-700'   },
};

const ROLE_LABELS = {
  manager:      'Manager',
  receptionist: 'Réceptionniste',
  accountant:   'Comptable',
  owner:        'Propriétaire',
};

const SYSTEM_ACTIONS = new Set([
  'PAYMENT_CONFIRMED', 'PAYMENT_FAILED',
  'RESERVATION_AUTO_CANCELLED', 'RESERVATION_CREATED',
]);

/* Libellés entités */
const ENTITY_LABELS = {
  Reservation: 'Réservation',
  Payment:     'Paiement',
  Room:        'Chambre',
  Refund:      'Demande de remboursement',
  Complaint:   'Réclamation',
  Admin:       'Administrateur',
  Client:      'Client',
};
const ENTITY_REFS = { Reservation: 'RES', Payment: 'PAY', Refund: 'RMB', Complaint: 'REC' };

/* ═══════════════════════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════════════════════ */

/** Libellé lisible de l'entité concernée */
function entityLabel(type, id) {
  if (!type) return null;
  const label = ENTITY_LABELS[type] ?? type;
  if (!id) return label;
  if (type === 'Room') return `Chambre N° ${id}`;
  const pfx = ENTITY_REFS[type];
  return pfx ? `${label} ${pfx}-${String(id).padStart(6, '0')}` : `${label} #${id}`;
}

/**
 * Extrait une ligne de contexte humaine depuis les valeurs du log :
 * montant, dates de séjour, numéro de chambre, etc.
 * Affiché directement sur la carte, sans avoir à ouvrir les détails.
 */
function getContextSummary(log) {
  const nv   = log.new_values ?? {};
  const ov   = log.old_values ?? {};
  const vals = { ...ov, ...nv };            // new_values prioritaire
  const fmtD = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '?';

  switch (log.action_type) {

    /* ── Séjours ── */
    case 'CHECKIN_DONE':
    case 'CHECKOUT_DONE':
    case 'CHECKIN_WITH_DEPOSIT':
    case 'CHECKOUT_WITH_DEPOSIT': {
      const cin  = nv.check_in_date  ?? ov.check_in_date;
      const cout = nv.check_out_date ?? ov.check_out_date;
      const room = nv.room_number    ?? ov.room_number;
      const parts = [];
      if (room) parts.push(`Chambre N° ${room}`);
      if (cin && cout) parts.push(`${fmtD(cin)} → ${fmtD(cout)}`);
      else if (cin)    parts.push(`Arrivée le ${fmtD(cin)}`);
      return parts.join(' · ') || null;
    }

    /* ── Réservations ── */
    case 'RESERVATION_CREATED':
    case 'RESERVATION_MODIFIED':
    case 'RESERVATION_CANCELLED':
    case 'RESERVATION_AUTO_CANCELLED': {
      const cin    = nv.check_in_date  ?? ov.check_in_date;
      const cout   = nv.check_out_date ?? ov.check_out_date;
      const amount = nv.total_amount   ?? ov.total_amount;
      const parts  = [];
      if (cin && cout) parts.push(`${fmtD(cin)} → ${fmtD(cout)}`);
      if (amount)      parts.push(formatXOF(amount));
      return parts.join(' · ') || null;
    }

    /* ── Paiements ── */
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECORDED':
    case 'DEPOSIT_SETTLED': {
      const amount   = vals.amount;
      const provider = vals.provider ? (PROVIDER_LABELS[vals.provider] ?? vals.provider) : null;
      if (!amount && !provider) return null;
      return [amount ? formatXOF(amount) : null, provider].filter(Boolean).join(' · ');
    }

    case 'PAYMENT_FAILED': {
      const amount   = vals.amount;
      const provider = vals.provider ? (PROVIDER_LABELS[vals.provider] ?? vals.provider) : null;
      return [amount ? `Tentative de ${formatXOF(amount)}` : null, provider].filter(Boolean).join(' · ') || null;
    }

    /* ── Remboursements ── */
    case 'REFUND_APPROVED':
    case 'REFUND_REJECTED': {
      const amount = vals.amount ?? vals.refund_amount;
      const note   = nv.admin_notes;
      const parts  = [];
      if (amount) parts.push(formatXOF(amount));
      if (note)   parts.push(`"${note}"`);
      return parts.join(' · ') || null;
    }

    /* ── Chambres ── */
    case 'ROOM_CREATED':
    case 'ROOM_UPDATED': {
      const num   = vals.room_number;
      const type  = vals.room_type;
      const price = vals.price_per_night;
      const parts = [];
      if (num)   parts.push(`N° ${num}`);
      if (type)  parts.push(type.charAt(0).toUpperCase() + type.slice(1));
      if (price) parts.push(`${formatXOF(price)} / nuit`);
      return parts.join(' · ') || null;
    }
    case 'ROOM_DELETED':
      return vals.room_number ? `Chambre N° ${vals.room_number} retirée` : null;

    /* ── Comptes ── */
    case 'PASSWORD_CHANGED':
      return 'Mot de passe mis à jour avec succès';

    case 'ADMIN_STATUS_CHANGED':
      if (nv.is_active !== undefined)
        return nv.is_active ? '✓ Compte réactivé' : '⊘ Compte désactivé';
      return null;

    case 'ADMIN_CREATED':
    case 'ADMIN_UPDATED': {
      const name = [nv.last_name ?? ov.last_name, nv.first_name ?? ov.first_name].filter(Boolean).join(' ');
      const role = ROLE_LABELS[nv.role ?? ov.role];
      return [name, role].filter(Boolean).join(' · ') || null;
    }

    case 'CLIENT_UPDATED': {
      const name = [nv.last_name ?? ov.last_name, nv.first_name ?? ov.first_name].filter(Boolean).join(' ');
      return name || null;
    }

    default:
      return null;
  }
}

/** Date et heure en langage courant */
function formatAuditDate(dateStr) {
  const date    = new Date(dateStr);
  const now     = new Date();
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs  = today.getTime() - dayOnly.getTime();
  const time    = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (diffMs === 0)           return { day: "Aujourd'hui", time };
  if (diffMs === 86_400_000)  return { day: 'Hier', time };
  if (diffMs < 7 * 86_400_000) {
    const wd = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return { day: wd.charAt(0).toUpperCase() + wd.slice(1), time };
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return {
    day: date.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long',
      ...(sameYear ? {} : { year: 'numeric' }),
    }),
    time,
  };
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANTS
══════════════════════════════════════════════════════════ */

/** Avatar de l'acteur */
function ActorAvatar({ isSystem, isOwner, name }) {
  if (isSystem) {
    return (
      <span className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0" title="Action automatique du système">
        <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
      </span>
    );
  }
  if (isOwner) {
    return (
      <span className="h-8 w-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0" title="Propriétaire">
        <Crown className="h-3.5 w-3.5 text-amber-500" />
      </span>
    );
  }
  return (
    <span className="h-8 w-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-brand-700">
      {getInitials(name)}
    </span>
  );
}

/** Carte log dans la timeline */
function LogCard({ log, isLast }) {
  const [open, setOpen] = useState(false);

  const ActionIcon  = ACTION_ICONS[log.action_type] ?? AlertCircle;
  const dotColor    = DOT_COLORS[log.action_type]   ?? 'bg-slate-100 text-slate-500';
  const actionLabel = ACTION_LABELS[log.action_type] ?? log.action_type;
  const hasDetails  = !!(log.old_values || log.new_values);
  const entity      = entityLabel(log.entity_type, log.entity_id);
  const context     = getContextSummary(log);
  const { day, time } = formatAuditDate(log.created_at);

  /* Identification de l'acteur */
  let actorName = 'Système';
  let actorRole = 'Action automatique';
  let isSystem  = true;
  let isOwner   = false;

  if (log.admin) {
    isSystem  = false;
    actorName = `${log.admin.last_name} ${log.admin.first_name}`;
    actorRole = ROLE_LABELS[log.admin.role] ?? log.admin.role ?? 'Administrateur';
  } else if (log.new_values?._performed_by_owner) {
    isSystem  = false;
    isOwner   = true;
    actorName = log.new_values._performed_by_owner;
    actorRole = 'Propriétaire';
  } else if (!SYSTEM_ACTIONS.has(log.action_type)) {
    isSystem  = false;
    actorName = 'Client';
    actorRole = 'Action effectuée par le client';
  }

  return (
    <div className="flex gap-3 sm:gap-4">

      {/* Colonne timeline */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm ${dotColor}`}>
          <ActionIcon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 mt-1 bg-slate-200 min-h-[24px]" />}
      </div>

      {/* Carte */}
      <div className="flex-1 mb-3 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Corps principal */}
          <div className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">

              {/* ── Gauche : action + acteur + entité + contexte ── */}
              <div className="flex-1 min-w-0 space-y-2">

                {/* Action (titre) */}
                <p className="font-bold text-slate-900 text-sm leading-tight">{actionLabel}</p>

                {/* Acteur */}
                <div className="flex items-center gap-2">
                  <ActorAvatar isSystem={isSystem} isOwner={isOwner} name={actorName} />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-800">{actorName}</span>
                    <span className="text-xs text-slate-400 ml-1.5">- {actorRole}</span>
                  </div>
                </div>

                {/* Entité concernée */}
                {entity && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    {entity}
                  </p>
                )}

                {/* Résumé contextuel - la ligne la plus utile */}
                {context && (
                  <p className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 inline-block">
                    {context}
                  </p>
                )}
              </div>

              {/* ── Droite : date + heure ── */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-slate-700">{day}</p>
                <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> {time}
                </p>
                {log.ip_address && (
                  <p className="text-[10px] text-slate-300 mt-1 flex items-center justify-end gap-1">
                    <Wifi className="h-2.5 w-2.5" />{log.ip_address}
                  </p>
                )}
              </div>
            </div>

            {/* Bouton "Voir les modifications" (uniquement si diff dispo) */}
            {hasDetails && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  <ScanEye className="h-3.5 w-3.5" />
                  {open ? 'Masquer les modifications' : 'Voir ce qui a changé'}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* Panneau diff (dépliable) */}
          {open && hasDetails && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50/60">
              <AuditDiffPanel oldValues={log.old_values} newValues={log.new_values} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pagination DataTable */
function AuditPaginator({ meta, page, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <span className="text-xs text-slate-500">
        Page <span className="font-semibold">{meta.current_page}</span> sur{' '}
        <span className="font-semibold">{meta.last_page}</span>
        {meta.total != null && (
          <span className="ml-2 text-slate-400">
            · {meta.total} action{meta.total > 1 ? 's' : ''}
          </span>
        )}
      </span>
      <div className="flex items-center gap-0.5">
        <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => onPage(1)} title="Première page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => onPage(page - 1)} title="Précédent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page >= meta.last_page} onClick={() => onPage(page + 1)} title="Suivant">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page >= meta.last_page} onClick={() => onPage(meta.last_page)} title="Dernière page">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════════ */

export default function AdminAuditSummaryPage() {
  const [logs, setLogs]       = useState([]);
  const [summary, setSummary] = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [page, setPage]                 = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [expandedCat, setExpandedCat]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await adminApi.auditSummary.list({
        action_type: actionFilter || undefined,
        date_from:   dateFrom     || undefined,
        date_to:     dateTo       || undefined,
        page,
        per_page: 20,
      });
      const data = res?.data ?? res;
      setLogs(data?.logs?.data ?? []);
      setMeta(data?.logs?.meta ?? null);
      setSummary(data?.summary  ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? "Impossible de charger le journal d'audit.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  /* Auto-refresh sur événements WebSocket */
  useAutoRefresh(
    ['payment.confirmed', 'checkout.done', 'checkin.done', 'reservation.cancelled', 'refund.processed', 'refund.requested'],
    () => load(),
    { debounceMs: 1500 },
  );

  const resetFilters = () => { setActionFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };
  const hasFilters   = actionFilter || dateFrom || dateTo;

  /* Calcul des totaux par catégorie sur 30 jours */
  const categorySummary = CATEGORIES.map((cat) => {
    const items = summary.filter((s) => cat.actions.includes(s.action_type));
    const total = items.reduce((acc, s) => acc + Number(s.count), 0);
    return { ...cat, total, items };
  }).filter((c) => c.total > 0);

  const activeCatKey = actionFilter
    ? (CATEGORIES.find((c) => c.actions.includes(actionFilter))?.key ?? null)
    : null;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-screen-xl mx-auto">

      {/* ── En-tête ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-brand-600 flex-shrink-0" />
            Journal d'audit
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Historique de toutes les actions effectuées dans le système.
          </p>
        </div>
        {meta?.total != null && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            {meta.total} action{meta.total > 1 ? 's' : ''} enregistrée{meta.total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Résumé 30 jours par catégorie ───────────────── */}
      {categorySummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Ce qui s'est passé ces 30 derniers jours</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cliquez sur une catégorie pour voir le détail et filtrer</p>
            </div>
            {actionFilter && (
              <button
                type="button"
                onClick={() => { setActionFilter(''); setPage(1); }}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Tout afficher
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categorySummary.map((cat) => {
              const cls        = CAT_COLORS[cat.color] ?? CAT_COLORS.slate;
              const isActive   = activeCatKey === cat.key;
              const isExpanded = expandedCat === cat.key;

              return (
                <div
                  key={cat.key}
                  className={`rounded-xl border p-3 transition-all ${
                    isActive
                      ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                      : `${cls.tile} bg-white hover:bg-slate-50`
                  }`}
                >
                  {/* Tuile catégorie */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 text-left"
                    onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cls.dot}`}>
                        <cat.Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-semibold text-slate-700 leading-tight">
                        {cat.label}
                      </span>
                    </span>
                    <span className={`text-lg font-black tabular-nums ${isActive ? 'text-brand-700' : cls.count}`}>
                      {cat.total}
                    </span>
                  </button>

                  {/* Sous-actions dépliables */}
                  {isExpanded && cat.items.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex flex-col gap-1">
                      {cat.items.map((s) => {
                        const isSelected = actionFilter === s.action_type;
                        return (
                          <button
                            key={s.action_type}
                            type="button"
                            onClick={() => {
                              setActionFilter(isSelected ? '' : s.action_type);
                              setPage(1);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                              isSelected
                                ? 'bg-brand-600 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <span>{ACTION_LABELS[s.action_type] ?? s.action_type}</span>
                            <span className={`ml-2 font-black tabular-nums text-[11px] flex-shrink-0 ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                              {s.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filtres ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">

          {/* Filtre par période */}
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                À partir du
              </label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
            <span className="text-slate-300 mt-5">→</span>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Jusqu'au
              </label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Chip du filtre d'action actif */}
          {actionFilter && (
            <div className="mt-auto flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Filtre :</span>
              <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-brand-600 text-white rounded-full text-xs font-semibold shadow-sm">
                {ACTION_LABELS[actionFilter] ?? actionFilter}
                <button
                  type="button"
                  onClick={() => { setActionFilter(''); setPage(1); }}
                  className="h-4 w-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title="Retirer le filtre"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            </div>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors ml-auto"
          >
            <X className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Timeline ────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner label="Chargement du journal…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : logs.length === 0 ? (
        <EmptyState message="Aucune action trouvée pour les critères sélectionnés." />
      ) : (
        <>
          <div className="pt-1">
            {logs.map((log, idx) => (
              <LogCard key={log.id} log={log} isLast={idx === logs.length - 1} />
            ))}
          </div>
          <AuditPaginator meta={meta} page={page} onPage={setPage} />
        </>
      )}
    </div>
  );
}
