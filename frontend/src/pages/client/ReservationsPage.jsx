import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { reservationsApi } from '../../api/reservations.api';
import ReservationCard from '../../components/reservations/ReservationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function ReservationsPage() {
  const { data, loading, error, refetch } = useReservations();
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await reservationsApi.cancel(confirm.id);
      toast.success('Réservation annulée.');
      setConfirm(null);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Annulation impossible.");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes réservations</h1>
        <Link to="/rooms" className="btn-primary"><Plus className="h-4 w-4" /> Nouvelle</Link>
      </div>

      {loading ? <LoadingSpinner />
        : error ? <ErrorMessage message={error} onRetry={refetch} />
        : !data.length ? <EmptyState message="Aucune réservation pour le moment." ctaLabel="Réserver une chambre" ctaTo="/rooms" />
        : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                actions={
                  ['pending', 'confirmed'].includes(r.status) && (
                    <button className="btn-danger text-xs" onClick={() => setConfirm(r)}>Annuler</button>
                  )
                }
              />
            ))}
          </div>
        )}

      <ConfirmModal
        open={!!confirm}
        title="Annuler la réservation"
        message={`Voulez-vous vraiment annuler la réservation #${confirm?.id} ? Cette action est définitive.`}
        confirmLabel="Annuler la réservation"
        variant="danger"
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={cancel}
      />
    </div>
  );
}
