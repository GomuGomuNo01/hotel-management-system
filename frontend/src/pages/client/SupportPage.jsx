/**
 * SupportPage - /mon-espace/support
 *
 * Service client : le client consulte ses réclamations, suit leur statut
 * (Ouverte / Traitée), lit la réponse de l'équipe, annule une réclamation
 * encore ouverte, ou en crée une nouvelle (liée à une réservation).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from '../../lib/toast';
import {
  MessageSquareWarning, ArrowLeft, Plus, Clock, CheckCircle2,
  Trash2, BedDouble, Calendar, X, ChevronRight, LifeBuoy,
} from 'lucide-react';
import { complaintApi }       from '../../api/complaint.api';
import { reservationsApi }    from '../../api/reservations.api';
import { useComplaintBadge }  from '../../hooks/useComplaintBadge';
import { useAutoRefresh }     from '../../hooks/useAutoRefresh';
import { useAuth }            from '../../hooks/useAuth';
import ComplaintFormModal     from '../../components/complaints/ComplaintFormModal';
import ModalPortal            from '../../components/common/ModalPortal';
import ConfirmModal           from '../../components/common/ConfirmModal';
import LoadingSpinner         from '../../components/common/LoadingSpinner';
import { ttlCache }           from '../../lib/ttlCache';

const SUPPORT_CACHE_KEY = 'support|all';
const SUPPORT_TTL_MS    = 30_000;

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CFG = {
  open:    { label: 'Ouverte', icon: Clock,        cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  handled: { label: 'Traitée', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

/* ── Carte réclamation ───────────────────────────────────────────── */
function ComplaintCard({ complaint, onCancel, highlighted }) {
  const room = complaint.reservation?.room ?? {};
  return (
    <div
      id={`complaint-${complaint.id}`}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${
        highlighted ? 'border-orange-400 ring-2 ring-orange-500 ring-offset-2' : 'border-slate-200'
      }`}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm">{complaint.category_label}</h3>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Réservation #{complaint.reservation_id}</span>
              {room.room_number && <span>· Chambre {room.room_number}</span>}
              <span>· Envoyée le {formatDate(complaint.created_at)}</span>
            </p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
          {complaint.message}
        </p>

        {complaint.status === 'handled' && (
          <div className="rounded-xl p-3 border border-emerald-200 bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Réponse de notre équipe
              {complaint.handled_at && <span className="font-normal text-emerald-600">· {formatDate(complaint.handled_at)}</span>}
            </p>
            <p className="text-sm text-emerald-900 mt-1 leading-relaxed">
              {complaint.admin_response || 'Votre réclamation a été prise en compte et traitée par notre équipe.'}
            </p>
          </div>
        )}

        {complaint.status === 'open' && (
          <div className="flex justify-end">
            <button
              onClick={() => onCancel(complaint)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Annuler la réclamation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sélecteur de réservation (avant création) ───────────────────── */
function ReservationPicker({ reservations, onPick, onClose }) {
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Quelle réservation ?</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {reservations.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 px-4">
              Aucun séjour en cours. Vous ne pouvez signaler un problème que pendant votre séjour (entre l'arrivée et le départ).
            </p>
          ) : reservations.map((r) => (
            <button
              key={r.id}
              onClick={() => onPick(r)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <BedDouble className="h-5 w-5 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 text-sm">
                  Chambre {r.room?.room_number ?? '-'} <span className="text-slate-400 font-normal">· #{r.id}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function SupportPage() {
  const { user }                  = useAuth();
  const { refreshComplaintCount } = useComplaintBadge();
  const [complaints, setComplaints]     = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [picking, setPicking]           = useState(false);
  const [formReservation, setFormReservation] = useState(null);
  const [toCancel, setToCancel]         = useState(null);
  const [cancelling, setCancelling]     = useState(false);

  // Deep-link : cibler/surligner une réclamation depuis une notification
  const [searchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState(null);
  const didScroll = useRef(false);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await complaintApi.mine();
      setComplaints(data);
      ttlCache.delete(SUPPORT_CACHE_KEY); // la liste a changé → invalide le cache
    } catch {
      // silencieux
    }
  }, []);

  const loadAll = useCallback(async (bypassCache = false) => {
    // Stale-while-revalidate : affiche le cache instantanément, revalide en fond.
    let servedStale = false;
    if (!bypassCache) {
      const entry = ttlCache.peek(SUPPORT_CACHE_KEY);
      if (entry) {
        setComplaints(entry.value.complaints);
        setReservations(entry.value.reservations);
        setLoading(false);
        if (entry.fresh) return;
        servedStale = true;
      }
    }

    if (!servedStale) setLoading(true);
    try {
      const [list, resRes] = await Promise.all([
        complaintApi.mine(),
        reservationsApi.list().catch(() => null),
      ]);
      setComplaints(list);
      const resData = resRes?.data ?? resRes ?? [];
      // Réclamation possible uniquement pendant le séjour (statut check-in).
      const eligible = (Array.isArray(resData) ? resData : [])
        .filter((r) => r.status === 'checked_in');
      setReservations(eligible);
      ttlCache.set(SUPPORT_CACHE_KEY, { complaints: list, reservations: eligible }, SUPPORT_TTL_MS);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Défilement + surbrillance vers la réclamation ciblée une fois la liste chargée
  useEffect(() => {
    if (didScroll.current || loading) return;
    const complaintId = searchParams.get('complaintId');
    if (!complaintId) return;
    const el = document.getElementById(`complaint-${complaintId}`);
    if (!el) return;
    didScroll.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(`complaint-${complaintId}`);
    const t = setTimeout(() => setHighlightId(null), 2800);
    return () => clearTimeout(t);
  }, [loading, complaints, searchParams]);

  // Temps-réel : réclamation traitée par l'équipe
  useAutoRefresh(
    ['complaint.handled', 'complaint.created'],
    () => { loadComplaints(); refreshComplaintCount(); },
    { filter: (p) => !p.clientId || p.clientId === user?.id },
  );

  const handleSubmitted = () => {
    setFormReservation(null);
    loadComplaints();
    refreshComplaintCount();
  };

  const handleCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await complaintApi.remove(toCancel.id);
      toast.success('Réclamation annulée.');
      setComplaints((prev) => prev.filter((c) => c.id !== toCancel.id));
      ttlCache.delete(SUPPORT_CACHE_KEY);
      refreshComplaintCount();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Impossible d\'annuler la réclamation. Réessayez.');
    } finally {
      setCancelling(false);
      setToCancel(null);
    }
  };

  const openCount = complaints.filter((c) => c.status === 'open').length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <div>
        <Link
          to="/mon-espace"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 flex items-center gap-2.5">
              <LifeBuoy className="h-7 w-7 text-orange-500" />
              Service client
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Un souci sur une réservation ? Signalez-le, notre équipe vous répond.
            </p>
          </div>
          <button
            onClick={() => setPicking(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouvelle réclamation
          </button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <LoadingSpinner />
      ) : complaints.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <MessageSquareWarning className="h-8 w-8 text-orange-400" />
          </div>
          <p className="font-bold text-slate-900">Aucune réclamation</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            Tout va bien pour le moment ! En cas de problème sur une réservation, créez une réclamation.
          </p>
          <button
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouvelle réclamation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {openCount > 0 && (
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{openCount}</span> réclamation{openCount > 1 ? 's' : ''} en cours de traitement.
            </p>
          )}
          {complaints.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              onCancel={setToCancel}
              highlighted={highlightId === `complaint-${c.id}`}
            />
          ))}
        </div>
      )}

      {/* Sélecteur de réservation */}
      {picking && (
        <ReservationPicker
          reservations={reservations}
          onClose={() => setPicking(false)}
          onPick={(r) => { setPicking(false); setFormReservation(r); }}
        />
      )}

      {/* Formulaire de réclamation */}
      {formReservation && (
        <ComplaintFormModal
          reservation={formReservation}
          onClose={() => setFormReservation(null)}
          onSubmitted={handleSubmitted}
        />
      )}

      {/* Confirmation d'annulation */}
      <ConfirmModal
        open={!!toCancel}
        title="Annuler la réclamation"
        message="Voulez-vous vraiment supprimer cette réclamation ? Cette action est définitive."
        confirmLabel="Oui, annuler"
        variant="danger"
        loading={cancelling}
        onClose={() => setToCancel(null)}
        onConfirm={handleCancel}
      />
    </div>
  );
}
