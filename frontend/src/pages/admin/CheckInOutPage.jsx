import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  LogIn, LogOut, Search, CalendarClock,
  CreditCard, Info,
  Lock, ShieldAlert,
} from 'lucide-react';
import { adminApi }       from '../../api/admin.api';
import { useAuth }        from '../../hooks/useAuth';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

/* ─── Helpers ────────────────────────────────────────────────────── */
function clientName(r) {
  return r.client ? `${r.client.last_name} ${r.client.first_name}` : '-';
}

/**
 * L'arrivée n'est enregistrable qu'à partir de la date d'arrivée prévue.
 * Comparaison de chaînes YYYY-MM-DD (locale) pour éviter tout décalage de fuseau.
 */
function arrivalReached(r) {
  if (!r.check_in_date) return true;
  const todayStr   = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (heure locale)
  const arrivalStr = String(r.check_in_date).slice(0, 10);
  return arrivalStr <= todayStr;
}

/** La chambre doit être propre avant d'accueillir un nouveau client. */
function roomReady(r) {
  const hk = r.room?.housekeeping_status;
  return !hk || hk === 'clean';
}

/**
 * Porte d'accès au check-in : date atteinte ET chambre prête.
 * Renvoie { ok } ou { ok:false, reason } avec le motif de blocage à afficher.
 */
function checkInGate(r) {
  if (!arrivalReached(r)) {
    return { ok: false, reason: `Arrivée prévue le ${formatDate(r.check_in_date)} : l'enregistrement ne sera possible qu'à partir de cette date.` };
  }
  if (!roomReady(r)) {
    return { ok: false, reason: `Chambre à préparer (état ménage : ${r.room?.housekeeping_label ?? 'non propre'}). Elle doit être nettoyée avant l'arrivée.` };
  }
  return { ok: true };
}

/* ─── Bannière acompte non soldé (section bloquée) ──────────────── */
function DepositBlockBanner({ count, canManage }) {
  if (count === 0) return null;

  if (!canManage) {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {count} réservation{count > 1 ? 's' : ''} avec acompte non soldé
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Ces réservations comportent un solde restant dû. L'arrivée / le départ ne
            peut être enregistré qu&apos;une fois l&apos;acompte entièrement soldé.
            Cette opération relève du <strong>Manager</strong> ou du <strong>Comptable</strong>.
          </p>
        </div>
      </div>
    );
  }

  return null; // Les admins autorisés voient le tableau ci-dessous
}

/* ─── Colonne montant acompte restant ────────────────────────────── */
function DepositCell({ reservation: r }) {
  const remaining = r.remaining_amount ?? 0;
  return (
    <div>
      <p className="text-xs text-gray-400">Total : {formatXOF(r.total_amount)}</p>
      <p className="text-xs font-semibold text-red-600">
        Solde dû : {formatXOF(remaining)}
      </p>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────────── */
export default function CheckInOutPage() {
  const { user } = useAuth();
  const perms = new Set(user?.permissions ?? []);
  const canManageDeposit = perms.has('checkin_with_deposit');

  const [eligible, setEligible]           = useState([]);
  const [withDeposit, setWithDeposit]     = useState([]);
  const [depositCount, setDepositCount]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [busyId, setBusyId]               = useState(null);
  const [confirm, setConfirm]             = useState(null); // { type:'in'|'out', reservation }
  const [search, setSearch]               = useState('');
  const [cashTarget, setCashTarget]       = useState(null); // réservation dont on encaisse le solde
  const [settling, setSettling]           = useState(false);

  /* ── Chargement ──────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.checkInEligible();
      const data = res?.data ?? res;
      setEligible(data?.eligible ?? []);
      setWithDeposit(data?.with_deposit ?? []);
      setDepositCount(data?.with_deposit_count ?? 0);
    } catch (e) {
      toast.error('Impossible de charger les réservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Rafraîchissement temps-réel - check-in/check-out ou paiement d'acompte
  useAutoRefresh(
    ['checkin.done', 'checkout.done', 'payment.confirmed', 'reservation.created', 'reservation.cancelled'],
    () => load(),
  );

  /* ── Filtrage local ──────────────────────────────────────────── */
  function filterRows(rows) {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.client?.first_name?.toLowerCase().includes(q) ||
      r.client?.last_name?.toLowerCase().includes(q) ||
      r.client?.email?.toLowerCase().includes(q) ||
      String(r.room?.room_number).includes(q)
    );
  }

  const filteredEligible    = filterRows(eligible);
  const filteredWithDeposit = filterRows(withDeposit);

  /* ── Action check-in / check-out ─────────────────────────────── */
  const performAction = async () => {
    if (!confirm) return;
    const { type, reservation: r } = confirm;
    setBusyId(r.id);
    try {
      if (type === 'in') await adminApi.checkIn(r.id);
      else               await adminApi.checkOut(r.id);

      if (type === 'in') {
        toast.success(
          `Chambre N° ${r.room?.room_number} - ${clientName(r)} est arrivé(e).`
        );
      } else {
        toast.success(
          `Chambre N° ${r.room?.room_number} libérée. La facture a été envoyée à ${clientName(r)}.`
        );
      }
      setConfirm(null);
      load();
    } catch (e) {
      const msg = e.response?.data?.message ?? "L'opération a échoué.";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  /* ── Encaissement du solde d'acompte (espèces) ───────────────── */
  const handleSettle = async () => {
    if (!cashTarget) return;
    setSettling(true);
    try {
      await adminApi.cashPayment(cashTarget.id);
      toast.success(
        `Solde de ${formatXOF(cashTarget.remaining_amount ?? 0)} encaissé. Vous pouvez enregistrer l'arrivée.`
      );
      setCashTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message ?? "L'encaissement du solde a échoué. Vérifiez et réessayez.");
    } finally {
      setSettling(false);
    }
  };

  /* ── Colonnes du tableau éligible ────────────────────────────── */
  const eligibleColumns = [
    {
      key: 'client', label: 'Client',
      render: (r) => (
        <div>
          <p className="font-medium">{clientName(r)}</p>
          <p className="text-xs text-gray-400">{r.client?.email}</p>
        </div>
      ),
    },
    {
      key: 'room', label: 'Chambre',
      render: (r) => (
        <div>
          <p className="font-medium">N° {r.room?.room_number}</p>
          <p className="text-xs text-gray-400 capitalize">{r.room?.room_type}</p>
        </div>
      ),
    },
    { key: 'in',     label: 'Arrivée',  render: (r) => formatDate(r.check_in_date) },
    { key: 'out',    label: 'Départ',   render: (r) => formatDate(r.check_out_date) },
    { key: 'status', label: 'Statut',   render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Action',
      render: (r) => (
        <div className="flex gap-2">
          {r.status === 'confirmed' && (() => {
            const gate = checkInGate(r);
            return gate.ok ? (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                disabled={busyId === r.id}
                onClick={() => setConfirm({ type: 'in', reservation: r })}
              >
                <LogIn className="h-3.5 w-3.5" /> Arrivée
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed"
                title={gate.reason}
              >
                <Lock className="h-3.5 w-3.5" /> Arrivée
              </span>
            );
          })()}
          {r.status === 'checked_in' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
              disabled={busyId === r.id}
              onClick={() => setConfirm({ type: 'out', reservation: r })}
            >
              <LogOut className="h-3.5 w-3.5" /> Départ
            </button>
          )}
        </div>
      ),
    },
  ];

  /* ── Colonnes du tableau "avec acompte" (Manager / Comptable) ── */
  const depositColumns = [
    {
      key: 'client', label: 'Client',
      render: (r) => (
        <div>
          <p className="font-medium">{clientName(r)}</p>
          <p className="text-xs text-gray-400">{r.client?.email}</p>
        </div>
      ),
    },
    {
      key: 'room', label: 'Chambre',
      render: (r) => (
        <div>
          <p className="font-medium">N° {r.room?.room_number}</p>
          <p className="text-xs text-gray-400 capitalize">{r.room?.room_type}</p>
        </div>
      ),
    },
    { key: 'in',  label: 'Arrivée', render: (r) => formatDate(r.check_in_date) },
    { key: 'out', label: 'Départ',  render: (r) => formatDate(r.check_out_date) },
    {
      key: 'deposit', label: 'Acompte',
      render: (r) => <DepositCell reservation={r} />,
    },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Action',
      render: (r) => (
        <div className="flex items-center gap-2">
          {/* Check-in/out verrouillé tant que le solde n'est pas réglé */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed"
            title="Encaissez d'abord le solde de l'acompte (bouton ci-contre)"
          >
            <Lock className="h-3.5 w-3.5" />
            {r.status === 'confirmed' ? 'Arrivée' : 'Départ'}
          </span>
          {/* Encaisser le solde d'acompte → débloque le check-in automatiquement.
              Uniquement à partir de la date d'arrivée du client. */}
          {arrivalReached(r) ? (
            <button
              onClick={() => setCashTarget(r)}
              disabled={settling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              title={`Encaisser le solde de ${formatXOF(r.remaining_amount ?? 0)}`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Régler le solde
            </button>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed"
              title={`Le solde ne peut être encaissé qu'à partir de la date d'arrivée (${formatDate(r.check_in_date)}).`}
            >
              <Lock className="h-3.5 w-3.5" />
              Régler le solde
            </span>
          )}
        </div>
      ),
    },
  ];

  /* ── Total affiché dans l'en-tête ────────────────────────────── */
  const totalPending = filteredEligible.length + (canManageDeposit ? filteredWithDeposit.length : 0);

  return (
    <div className="space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            Arrivées & Départs
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            <span className="text-blue-700 font-black">{totalPending} </span>
            arrivée{totalPending !== 1 ? 's' : ''} / départ{totalPending !== 1 ? 's' : ''} en attente
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9 w-64"
            placeholder="Nom, chambre, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Bannière acomptes bloqués (réceptionniste sans permission) ── */}
      <DepositBlockBanner count={depositCount} canManage={canManageDeposit} />

      {/* ── Tableau principal : réservations éligibles ─────────── */}
      <div className="card">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <LogIn className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-700">
            Réservations prêtes ({filteredEligible.length})
          </h2>
        </div>
        <DataTable
          columns={eligibleColumns}
          data={filteredEligible}
          loading={loading}
          emptyMessage="Aucune arrivée ou départ en attente pour le moment."
        />
      </div>

      {/* ── Tableau acomptes non soldés (Manager / Comptable) ────── */}
      {canManageDeposit && (
        <div className="card border-amber-200">
          <div className="px-4 pt-4 pb-2 flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-amber-800">
                Acompte non soldé - action requise ({filteredWithDeposit.length})
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Ces réservations ont un plan de paiement en 2 fois avec un solde restant dû.
                Cliquez sur <strong>« Régler le solde »</strong> pour encaisser le solde d&apos;acompte en
                espèces : l'arrivée / le départ sera ensuite débloqué automatiquement.
              </p>
            </div>
          </div>
          <DataTable
            columns={depositColumns}
            data={filteredWithDeposit}
            loading={loading}
            emptyMessage="Aucune réservation avec acompte non soldé."
          />
        </div>
      )}

      {/* ── Note informative générale ─────────────────────────────── */}
      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Seules les réservations <strong>confirmées</strong> et entièrement payées apparaissent ici.
          Les réservations avec acompte non soldé sont bloquées jusqu&apos;au règlement du solde.
          Toutes les opérations sont consignées dans le journal d&apos;audit.
        </span>
      </div>

      {/* ── Modal de confirmation ─────────────────────────────────── */}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'in' ? "Confirmer l'arrivée" : 'Confirmer le départ'}
        message={
          confirm
            ? `${confirm.type === 'in' ? "Enregistrer l'arrivée" : 'Enregistrer le départ'} de ${clientName(confirm.reservation)} pour la chambre N° ${confirm.reservation.room?.room_number} ?`
            : ''
        }
        confirmLabel="Valider"
        loading={busyId != null}
        onClose={() => setConfirm(null)}
        onConfirm={performAction}
      />

      {/* ── Confirmation d'encaissement du solde ──────────────────── */}
      <ConfirmModal
        open={!!cashTarget}
        title="Encaisser le solde de l'acompte"
        message={
          cashTarget
            ? `Confirmer l'encaissement en espèces du solde de ${formatXOF(cashTarget.remaining_amount ?? 0)} pour ${clientName(cashTarget)} (chambre N° ${cashTarget.room?.room_number}) ? L'arrivée sera ensuite débloquée.`
            : ''
        }
        confirmLabel="Encaisser le solde"
        loading={settling}
        onClose={() => setCashTarget(null)}
        onConfirm={handleSettle}
      />
    </div>
  );
}
