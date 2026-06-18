import { useState } from 'react';
import {
  LogIn as CheckInIcon, LogOut as CheckOutIcon, CalendarCheck,
  Wallet, RotateCcw, CreditCard, MessageSquareWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi }          from '../../api/admin.api';
import { useAuth }           from '../../hooks/useAuth';
import { useAutoRefresh }    from '../../hooks/useAutoRefresh';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { useUiStore }        from '../../store/uiStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage   from '../../components/common/ErrorMessage';
import ConfirmModal   from '../../components/common/ConfirmModal';
import ReceptionistView from '../../components/admin/dashboard/ReceptionistView';
import AccountantView   from '../../components/admin/dashboard/AccountantView';
import ManagerView      from '../../components/admin/dashboard/ManagerView';

/* ══════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE — sélectionne la vue selon le rôle.
   Les vues (Réceptionniste/Comptable/Manager) et leurs sections sont
   extraites dans components/admin/dashboard/.
══════════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const { user }        = useAuth();
  const { badgeCounts } = useUiStore();

  const { data, loading, error, refetch } = useAdminDashboard();
  const [actioning, setActioning] = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  // Rafraîchissement automatique sur événements métier
  useAutoRefresh(
    ['reservation.created', 'reservation.cancelled', 'payment.confirmed',
     'checkin.done', 'checkout.done', 'refund.requested', 'refund.processed'],
    () => refetch(),
    { debounceMs: 1000 },
  );

  const performAction = async () => {
    if (!confirm) return;
    setActioning(confirm.reservation.id);
    try {
      if (confirm.type === 'in') await adminApi.checkIn(confirm.reservation.id);
      else                       await adminApi.checkOut(confirm.reservation.id);
      toast.success(
        confirm.type === 'in'
          ? `Chambre N° ${confirm.reservation.room?.room_number} - arrivée enregistrée.`
          : `Chambre N° ${confirm.reservation.room?.room_number} libérée. La facture a été envoyée.`,
      );
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "L'opération a échoué. Réessayez.");
    } finally {
      setActioning(null);
      setConfirm(null);
    }
  };

  if (loading && !data) return <LoadingSpinner label="Chargement du tableau de bord…" />;
  if (error   && !data) return <ErrorMessage message={error} onRetry={refetch} />;

  const k    = data?.kpi ?? {};
  const role = user?.role;

  // Vérification des permissions (pour le Manager)
  const perms = new Set(user?.permissions ?? []);
  const can   = (p) => perms.has(p);

  // Alertes urgentes (ManagerView uniquement)
  const alerts = [
    can('manage_checkin_checkout') && (k.today_check_ins ?? 0) > 0 && {
      count: k.today_check_ins, label: "Arrivées aujourd'hui", sublabel: 'Clients attendus à enregistrer',
      icon: CheckInIcon, color: 'emerald', to: '/admin/checkin-checkout',
    },
    can('manage_checkin_checkout') && (k.today_check_outs ?? 0) > 0 && {
      count: k.today_check_outs, label: "Départs aujourd'hui", sublabel: 'Chambres à libérer',
      icon: CheckOutIcon, color: 'violet', to: '/admin/checkin-checkout',
    },
    can('manage_reservations') && (k.pending_reservations ?? 0) > 0 && {
      count: k.pending_reservations, label: 'Réservations non confirmées', sublabel: "En attente d'une action",
      icon: CalendarCheck, color: 'blue', to: '/admin/reservations',
    },
    can('manage_payments') && (k.pending_balances ?? 0) > 0 && {
      count: k.pending_balances, label: 'Soldes à encaisser', sublabel: 'Clients avec acompte non soldé',
      icon: Wallet, color: 'amber', to: '/admin/checkin-checkout',
    },
    can('manage_payments') && (k.pending_refunds ?? 0) > 0 && {
      count: k.pending_refunds, label: 'Remboursements à traiter', sublabel: "Clients en attente d'une réponse",
      icon: RotateCcw, color: 'orange', to: '/admin/remboursements',
    },
    can('manage_payments') && (k.pending_payments ?? 0) > 0 && {
      count: k.pending_payments, label: 'Paiements non confirmés', sublabel: 'Transactions mobile en attente',
      icon: CreditCard, color: 'red', to: '/admin/remboursements',
    },
    can('manage_complaints') && (badgeCounts.complaints ?? 0) > 0 && {
      count: badgeCounts.complaints, label: 'Réclamations ouvertes', sublabel: "Clients en attente d'une réponse",
      icon: MessageSquareWarning, color: 'orange', to: '/admin/reclamations',
    },
  ].filter(Boolean);

  const commonProps = { user, k, data, actioning, setConfirm };

  const modal = (
    <ConfirmModal
      open={!!confirm}
      title={confirm?.type === 'in' ? "Confirmer l'arrivée" : 'Confirmer le départ'}
      message={confirm
        ? `Enregistrer ${confirm.type === 'in' ? "l'arrivée" : 'le départ'} de ${
            confirm.reservation.client?.full_name
            ?? confirm.reservation.client?.first_name
            ?? 'ce client'
          } - Chambre N° ${confirm.reservation.room?.room_number} ?`
        : ''}
      confirmLabel="Valider"
      loading={!!actioning}
      onConfirm={performAction}
      onClose={() => setConfirm(null)}
    />
  );

  /* ── Réceptionniste ── */
  if (role === 'receptionist') {
    return <><ReceptionistView {...commonProps} />{modal}</>;
  }

  /* ── Comptable ── */
  if (role === 'accountant') {
    return <><AccountantView {...commonProps} />{modal}</>;
  }

  /* ── Manager (défaut) ── */
  return (
    <>
      <ManagerView {...commonProps} badgeCounts={badgeCounts} alerts={alerts} can={can} />
      {modal}
    </>
  );
}
