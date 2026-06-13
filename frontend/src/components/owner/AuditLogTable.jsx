import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown,
  ChevronsLeft, ChevronsRight,
  BedDouble, Calendar, CalendarX, ArrowRightToLine, ArrowLeftFromLine,
  Banknote, CreditCard, Users, Shield, Bot, Trash2,
  BadgeCheck, BadgeX, Pencil, User,
  AlertCircle, CheckCircle2, Crown, ShieldAlert,
  MessageSquareWarning, MessageSquareReply,
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';
import AuditDiffPanel from '../common/AuditDiffPanel';

/* ─── Mapping action → métadonnées visuelles ──────────────────── */
const ACTION_META = {
  ROOM_CREATED:               { label: 'Chambre créée',                 Icon: BedDouble,          color: 'emerald' },
  ROOM_UPDATED:               { label: 'Chambre modifiée',              Icon: Pencil,             color: 'sky'     },
  ROOM_DELETED:               { label: 'Chambre supprimée',             Icon: Trash2,             color: 'red'     },
  RESERVATION_CREATED:        { label: 'Réservation créée',             Icon: Calendar,           color: 'violet'  },
  RESERVATION_MODIFIED:       { label: 'Réservation modifiée',          Icon: Calendar,           color: 'amber'   },
  RESERVATION_CANCELLED:      { label: 'Réservation annulée',           Icon: CalendarX,          color: 'red'     },
  RESERVATION_AUTO_CANCELLED: { label: 'Annulée automatiquement',       Icon: CalendarX,          color: 'orange'  },
  CHECKIN_DONE:               { label: 'Arrivée enregistrée',           Icon: ArrowRightToLine,   color: 'teal'    },
  CHECKOUT_DONE:              { label: 'Départ validé',                 Icon: ArrowLeftFromLine,  color: 'slate'   },
  CHECKIN_WITH_DEPOSIT:       { label: 'Arrivée (acompte soldé)',       Icon: ShieldAlert,        color: 'amber'   },
  CHECKOUT_WITH_DEPOSIT:      { label: 'Départ (acompte soldé)',        Icon: ShieldAlert,        color: 'orange'  },
  ADMIN_CREATED:              { label: 'Admin créé',                    Icon: Shield,             color: 'violet'  },
  ADMIN_UPDATED:              { label: 'Admin modifié',                 Icon: Pencil,             color: 'sky'     },
  ADMIN_STATUS_CHANGED:       { label: 'Statut admin modifié',          Icon: Shield,             color: 'amber'   },
  ADMIN_DELETED:              { label: 'Admin supprimé',                Icon: Trash2,             color: 'red'     },
  PASSWORD_CHANGED:           { label: 'Mot de passe changé',          Icon: Shield,             color: 'amber'   },
  PAYMENT_RECORDED:           { label: 'Paiement espèces enregistré',   Icon: Banknote,           color: 'emerald' },
  DEPOSIT_SETTLED:            { label: "Solde d'acompte encaissé",      Icon: Banknote,           color: 'amber'   },
  PAYMENT_CONFIRMED:          { label: 'Paiement confirmé',             Icon: CreditCard,         color: 'green'   },
  PAYMENT_FAILED:             { label: 'Paiement échoué',               Icon: CreditCard,         color: 'red'     },
  REFUND_APPROVED:            { label: 'Remboursement approuvé',        Icon: BadgeCheck,         color: 'emerald' },
  REFUND_REJECTED:            { label: 'Remboursement refusé',          Icon: BadgeX,             color: 'rose'    },
  CLIENT_UPDATED:             { label: 'Profil client modifié',         Icon: Users,              color: 'blue'    },
  PROFILE_UPDATED:            { label: 'Profil admin modifié',          Icon: User,               color: 'blue'    },
  COMPLAINT_CREATED:          { label: 'Réclamation envoyée',           Icon: MessageSquareWarning, color: 'orange' },
  COMPLAINT_HANDLED:          { label: 'Réclamation traitée',           Icon: MessageSquareReply,   color: 'emerald' },
  COMPLAINT_CANCELLED:        { label: 'Réclamation annulée',           Icon: Trash2,             color: 'slate'   },
};

/* Tailwind classes par couleur - toutes listées statiquement pour purge CSS */
const COLOR_CLASSES = {
  emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'text-emerald-500', dot: 'bg-emerald-400' },
  sky:     { badge: 'bg-sky-50 text-sky-700 border-sky-200',             icon: 'text-sky-500',     dot: 'bg-sky-400'     },
  red:     { badge: 'bg-red-50 text-red-700 border-red-200',             icon: 'text-red-500',     dot: 'bg-red-400'     },
  violet:  { badge: 'bg-violet-50 text-violet-700 border-violet-200',    icon: 'text-violet-500',  dot: 'bg-violet-400'  },
  amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',       icon: 'text-amber-500',   dot: 'bg-amber-400'   },
  orange:  { badge: 'bg-orange-50 text-orange-700 border-orange-200',    icon: 'text-orange-500',  dot: 'bg-orange-400'  },
  teal:    { badge: 'bg-teal-50 text-teal-700 border-teal-200',          icon: 'text-teal-500',    dot: 'bg-teal-400'    },
  slate:   { badge: 'bg-slate-50 text-slate-700 border-slate-200',       icon: 'text-slate-500',   dot: 'bg-slate-400'   },
  green:   { badge: 'bg-green-50 text-green-700 border-green-200',       icon: 'text-green-500',   dot: 'bg-green-400'   },
  blue:    { badge: 'bg-blue-50 text-blue-700 border-blue-200',          icon: 'text-blue-500',    dot: 'bg-blue-400'    },
  rose:    { badge: 'bg-rose-50 text-rose-700 border-rose-200',          icon: 'text-rose-500',    dot: 'bg-rose-400'    },
};

/* Libellé humain de l'entité */
const ENTITY_LABELS = {
  Reservation: 'Réservation',
  Room:        'Chambre',
  Payment:     'Paiement',
  Refund:      'Remboursement',
  Admin:       'Admin',
  Client:      'Client',
  Complaint:   'Réclamation',
};

/* Fournisseur de paiement lisible */
const providerLabel = (p) => ({ orange_ci: 'Orange Money', wave_ci: 'Wave CI', cash: 'Espèces' }[p] || p || '');

/* Catégories de réclamation lisibles */
const COMPLAINT_CATEGORY_LABELS = {
  room_cleanliness: 'Propreté de la chambre',
  billing_issue:    'Problème de facturation',
  payment_issue:    'Problème de paiement',
  booking_error:    'Erreur de réservation',
  amenities:        'Équipement défectueux',
  staff_service:    'Accueil / service',
  noise:            'Nuisances sonores',
  other:            'Autre',
};

/* Contexte court à afficher sous le badge action */
function getContext(log) {
  const v = log.new_values || {};
  const o = log.old_values  || {};

  switch (log.action_type) {
    case 'RESERVATION_CANCELLED':
      if (v.cancelled_by === 'admin')
        return `Annulée par l'admin ${v.admin_name || ''}${v.admin_role ? ` (${v.admin_role})` : ''}`;
      if (v.cancelled_by === 'client') return 'Annulée par le client lui-même';
      return null;

    case 'RESERVATION_AUTO_CANCELLED':
      return 'Aucun paiement confirmé - annulation déclenchée automatiquement';

    case 'RESERVATION_CREATED': {
      const plan = v.payment_plan === 'partial' ? 'Paiement en 2 fois' : 'Paiement intégral';
      return v.total_amount ? `${formatXOF(v.total_amount)} · ${plan}` : null;
    }

    case 'PAYMENT_CONFIRMED':
      return v.amount
        ? `${formatXOF(v.amount)} via ${providerLabel(v.provider)}`
        : null;

    case 'PAYMENT_FAILED':
      return v.amount
        ? `Échec de ${formatXOF(v.amount)} via ${providerLabel(v.provider)}`
        : null;

    case 'PAYMENT_RECORDED':
      return v.amount ? `${formatXOF(v.amount)} en espèces` : null;

    case 'DEPOSIT_SETTLED': {
      const PERM_LABELS = {
        manage_payments:      'Paiements & Remboursements',
        checkin_with_deposit: "Encaissement d'acomptes",
      };
      const byName  = v.recorded_by_name ?? '-';
      const byRole  = { manager: 'Manager', accountant: 'Comptable', receptionist: 'Réceptionniste' }[v.recorded_by_role] ?? v.recorded_by_role ?? '';
      const perm    = PERM_LABELS[v.permission_used] ?? v.permission_used ?? '';
      const client  = v.client_name ? ` · Client : ${v.client_name}` : '';
      const room    = v.room_number  ? ` · Chambre N° ${v.room_number}` : '';
      return v.amount
        ? `${formatXOF(v.amount)} encaissé par ${byName}${byRole ? ` (${byRole})` : ''}${perm ? ` - droit : ${perm}` : ''}${client}${room}`
        : null;
    }

    case 'REFUND_APPROVED':
      return v.amount ? `${formatXOF(v.amount)} approuvé${v.admin_notes ? ` - « ${v.admin_notes} »` : ''}` : null;

    case 'REFUND_REJECTED':
      return v.admin_notes ? `Motif : « ${v.admin_notes} »` : null;

    case 'CHECKIN_DONE':
      return 'Chambre passée en occupation';

    case 'CHECKOUT_DONE':
      return 'Chambre remise disponible · Facture envoyée';

    case 'CHECKIN_WITH_DEPOSIT':
      return 'Arrivée avec acompte soldé sur place · Autorisé par Manager/Comptable';

    case 'CHECKOUT_WITH_DEPOSIT':
      return 'Départ avec acompte soldé sur place · Autorisé par Manager/Comptable';

    case 'ROOM_DELETED':
      return o.room_number ? `Chambre N° ${o.room_number}` : null;

    case 'ROOM_CREATED':
      return v.room_number ? `Chambre N° ${v.room_number} · ${v.room_type || ''} · ${v.price_per_night ? formatXOF(v.price_per_night) + '/nuit' : ''}` : null;

    case 'COMPLAINT_CREATED': {
      const cat = COMPLAINT_CATEGORY_LABELS[v.category] || v.category;
      return cat
        ? `${cat}${v.reservation_id ? ` · Réservation #${v.reservation_id}` : ''}`
        : null;
    }

    case 'COMPLAINT_HANDLED': {
      const cat = COMPLAINT_CATEGORY_LABELS[v.category] || v.category;
      return cat ? `Marquée traitée · ${cat}` : 'Marquée comme traitée';
    }

    case 'COMPLAINT_CANCELLED': {
      const cat = COMPLAINT_CATEGORY_LABELS[o.category] || o.category;
      return cat ? `Annulée par le client · ${cat}` : 'Annulée par le client';
    }

    default:
      return null;
  }
}

/* Qui a effectué l'action */
function ActorCell({ log }) {
  // 1. Admin identifié
  if (log.admin) {
    const roleLabels = {
      manager:      'Manager',
      receptionist: 'Réceptionniste',
      accountant:   'Comptable',
    };
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
          <Shield className="h-3.5 w-3.5 text-brand-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {log.admin.last_name} {log.admin.first_name}
          </p>
          <p className="text-xs text-gray-400">{roleLabels[log.admin.role] || log.admin.role}</p>
        </div>
      </div>
    );
  }

  // 2. Action effectuée par le patron (owner)
  const ownerName = log.new_values?._performed_by_owner;
  if (ownerName) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center">
          <Crown className="h-3.5 w-3.5 text-yellow-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{ownerName}</p>
          <p className="text-xs text-yellow-600 font-medium">Propriétaire</p>
        </div>
      </div>
    );
  }

  // 3. Système ou client
  const systemActions = ['PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'RESERVATION_AUTO_CANCELLED'];
  const isSystem = systemActions.includes(log.action_type);

  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
        {isSystem
          ? <Bot className="h-3.5 w-3.5 text-gray-500" />
          : <User className="h-3.5 w-3.5 text-gray-500" />}
      </span>
      <div>
        <p className="text-sm font-medium text-gray-600">{isSystem ? 'Système' : 'Client'}</p>
        <p className="text-xs text-gray-400">{isSystem ? 'Action automatique' : 'Action client'}</p>
      </div>
    </div>
  );
}

/* Ligne expandable */
function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const meta  = ACTION_META[log.action_type] || { label: log.action_type, Icon: AlertCircle, color: 'slate' };
  const cls   = COLOR_CLASSES[meta.color] || COLOR_CLASSES.slate;
  const { Icon } = meta;
  const ctx   = getContext(log);
  const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type;
  const hasDetails  = !!(log.old_values || log.new_values);

  return (
    <>
      <tr
        className={`border-b border-gray-100 transition-colors ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => hasDetails && setOpen((o) => !o)}
      >
        {/* Action */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${cls.badge} border`}>
              <Icon className={`h-3.5 w-3.5 ${cls.icon}`} />
            </span>
            <div>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cls.badge}`}>
                {meta.label}
              </span>
              {ctx && (
                <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{ctx}</p>
              )}
            </div>
          </div>
        </td>

        {/* Acteur */}
        <td className="px-4 py-3">
          <ActorCell log={log} />
        </td>

        {/* Entité */}
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700">
            {entityLabel}
            {log.entity_id && <span className="text-gray-400 font-mono ml-1">#{log.entity_id}</span>}
          </span>
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          {formatDateTime(log.created_at)}
        </td>

        {/* IP + expand */}
        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
          <div className="flex items-center justify-between gap-2">
            <span>{log.ip_address || '-'}</span>
            {hasDetails && (
              open
                ? <ChevronDown className="h-4 w-4 text-gray-400" />
                : <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </td>
      </tr>

      {/* Détail expandable */}
      {open && hasDetails && (
        <tr className="bg-gray-50/80 border-b border-gray-100">
          <td colSpan={5} className="px-6 py-4">
            <AuditDiffPanel oldValues={log.old_values} newValues={log.new_values} />
          </td>
        </tr>
      )}
    </>
  );
}

/* Pagination — même style que OwnerClientsPage / OwnerReservationsPage */
function Pagination({ page, totalPages, total, onPageChange }) {
  if (!total && totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-500">
        Page <span className="font-semibold text-gray-700">{page}</span> sur{' '}
        <span className="font-semibold text-gray-700">{totalPages}</span>
        {total != null && (
          <span className="ml-2 text-gray-400">
            · {total} entrée{total !== 1 ? 's' : ''}
          </span>
        )}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-ghost h-8 w-8 p-0"
          title="Première page"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        ><ChevronsLeft className="h-4 w-4" /></button>
        <button
          className="btn-ghost h-8 w-8 p-0"
          title="Page précédente"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        ><ChevronLeft className="h-4 w-4" /></button>
        <button
          className="btn-ghost h-8 w-8 p-0"
          title="Page suivante"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        ><ChevronRight className="h-4 w-4" /></button>
        <button
          className="btn-ghost h-8 w-8 p-0"
          title="Dernière page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        ><ChevronsRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* Composant principal */
export default function AuditLogTable({ logs = [], loading, page, totalPages, total, onPageChange }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
        <span className="h-4 w-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
        Chargement du journal…
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
        <CheckCircle2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">Aucune entrée dans le journal pour ces critères.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Effectuée par</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Ressource</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Date & heure</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
  );
}
