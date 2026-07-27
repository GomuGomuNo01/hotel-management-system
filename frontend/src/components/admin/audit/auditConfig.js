import {
  LogIn, LogOut, CalendarPlus, CalendarDays, CalendarMinus,
  Banknote, CheckCircle2, XCircle, RotateCcw,
  MessageCircle, Bed, User, UserCog, UserPlus, UserMinus,
  UserCheck, Lock, Sparkles,
} from 'lucide-react';
import { formatXOF } from '../../../utils/formatCurrency';

/**
 * Données statiques et utilitaires du journal d'audit (libellés, icônes,
 * couleurs, catégories, résumés de contexte), extraits de
 * AdminAuditSummaryPage pour alléger la page. Tout en français simple.
 */

export const ACTION_LABELS = {
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
  HOUSEKEEPING_UPDATED:       'État ménage modifié',
  STAYOVER_DONE:              'Recouche effectuée',
  STAYOVER_DEFERRED:          'Recouche reportée',
};

const PROVIDER_LABELS = {
  orange_ci: 'Orange Money',
  wave_ci:   'Wave',
  cash:      'Espèces',
};

/* Icône dans le rond de la timeline */
export const ACTION_ICONS = {
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
  HOUSEKEEPING_UPDATED:       Sparkles,
  STAYOVER_DONE:              Sparkles,
  STAYOVER_DEFERRED:          Sparkles,
};

/* Couleur du rond timeline */
export const DOT_COLORS = {
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
  HOUSEKEEPING_UPDATED:       'bg-cyan-100    text-cyan-600',
  STAYOVER_DONE:              'bg-cyan-100    text-cyan-600',
  STAYOVER_DEFERRED:          'bg-cyan-100    text-cyan-600',
};

/* Catégories pour le résumé 30 jours */
export const CATEGORIES = [
  { key: 'stays',        label: 'Séjours',        Icon: LogIn,        color: 'teal',    actions: ['CHECKIN_DONE','CHECKOUT_DONE','CHECKIN_WITH_DEPOSIT','CHECKOUT_WITH_DEPOSIT'] },
  { key: 'reservations', label: 'Réservations',   Icon: CalendarDays, color: 'blue',    actions: ['RESERVATION_CREATED','RESERVATION_MODIFIED','RESERVATION_CANCELLED','RESERVATION_AUTO_CANCELLED'] },
  { key: 'payments',     label: 'Paiements',      Icon: Banknote,     color: 'emerald', actions: ['PAYMENT_RECORDED','DEPOSIT_SETTLED','PAYMENT_CONFIRMED','PAYMENT_FAILED'] },
  { key: 'refunds',      label: 'Remboursements', Icon: RotateCcw,    color: 'amber',   actions: ['REFUND_APPROVED','REFUND_REJECTED'] },
  { key: 'complaints',   label: 'Réclamations',   Icon: MessageCircle, color: 'orange', actions: ['COMPLAINT_CREATED','COMPLAINT_HANDLED','COMPLAINT_CANCELLED'] },
  { key: 'rooms',        label: 'Chambres',       Icon: Bed,          color: 'violet',  actions: ['ROOM_CREATED','ROOM_UPDATED','ROOM_DELETED'] },
  { key: 'accounts',     label: 'Comptes',        Icon: UserCog,      color: 'slate',   actions: ['CLIENT_UPDATED','PROFILE_UPDATED','PASSWORD_CHANGED','ADMIN_CREATED','ADMIN_UPDATED','ADMIN_STATUS_CHANGED','ADMIN_DELETED'] },
  { key: 'housekeeping', label: 'Ménage',         Icon: Sparkles,     color: 'cyan',    actions: ['HOUSEKEEPING_UPDATED','STAYOVER_DONE','STAYOVER_DEFERRED'] },
];

export const CAT_COLORS = {
  teal:    { tile: 'border-teal-200',    dot: 'bg-teal-100    text-teal-600',    count: 'text-teal-700'    },
  blue:    { tile: 'border-blue-200',    dot: 'bg-blue-100    text-blue-600',    count: 'text-blue-700'    },
  emerald: { tile: 'border-emerald-200', dot: 'bg-emerald-100 text-emerald-600', count: 'text-emerald-700' },
  amber:   { tile: 'border-amber-200',   dot: 'bg-amber-100   text-amber-600',   count: 'text-amber-700'   },
  orange:  { tile: 'border-orange-200',  dot: 'bg-orange-100  text-orange-600',  count: 'text-orange-700'  },
  violet:  { tile: 'border-violet-200',  dot: 'bg-violet-100  text-violet-600',  count: 'text-violet-700'  },
  slate:   { tile: 'border-slate-200',   dot: 'bg-slate-100   text-slate-600',   count: 'text-slate-700'   },
  cyan:    { tile: 'border-cyan-200',    dot: 'bg-cyan-100    text-cyan-600',    count: 'text-cyan-700'    },
};

export const ROLE_LABELS = {
  manager:      'Manager',
  receptionist: 'Réceptionniste',
  accountant:   'Comptable',
  owner:        'Propriétaire',
};

export const SYSTEM_ACTIONS = new Set([
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

/* ─── Utilitaires ────────────────────────────────────────────────── */

/** Libellé lisible de l'entité concernée */
export function entityLabel(type, id) {
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
export function getContextSummary(log) {
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
export function formatAuditDate(dateStr) {
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

export function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
