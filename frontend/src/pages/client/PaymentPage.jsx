import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Download, CheckCircle2 } from 'lucide-react';
import { reservationsApi } from '../../api/reservations.api';
import { paymentsApi } from '../../api/payments.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import PaymentStatusBanner from '../../components/payments/PaymentStatusBanner';
import { formatXOF } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState('orange_ci');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [payment, setPayment] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    reservationsApi.get(id)
      .then((r) => setReservation(r?.data ?? r))
      .catch(() => toast.error('Réservation introuvable.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!payment || payment.status !== 'pending') return;
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await paymentsApi.status(payment.id);
        const p = res?.data ?? res;
        setPayment(p);
        if (p.status !== 'pending') {
          clearInterval(interval);
          setPolling(false);
          if (p.status === 'success') toast.success('Paiement confirmé ! 🎉');
          if (p.status === 'failed') toast.error('Le paiement a échoué.');
        }
      } catch (e) { /* keep polling */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [payment]);

  const initiate = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Numéro de téléphone requis.');
    setSubmitting(true);
    try {
      const res = await paymentsApi.initiate({
        reservation_id: reservation.id,
        provider,
        phone_number: phone,
      });
      const p = res?.data ?? res;
      setPayment({ ...p, status: p.status || 'pending' });
      toast('Confirmez le paiement sur votre téléphone.', { icon: '📱' });
    } catch (err) {
      if (err.response?.status !== 422) toast.error(err.response?.data?.message || 'Initiation impossible.');
    } finally { setSubmitting(false); }
  };

  const downloadInvoice = async () => {
    try {
      const blob = await paymentsApi.invoiceBlob(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `facture-${payment.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Téléchargement impossible.'); }
  };

  if (loading) return <LoadingSpinner label="Chargement…" />;
  if (!reservation) return <p className="text-center py-10 text-gray-500">Réservation introuvable.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      <h1 className="text-2xl font-bold">Paiement de la réservation</h1>

      <div className="card card-pad">
        <h2 className="font-semibold mb-3">Récapitulatif</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <p>Chambre <strong>N° {reservation.room?.room_number}</strong> ({reservation.room?.room_type})</p>
          <p>Du {formatDate(reservation.check_in_date)} au {formatDate(reservation.check_out_date)}</p>
          <p className="text-lg font-bold text-brand-600 mt-2">{formatXOF(reservation.total_amount)}</p>
        </div>
      </div>

      {!payment ? (
        <form onSubmit={initiate} className="card card-pad space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Moyen de paiement</h2>
            <PaymentMethodSelector value={provider} onChange={setProvider} />
          </div>
          <div>
            <label className="label">Numéro de téléphone</label>
            <input className="input" placeholder="+225 07 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Payer maintenant
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <PaymentStatusBanner status={payment.status} />
          {payment.status === 'success' && (
            <div className="card card-pad text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="font-medium">Votre paiement a été confirmé.</p>
              <div className="flex justify-center gap-2">
                <button onClick={downloadInvoice} className="btn-primary"><Download className="h-4 w-4" /> Télécharger la facture</button>
                <button onClick={() => navigate('/mon-espace/reservations')} className="btn-secondary">Mes réservations</button>
              </div>
            </div>
          )}
          {payment.status === 'failed' && (
            <button className="btn-primary" onClick={() => setPayment(null)}>Réessayer</button>
          )}
          {polling && payment.status === 'pending' && (
            <p className="text-xs text-center text-gray-500">Vérification automatique toutes les 5 secondes…</p>
          )}
        </div>
      )}
    </div>
  );
}
