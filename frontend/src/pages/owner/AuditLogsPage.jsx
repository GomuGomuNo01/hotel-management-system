import { useEffect, useState } from 'react';
import { RotateCcw, Filter, ChevronDown } from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import AuditLogTable from '../../components/owner/AuditLogTable';
import SelectInput from '../../components/common/SelectInput';

/* ─── Listes statiques pour les dropdowns ─────────────────────── */
const ACTION_OPTIONS = [
  { value: '',                        label: 'Toutes les actions' },
  { value: 'ROOM_CREATED',            label: 'Chambre créée' },
  { value: 'ROOM_UPDATED',            label: 'Chambre modifiée' },
  { value: 'ROOM_DELETED',            label: 'Chambre supprimée' },
  { value: 'RESERVATION_CREATED',     label: 'Réservation créée' },
  { value: 'RESERVATION_MODIFIED',    label: 'Réservation modifiée' },
  { value: 'RESERVATION_CANCELLED',   label: 'Réservation annulée' },
  { value: 'RESERVATION_AUTO_CANCELLED', label: 'Annulée automatiquement' },
  { value: 'CHECKIN_DONE',            label: 'Check-in effectué' },
  { value: 'CHECKOUT_DONE',           label: 'Check-out validé' },
  { value: 'PAYMENT_RECORDED',        label: 'Paiement espèces enregistré' },
  { value: 'PAYMENT_CONFIRMED',       label: 'Paiement confirmé' },
  { value: 'PAYMENT_FAILED',          label: 'Paiement échoué' },
  { value: 'REFUND_APPROVED',         label: 'Remboursement approuvé' },
  { value: 'REFUND_REJECTED',         label: 'Remboursement refusé' },
  { value: 'CLIENT_UPDATED',          label: 'Profil client modifié' },
  { value: 'PROFILE_UPDATED',         label: 'Profil admin modifié' },
];

const ENTITY_OPTIONS = [
  { value: '',             label: 'Toutes les ressources' },
  { value: 'Room',         label: 'Chambre' },
  { value: 'Reservation',  label: 'Réservation' },
  { value: 'Payment',      label: 'Paiement' },
  { value: 'Refund',       label: 'Remboursement' },
  { value: 'Admin',        label: 'Admin' },
  { value: 'Client',       label: 'Client' },
];

const EMPTY_FILTERS = { admin_id: '', action_type: '', entity_type: '', date_from: '', date_to: '' };

function ActiveFilterBadge({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-brand-900 ml-0.5">✕</button>
    </span>
  );
}

export default function AuditLogsPage() {
  const [data, setData]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins]   = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage]       = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  /* Charge la liste des admins pour le sélecteur "Effectué par" */
  useEffect(() => {
    ownerApi.admins.list().then((res) => setAdmins(res?.data?.data ?? res?.data ?? []));
  }, []);

  /* Recharge les logs à chaque changement de filtre ou de page */
  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v !== ''));
    ownerApi.audit.list(params)
      .then((res) => {
        setData(res?.data?.data ?? res?.data ?? []);
        setMeta(res?.data?.meta ?? res?.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters), page]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(1); };

  const hasFilters = Object.values(filters).some(Boolean);

  /* Étiquettes courtes pour les badges de filtres actifs */
  const activeLabels = [
    filters.admin_id    && { key: 'admin_id',    label: `Admin : ${admins.find((a) => String(a.id) === filters.admin_id)?.first_name ?? `#${filters.admin_id}`}` },
    filters.action_type && { key: 'action_type', label: ACTION_OPTIONS.find((o) => o.value === filters.action_type)?.label ?? filters.action_type },
    filters.entity_type && { key: 'entity_type', label: ENTITY_OPTIONS.find((o) => o.value === filters.entity_type)?.label ?? filters.entity_type },
    filters.date_from   && { key: 'date_from',   label: `Depuis : ${filters.date_from}` },
    filters.date_to     && { key: 'date_to',     label: `Jusqu'au : ${filters.date_to}` },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Toutes les actions importantes réalisées dans l'hôtel, en temps réel.
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          <Filter className="h-4 w-4" />
          Filtres
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <div className="card card-pad space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Effectué par (admin) */}
            <div>
              <label className="label">Effectué par</label>
              <SelectInput
                value={filters.admin_id}
                onChange={(e) => setFilter('admin_id', e.target.value)}
              >
                <option value="">Tout le monde</option>
                <option value="__system__" disabled className="text-gray-400">── Système / Client ──</option>
                {admins.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.first_name} {a.last_name} ({a.role})
                  </option>
                ))}
              </SelectInput>
            </div>

            {/* Type d'action */}
            <div>
              <label className="label">Type d'action</label>
              <SelectInput
                value={filters.action_type}
                onChange={(e) => setFilter('action_type', e.target.value)}
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </div>

            {/* Ressource */}
            <div>
              <label className="label">Ressource concernée</label>
              <SelectInput
                value={filters.entity_type}
                onChange={(e) => setFilter('entity_type', e.target.value)}
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </div>

            {/* Date de début */}
            <div>
              <label className="label">Période — du</label>
              <input
                type="date"
                className="input"
                value={filters.date_from}
                max={filters.date_to || undefined}
                onChange={(e) => setFilter('date_from', e.target.value)}
              />
            </div>

            {/* Date de fin */}
            <div>
              <label className="label">Période — au</label>
              <input
                type="date"
                className="input"
                value={filters.date_to}
                min={filters.date_from || undefined}
                onChange={(e) => setFilter('date_to', e.target.value)}
              />
            </div>

            {/* Bouton reset */}
            {hasFilters && (
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="btn-ghost text-sm w-full flex items-center justify-center gap-2 h-10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>

          {/* Badges des filtres actifs */}
          {activeLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-400 self-center">Filtres actifs :</span>
              {activeLabels.map(({ key, label }) => (
                <ActiveFilterBadge
                  key={key}
                  label={label}
                  onRemove={() => setFilter(key, '')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compteur de résultats */}
      {!loading && meta && (
        <p className="text-sm text-gray-500">
          <strong className="text-gray-800">{meta.total ?? data.length}</strong> entrée{(meta.total ?? data.length) > 1 ? 's' : ''} trouvée{(meta.total ?? data.length) > 1 ? 's' : ''}
          {hasFilters && ' pour ces filtres'}.
        </p>
      )}

      {/* Table */}
      <div className="card">
        <AuditLogTable
          logs={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
