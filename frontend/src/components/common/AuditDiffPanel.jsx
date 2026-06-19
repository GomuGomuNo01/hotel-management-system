/**
 * AuditDiffPanel - Vue lisible des données "avant / après" d'un log d'audit.
 * Utilisé par AuditLogTable (owner) et AdminAuditSummaryPage (admin).
 *
 * UX :
 *  - Seuls les champs MODIFIÉS sont affichés par défaut
 *  - Les champs non modifiés sont masqués derrière un toggle dépliable
 *  - Les clés techniques/internes sont filtrées
 *  - Toutes les valeurs sont traduites en français lisible
 */
/* eslint-disable react-refresh/only-export-components -- helper fmtAuditValue co-localisé volontairement ; n'affecte que le Fast Refresh en dev. */
import { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

/* ─── Clés à masquer intégralement ────────────────────────────── */
export const HIDDEN_AUDIT_KEYS = new Set([
  // Clés d'identité interne
  '_performed_by_owner',
  'cancelled_by', 'admin_id', 'admin_name', 'admin_role',
  'deposit_settlement', 'recorded_by_id',
  'client_id', 'room_id', 'payment_id', 'refund_id', 'reservation_id',
  // Timestamps gérés par Eloquent
  'created_at', 'updated_at', 'deleted_at', 'hired_at',
  // Champs techniques d'état chambre / plan (lisibles via le contexte)
  'room_status', 'deposit_plan', 'payment_type',
  // Données personnelles très granulaires - peu pertinentes dans un diff métier
  'gender', 'postal_code', 'address_line',
  'date_of_birth', 'place_of_birth',
  'id_document_type', 'id_document_number',
  'city', 'country', 'bio',
]);

/* ─── Libellés humains des champs ──────────────────────────────── */
const FIELD_LABELS = {
  // Réservation
  status:               'Statut',
  check_in_date:        "Date d'arrivée",
  check_out_date:       'Date de départ',
  total_amount:         'Montant total',
  payment_plan:         'Plan de paiement',
  notes:                'Notes',
  nights:               'Nombre de nuits',
  room_price:           'Prix chambre',
  // Chambre
  room_number:          'N° chambre',
  room_type:            'Type de chambre',
  price_per_night:      'Prix / nuit',
  capacity:             'Capacité (pers.)',
  description:          'Description',
  images:               'Photos de la chambre',
  amenities:            'Équipements',
  features:             'Caractéristiques',
  // Paiement
  amount:               'Montant',
  provider:             'Moyen de paiement',
  payment_status:       'Statut paiement',
  refund_amount:        'Montant remboursé',
  is_refundable:        'Remboursable',
  // Encaissement acompte
  recorded_by_name:     'Encaissé par',
  recorded_by_role:     'Rôle (encaisseur)',
  permission_used:      'Droit utilisé',
  client_name:          'Client',
  // Admin / profil
  first_name:              'Prénom',
  last_name:               'Nom',
  email:                   'Adresse e-mail',
  phone:                   'Téléphone',
  phone_country:           'Pays (téléphone)',
  nationality:             'Nationalité',
  role:                    'Rôle',
  is_active:               'Compte actif',
  permissions:             'Droits d\'accès',
  job_title:               'Poste / titre',
  emergency_contact_name:  'Contact d\'urgence (nom)',
  emergency_contact_phone: 'Contact d\'urgence (tél.)',
  // Remboursement
  admin_notes:          'Commentaire',
  reason:               'Motif',
};

/* ─── Traduction des valeurs ────────────────────────────────────── */
const VALUE_MAP = {
  // Statuts réservation
  pending:              'En attente',
  confirmed:            'Confirmée',
  checked_in:           'Occupée',
  checked_out:          'Terminée',
  cancelled:            'Annulée',
  // Statuts paiement
  success:              'Succès',
  failed:               'Échoué',
  processing:           'En cours',
  // Plans de paiement
  partial:              'Acompte (50 %)',
  full:                 'Intégral',
  partial_settled:      'Acompte soldé',
  // Solde de paiement
  balance:              'Solde restant',
  deposit:              'Acompte initial',
  // Prestataires
  orange_ci:            'Orange Money',
  wave_ci:              'Wave CI',
  cash:                 'Espèces',
  // Rôles
  manager:              'Manager',
  receptionist:         'Réceptionniste',
  accountant:           'Comptable',
  owner:                'Propriétaire',
  // Permissions
  manage_payments:         'Paiements & Remboursements',
  manage_reservations:     'Gestion des réservations',
  manage_rooms:            'Gestion des chambres',
  manage_clients:          'Gestion des clients',
  manage_checkin_checkout: 'Arrivées & Départs',
  checkin_with_deposit:    "Encaissement d'acomptes",
  view_reports:            'Rapports financiers',
  view_audit_summary:      "Journal d'audit",
  // État chambre
  available:            'Disponible',
  occupied:             'Occupée',
  maintenance:          'En maintenance',
  // Équipements chambre
  wifi:                 'Wi-Fi',
  climatisation:        'Climatisation',
  tv:                   'Télévision',
  minibar:              'Minibar',
  // Documents identité
  national_id:          "Carte d'identité nationale",
  passport:             'Passeport',
  residence_permit:     'Titre de séjour',
  // Booléens
  true:                 'Oui',
  false:                'Non',
  // Civilité
  male:                 'Homme',
  female:               'Femme',
};

const AMOUNT_KEYS = new Set([
  'total_amount', 'amount', 'price_per_night',
  'refund_amount', 'room_price',
]);

/* ─── Formateur de valeur ───────────────────────────────────────── */
export function fmtAuditValue(key, value) {
  if (value === null || value === undefined || value === '') {
    return <em className="text-gray-300">vide</em>;
  }

  // Montants
  if (AMOUNT_KEYS.has(key)) {
    const n = Number(value);
    return isNaN(n) ? String(value) : formatXOF(n);
  }

  // Booléens
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

  if (typeof value === 'string') {
    // Dates ISO datetime
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
    // Dates ISO date seule
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    }
    // Traduction directe
    if (VALUE_MAP[value] !== undefined) return VALUE_MAP[value];
  }

  // Tableaux
  if (Array.isArray(value)) {
    if (!value.length) return <em className="text-gray-300">aucune</em>;

    // Tableau d'objets (ex : images, équipements…)
    if (typeof value[0] === 'object' && value[0] !== null) {
      if (key === 'images') {
        const n = value.length;
        return `${n} photo${n > 1 ? 's' : ''}`;
      }
      const n = value.length;
      return `${n} élément${n > 1 ? 's' : ''}`;
    }

    // Tableau de primitives (permissions…)
    return value.map((v) => VALUE_MAP[v] || v).join(', ');
  }

  // Objet simple - évite l'affichage "[object Object]"
  if (typeof value === 'object' && value !== null) {
    if (key === 'images') return '1 photo';
    // Tentative d'extraction d'un libellé lisible
    const label = value.name ?? value.label ?? value.title ?? value.url ?? null;
    if (label) return String(label);
    return <em className="text-gray-400">données modifiées</em>;
  }

  return String(value);
}

/* ─── Composant principal ───────────────────────────────────────── */
export default function AuditDiffPanel({ oldValues, newValues }) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const old = oldValues || {};
  const nw  = newValues  || {};

  // Toutes les clés visibles (hors liste noire)
  const allKeys = [...new Set([...Object.keys(old), ...Object.keys(nw)])]
    .filter((k) => !HIDDEN_AUDIT_KEYS.has(k));

  if (!allKeys.length) return null;

  const isCreationOnly = !oldValues && newValues;
  const isDeletionOnly = oldValues  && !newValues;

  /* ── Vue création / suppression seule ── */
  if (isCreationOnly || isDeletionOnly) {
    const values = isCreationOnly ? nw : old;
    const keys   = allKeys.filter((k) => k in values && values[k] !== null && values[k] !== undefined && values[k] !== '');

    if (!keys.length) return null;

    return (
      <div className={`rounded-lg border overflow-hidden text-xs ${
        isCreationOnly ? 'border-emerald-200' : 'border-red-200'
      }`}>
        <div className={`px-3 py-2 font-semibold text-[11px] uppercase tracking-wider ${
          isCreationOnly ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {isCreationOnly ? '✦ Informations enregistrées' : '✦ Informations supprimées'}
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {keys.map((k) => (
            <div key={k} className="flex items-baseline gap-3 px-3 py-2">
              <span className="w-40 flex-shrink-0 text-gray-400 font-medium">
                {FIELD_LABELS[k] || k}
              </span>
              <span className={isCreationOnly ? 'text-gray-800 font-medium' : 'text-red-600 line-through'}>
                {fmtAuditValue(k, values[k])}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Vue diff (avant → après) ── */
  const changedKeys   = allKeys.filter((k) => JSON.stringify(old[k]) !== JSON.stringify(nw[k]));
  const unchangedKeys = allKeys.filter((k) => JSON.stringify(old[k]) === JSON.stringify(nw[k]));

  if (!changedKeys.length && !unchangedKeys.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">

      {/* ── Champs modifiés ── */}
      {changedKeys.length > 0 ? (
        <>
          {/* En-tête colonnes */}
          <div className="grid grid-cols-[160px_1fr_16px_1fr] bg-gray-50 border-b border-gray-200 px-3 py-2 gap-2 font-semibold text-[11px] uppercase tracking-wider text-gray-500">
            <span>Champ modifié</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Ancienne valeur
            </span>
            <span />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Nouvelle valeur
            </span>
          </div>
          <div className="divide-y divide-gray-100 bg-white">
            {changedKeys.map((k) => (
              <div
                key={k}
                className="grid grid-cols-[160px_1fr_16px_1fr] items-start gap-2 px-3 py-2.5 bg-amber-50/30"
              >
                <span className="text-gray-800 font-semibold pt-0.5 truncate">
                  {FIELD_LABELS[k] || k}
                </span>
                <span className="text-amber-700 line-through decoration-amber-300 leading-relaxed">
                  {fmtAuditValue(k, old[k])}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0 mt-0.5" />
                <span className="text-emerald-700 font-medium leading-relaxed">
                  {fmtAuditValue(k, nw[k])}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="px-3 py-2 bg-gray-50 text-[11px] text-gray-400 font-medium uppercase tracking-wider border-b border-gray-200">
          Aucune modification détectée
        </div>
      )}

      {/* ── Champs non modifiés - masqués par défaut ── */}
      {unchangedKeys.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowUnchanged((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-200 text-[11px] text-gray-500 font-medium"
          >
            <span>
              {showUnchanged
                ? 'Masquer les champs inchangés'
                : `Voir les ${unchangedKeys.length} champ${unchangedKeys.length > 1 ? 's' : ''} inchangé${unchangedKeys.length > 1 ? 's' : ''}`}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showUnchanged ? 'rotate-180' : ''}`} />
          </button>

          {showUnchanged && (
            <div className="divide-y divide-gray-100 bg-white border-t border-gray-100">
              {unchangedKeys.map((k) => (
                <div
                  key={k}
                  className="flex items-baseline gap-3 px-3 py-2 opacity-50"
                >
                  <span className="w-40 flex-shrink-0 text-gray-500 truncate">
                    {FIELD_LABELS[k] || k}
                  </span>
                  <span className="text-gray-600">
                    {fmtAuditValue(k, nw[k] ?? old[k])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
