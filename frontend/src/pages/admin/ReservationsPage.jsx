import { useState } from 'react';
import {
  Filter, CalendarCheck, X, Calendar, Moon, FileText,
  BedDouble, User, CheckCircle, XCircle, LogIn, LogOut, Loader2,
} from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { adminReservationsApi } from '../../api/reservations.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'pending',     label: 'En attente' },
  { value: 'confirmed',   label: 'Confirmées' },
  { value: 'checked_in',  label: 'Check-in' },
  { value: 'checked_out', label: 'Check-out' },
  { value: 'cancelled',   label: 'Annulées' },
];

/* ── Detail / action modal ───────────────────────────────────── */
function ReservationDetailModal({ reservation: initial, onClose, onUpdated }) {
  const [reservation, setReservation] = useState(initial);
  const [confirm, setConfirm]         = useState(null); // { action, label, message }
  const [busy, setBusy]               = useState(false);
  const [editNotes, setEditNotes]     = useState(false);
  const [notes, setNotes]             = useState(initial.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  const room   = reservation.room   || {};
  const client = reservation.client || {};

  const runAction = async (action) => {
    setBusy(true);
    try {
      let res;
      switch (action) {
        case 'confirm':  res = await adminReservationsApi.confirm(reservation.id);                              break;
        case 'cancel':   res = await adminReservationsApi.update(reservation.id, { status: 'cancelled' });     break;
        case 'checkin':  res = await adminReservationsApi.checkIn(reservation.id);                             break;
        case 'checkout': res = await adminReservationsApi.checkOut(reservation.id);                            break;
        default: throw new Error('Action inconnue');
      }
      const updated = res?.data ?? res;
      setReservation(updated);
      toast.success(confirm?.successMsg || 'Opération réussie.');
      onUpdated(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Opération impossible.');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await adminReservationsApi.update(reservation.id, { notes });
      const updated = res?.data ?? res;
      setReservation(updated);
      setEditNotes(false);
      toast.success('Notes enregistrées.');
      onUpdated(updated);
    } catch {
      toast.error('Enregistrement impossible.');
    } finally {
      setSavingNotes(false);
    }
  };

  const ACTION_MAP = {
    confirm: {
      action: 'confirm',
      label: 'Confirmer',
      message: `Confirmer la réservation #${reservation.id} de ${client.first_name} ${client.last_name} ?`,
      successMsg: 'Réservation confirmée.',
      icon: CheckCircle,
      cls: 'btn-primary',
      allowed: reservation.status === 'pending',
    },
    cancel: {
      action: 'cancel',
      label: 'Annuler',
      message: `Annuler la réservation #${reservation.id} ? Cette action est irréversible.`,
      successMsg: 'Réservation annulée.',
      icon: XCircle,
      cls: 'btn-danger',
      allowed: ['pending', 'confirmed'].includes(reservation.status),
    },
    checkin: {
      action: 'checkin',
      label: 'Check-in',
      message: `Effectuer le check-in pour la réservation #${reservation.id} ?`,
      successMsg: 'Check-in effectué.',
      icon: LogIn,
      cls: 'btn-primary',
      allowed: reservation.status === 'confirmed',
    },
    checkout: {
      action: 'checkout',
      label: 'Check-out',
      message: `Effectuer le check-out pour la réservation #${reservation.id} ?`,
      successMsg: 'Check-out effectué.',
      icon: LogOut,
      cls: 'btn-secondary',
      allowed: reservation.status === 'checked_in',
    },
  };

  const availableActions = Object.values(ACTION_MAP).filter((a) => a.allowed);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Réservation #{reservation.id}</p>
              <h2 className="font-bold text-gray-900 text-lg">
                Chambre {room.room_number}
                {room.room_type && <span className="text-gray-500 font-normal"> — {room.room_type}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={reservation.status} />
              <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Client info */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {client.first_name?.[0]}{client.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {client.first_name} {client.last_name}
                </p>
                <p className="text-xs text-gray-500">{client.email}</p>
                {client.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
              </div>
            </div>

            {/* Dates + montant */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex gap-2 items-center text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Arrivée</p>
                  <p className="font-medium">{formatDate(reservation.check_in_date)}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Départ</p>
                  <p className="font-medium">{formatDate(reservation.check_out_date)}</p>
                </div>
              </div>
              {reservation.nights != null && (
                <div className="flex gap-2 items-center text-gray-600">
                  <Moon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Durée</p>
                    <p className="font-medium">{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 items-center text-gray-600">
                <BedDouble className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Montant total</p>
                  <p className="font-bold text-brand-600">{formatXOF(reservation.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Notes
                </p>
                {!editNotes && (
                  <button
                    className="text-xs text-brand-600 hover:text-brand-700"
                    onClick={() => setEditNotes(true)}
                  >
                    {reservation.notes ? 'Modifier' : 'Ajouter'}
                  </button>
                )}
              </div>
              {editNotes ? (
                <div className="space-y-2">
                  <textarea
                    className="input min-h-[80px] resize-y text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={2000}
                  />
                  <div className="flex gap-2 justify-end">
                    <button className="btn-secondary text-xs" onClick={() => setEditNotes(false)}>
                      Annuler
                    </button>
                    <button className="btn-primary text-xs" onClick={saveNotes} disabled={savingNotes}>
                      {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 min-h-[40px]">
                  {reservation.notes || <span className="text-gray-400 italic">Aucune note</span>}
                </p>
              )}
            </div>

            {/* Action buttons */}
            {availableActions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {availableActions.map((a) => (
                  <button
                    key={a.action}
                    className={`${a.cls} flex-1 justify-center text-sm`}
                    onClick={() => setConfirm(a)}
                    disabled={busy}
                  >
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          open
          title={confirm.label}
          message={confirm.message}
          confirmLabel={confirm.label}
          variant={confirm.action === 'cancel' ? 'danger' : 'primary'}
          loading={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() => runAction(confirm.action)}
        />
      )}
    </>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '' });
  const [page, setPage]       = useState(1);
  const { data, meta, loading, refetch } = useReservations({ ...filters, page }, { admin: true });
  const [selected, setSelected] = useState(null);

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleUpdated = (updated) => {
    // Update the row in the table without full refetch
    refetch();
    // If the modal is open, update it too
    if (selected?.id === updated.id) setSelected(updated);
  };

  const columns = [
    {
      key: 'id',
      label: '#',
      render: (r) => <span className="font-mono text-xs text-gray-400">#{r.id}</span>,
    },
    {
      key: 'client',
      label: 'Client',
      render: (r) => r.client ? (
        <div>
          <p className="font-medium">{r.client.first_name} {r.client.last_name}</p>
          <p className="text-xs text-gray-400">{r.client.email}</p>
        </div>
      ) : '—',
    },
    {
      key: 'room',
      label: 'Chambre',
      render: (r) => (
        <div>
          <p className="font-medium">N° {r.room?.room_number}</p>
          <p className="text-xs text-gray-400 capitalize">{r.room?.room_type}</p>
        </div>
      ),
    },
    {
      key: 'dates',
      label: 'Période',
      render: (r) => (
        <span className="text-sm whitespace-nowrap">
          {formatDate(r.check_in_date)}
          <span className="text-gray-400"> → </span>
          {formatDate(r.check_out_date)}
          {r.nights != null && (
            <span className="text-xs text-gray-400 ml-1">({r.nights}n)</span>
          )}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      render: (r) => <span className="font-semibold text-brand-600">{formatXOF(r.total_amount)}</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button
          className="btn-secondary text-xs"
          onClick={() => setSelected(r)}
        >
          Détails
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-brand-500" />
          Réservations
        </h1>
        {meta && (
          <p className="text-sm text-gray-500 mt-0.5">
            {meta.total} réservation{meta.total !== 1 ? 's' : ''} au total
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="card card-pad">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

          <select
            className="input w-auto"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Du</span>
            <input
              type="date"
              className="input w-auto"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
            />
            <span className="text-xs text-gray-500">au</span>
            <input
              type="date"
              className="input w-auto"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
            />
          </div>

          {(filters.status || filters.date_from || filters.date_to) && (
            <button
              className="btn-ghost text-xs text-gray-500"
              onClick={() => {
                setFilters({ status: '', date_from: '', date_to: '' });
                setPage(1);
              }}
            >
              <X className="h-3.5 w-3.5" /> Effacer
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
          emptyMessage="Aucune réservation trouvée."
        />
      </div>

      {/* Modal détail */}
      {selected && (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
