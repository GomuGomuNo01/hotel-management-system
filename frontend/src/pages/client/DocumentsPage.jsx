/**
 * DocumentsPage - « Mes documents »
 *
 * Reçus & factures + suivi des remboursements.
 * UI redesignée : liste simple, cartes enrichies avec refs DocumentRef,
 * consultation PDF inline des reçus/factures et des reçus de remboursement.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download, FileText, RotateCcw, Clock, CheckCircle2, XCircle,
  FolderOpen, Eye, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileCheck, FileMinus,
} from 'lucide-react';
import { useReservations }  from '@/hooks/useReservations.js';
import { useAutoRefresh }   from '@/hooks/useAutoRefresh.js';
import { useAuth }          from '@/hooks/useAuth.js';
import { useDocumentBadge } from '@/hooks/useDocumentBadge.js';
import { usePdfViewer }     from '@/store/pdfViewerStore.js';
import { refundsApi }       from '@/api/refunds.api.js';
import { downloadReceipt, downloadInvoice, viewReceipt, viewInvoice } from '../../components/reservations/ReservationModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState     from '../../components/common/EmptyState';
import { formatXOF }  from '@/utils/formatCurrency.js';
import { formatDate } from '@/utils/formatDate.js';

/* ── Config statuts remboursement ───────────────────────────────── */
const REFUND_CFG = {
  pending:  {
    label: 'En cours de traitement',
    Icon: Clock,
    cardCls: 'border-amber-200 bg-amber-50/40',
    badgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  approved: {
    label: 'Remboursement effectué',
    Icon: CheckCircle2,
    cardCls: 'border-emerald-200 bg-emerald-50/30',
    badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  rejected: {
    label: 'Demande refusée',
    Icon: XCircle,
    cardCls: 'border-red-200 bg-red-50/30',
    badgeCls: 'bg-red-100 text-red-800 border-red-200',
  },
};

const CATEGORY_OPTIONS = [
  { value: 'all',     label: 'Tout' },
  { value: 'docs',    label: 'Reçus & factures' },
  { value: 'refunds', label: 'Remboursements' },
];

const PER_PAGE = 6;

/** Normalise une date en 'YYYY-MM-DD' pour comparaison. */
const toYmd = (d) => (d ? String(d).slice(0, 10) : '');

/* ── Section repliable ──────────────────────────────────────────── */
function CollapsibleSection({ icon: Icon, title, count, open, onToggle, children }) {
  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 mb-3 group"
      >
        <span className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Icon className="h-4.5 w-4.5 text-slate-400" />
          {title}
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {count}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform group-hover:text-slate-600 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </section>
  );
}

/* ── Pagination compacte ────────────────────────────────────────── */
function Paginator({ page, lastPage, total, onPage }) {
  if (lastPage <= 1 && total <= PER_PAGE) return null;
  return (
    <div className="flex items-center justify-between pt-3 px-1">
      <span className="text-xs text-slate-500">
        Page <span className="font-semibold">{page}</span> sur{' '}
        <span className="font-semibold">{lastPage}</span>
        <span className="ml-1.5 text-slate-400">· {total} document{total !== 1 ? 's' : ''}</span>
      </span>
      <div className="flex items-center gap-0.5">
        <button className="btn-ghost h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPage(1)} title="Première page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button className="btn-ghost h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPage(page - 1)} title="Précédent">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button className="btn-ghost h-7 w-7 p-0" disabled={page >= lastPage} onClick={() => onPage(page + 1)} title="Suivant">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button className="btn-ghost h-7 w-7 p-0" disabled={page >= lastPage} onClick={() => onPage(lastPage)} title="Dernière page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { user }        = useAuth();
  const { markDocsRead } = useDocumentBadge();
  const { data: reservations, loading, refetch } = useReservations();
  const viewPdf = usePdfViewer((s) => s.view);

  const [refunds, setRefunds]               = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(true);

  // Filtres
  const [query, setQuery]         = useState('');
  const [category, setCategory]   = useState('all');
  const [arrival, setArrival]     = useState('');
  const [departure, setDeparture] = useState('');

  // Pagination locale
  const [docPage, setDocPage]       = useState(1);
  const [refundPage, setRefundPage] = useState(1);

  // Sections repliables
  const [openDocs, setOpenDocs]       = useState(true);
  const [openRefunds, setOpenRefunds] = useState(true);

  // Deep-link
  const [searchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState(null);
  const didScroll = useRef(false);

  /** Téléchargement PDF d'un document de remboursement (reçu ou avis de refus). */
  const downloadRefundDoc = async (id, refRef) => {
    try {
      const blob = await refundsApi.receiptBlob(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${refRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* silencieux */ }
  };

  const loadRefunds = async () => {
    setRefundsLoading(true);
    try { setRefunds(await refundsApi.listMine()); }
    catch { /* silencieux */ }
    finally { setRefundsLoading(false); }
  };

  useEffect(() => { loadRefunds(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- marquage « lu » une seule fois au montage
  useEffect(() => { markDocsRead();   }, []);

  useAutoRefresh(
    ['checkout.done', 'payment.confirmed', 'refund.processed', 'refund.requested', 'reservation.cancelled'],
    () => { refetch(); loadRefunds(); },
    { filter: (payload) => !payload.clientId || payload.clientId === user?.id },
  );

  const allDocs = useMemo(
    () => reservations.filter((r) => r.has_receipt || r.has_invoice),
    [reservations],
  );

  const matchesDates = useCallback((checkIn, checkOut) => {
    if (arrival   && toYmd(checkIn)  < arrival)   return false;
    if (departure && toYmd(checkOut) > departure)  return false;
    return true;
  }, [arrival, departure]);

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDocs.filter((r) => {
      if (!matchesDates(r.check_in_date, r.check_out_date)) return false;
      if (q) {
        const room = String(r.room?.room_number ?? '').toLowerCase();
        const type = String(r.room?.room_type   ?? '').toLowerCase();
        const ref  = String(r.receipt_ref ?? r.id ?? '').toLowerCase();
        if (!room.includes(q) && !type.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [allDocs, query, matchesDates]);

  const filteredRefunds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return refunds.filter((rf) => {
      if (!matchesDates(rf.reservation?.check_in_date, rf.reservation?.check_out_date)) return false;
      if (q) {
        const room = String(rf.reservation?.room?.room_number ?? '').toLowerCase();
        const id   = String(rf.reservation_id ?? '');
        if (!room.includes(q) && !id.includes(q)) return false;
      }
      return true;
    });
  }, [refunds, query, matchesDates]);

  // Reset pagination quand les filtres changent
  useEffect(() => { setDocPage(1); setRefundPage(1); }, [query, category, arrival, departure]);

  const hasActiveFilters = query.trim() || category !== 'all' || arrival || departure;
  const resetFilters = () => { setQuery(''); setCategory('all'); setArrival(''); setDeparture(''); };

  const showDocs    = category !== 'refunds';
  const showRefunds = category !== 'docs';

  // Deep-link : défilement
  useEffect(() => {
    if (didScroll.current || loading || refundsLoading) return;
    const refundId      = searchParams.get('refundId');
    const reservationId = searchParams.get('reservationId');
    const targetId = refundId ? `refund-${refundId}` : reservationId ? `doc-${reservationId}` : null;
    if (!targetId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(targetId);
      if (!el) return;
      didScroll.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(targetId);
      setTimeout(() => setHighlightId(null), 2800);
    }, 350);
    return () => clearTimeout(t);
  }, [loading, refundsLoading, searchParams]);

  /* ── Doc card ────────────────────────────────────────────────── */
  const renderDoc = (r) => {
    const isCancelled = r.status === 'cancelled';
    const docRef = r.receipt_ref ?? `${isCancelled ? 'ANN' : 'RES'}-${String(r.id).padStart(6, '0')}`;
    const invRef = r.invoice_ref ?? null;

    return (
      <div
        key={r.id}
        id={`doc-${r.id}`}
        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
          highlightId === `doc-${r.id}` ? 'border-brand-400 ring-2 ring-brand-300 ring-offset-1' : 'border-slate-200'
        }`}
      >
        {/* Bande colorée gauche */}
        <div className="flex">
          <div className={`w-1 flex-shrink-0 ${isCancelled ? 'bg-red-400' : 'bg-brand-500'}`} />
          <div className="flex-1 p-4">

            {/* Ligne 1 : ref + chambre + badge annulée */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  isCancelled
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-brand-50 text-brand-700 border-brand-100'
                }`}>
                  {docRef}
                </span>
                {r.room?.room_number && (
                  <span className="text-sm font-semibold text-slate-800">
                    Chambre {r.room.room_number}
                  </span>
                )}
                {r.room?.room_type && (
                  <span className="text-xs text-slate-500 capitalize">{r.room.room_type}</span>
                )}
              </div>
              {isCancelled && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  Annulée
                </span>
              )}
            </div>

            {/* Ligne 2 : dates */}
            <p className="text-xs text-slate-500 mb-3">
              {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Reçu */}
              {r.has_receipt && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => viewReceipt(r.id)} className="btn-secondary text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {isCancelled ? "Avis d'annulation" : 'Reçu'}
                  </button>
                  <button
                    onClick={() => downloadReceipt(r.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      isCancelled
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Télécharger"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Séparateur si les deux */}
              {r.has_receipt && r.has_invoice && (
                <span className="w-px h-5 bg-slate-200 mx-0.5" />
              )}

              {/* Facture */}
              {r.has_invoice && (
                <div className="flex items-center gap-1.5">
                  {invRef && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">
                      {invRef}
                    </span>
                  )}
                  <button onClick={() => viewInvoice(r.id)} className="btn-secondary text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Facture
                  </button>
                  <button
                    onClick={() => downloadInvoice(r.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200 transition-colors"
                    title="Télécharger"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── Refund card ─────────────────────────────────────────────── */
  const renderRefund = (rf) => {
    const cfg        = REFUND_CFG[rf.status] || REFUND_CFG.pending;
    const Icon       = cfg.Icon;
    const isApproved = rf.status === 'approved';
    const isRejected = rf.status === 'rejected';
    const hasDoc     = isApproved || isRejected;
    const refRef     = `RMB-${String(rf.id).padStart(6, '0')}`;

    return (
      <div
        key={rf.id}
        id={`refund-${rf.id}`}
        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
          highlightId === `refund-${rf.id}` ? 'ring-2 ring-brand-300 ring-offset-1 border-brand-300' : cfg.cardCls
        }`}
      >
        <div className="flex">
          <div className={`w-1 flex-shrink-0 ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-red-400' : 'bg-amber-400'}`} />
          <div className="flex-1 p-4">

            {/* Ligne 1 : ref + statut + montant */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                  {refRef}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.badgeCls}`}>
                  <Icon className="h-3.5 w-3.5" /> {cfg.label}
                </span>
              </div>
              <span className="font-bold text-slate-900">{formatXOF(rf.amount)}</span>
            </div>

            {/* Ligne 2 : réservation + dates */}
            <p className="text-xs text-slate-500 mb-1">
              {rf.reservation?.room?.room_number && (
                <span>Chambre {rf.reservation.room.room_number} · </span>
              )}
              Demandé le {formatDate(rf.created_at)}
              {rf.processed_at && <span> · Traité le {formatDate(rf.processed_at)}</span>}
            </p>

            {/* Note admin (si refusé) */}
            {isRejected && rf.admin_notes && (
              <p className="text-xs mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-800">
                <span className="font-semibold">Motif : </span>{rf.admin_notes}
              </p>
            )}
            {isApproved && rf.admin_notes && (
              <p className="text-xs mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-emerald-800">
                <span className="font-semibold">Note : </span>{rf.admin_notes}
              </p>
            )}

            {/* Action : voir + télécharger le document */}
            {hasDoc && (
              <div className="mt-3 flex items-center gap-1.5">
                {/* Bouton Voir */}
                <button
                  onClick={() =>
                    viewPdf(
                      isApproved ? `Reçu de remboursement ${refRef}` : `Avis de refus ${refRef}`,
                      `${refRef}.pdf`,
                      () => refundsApi.receiptBlob(rf.id),
                      'Impossible de charger le document.',
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isApproved
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                  }`}
                >
                  {isApproved
                    ? <><FileCheck className="h-3.5 w-3.5" /> Voir le reçu de remboursement</>
                    : <><FileMinus className="h-3.5 w-3.5" /> Voir l'avis de refus</>
                  }
                </button>

                {/* Bouton Télécharger */}
                <button
                  onClick={() => downloadRefundDoc(rf.id, refRef)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isApproved
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                  }`}
                  title="Télécharger le document"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Données paginées ────────────────────────────────────────── */
  const docLastPage    = Math.max(1, Math.ceil(docs.length / PER_PAGE));
  const refundLastPage = Math.max(1, Math.ceil(filteredRefunds.length / PER_PAGE));
  const pagedDocs    = docs.slice((docPage - 1) * PER_PAGE, docPage * PER_PAGE);
  const pagedRefunds = filteredRefunds.slice((refundPage - 1) * PER_PAGE, refundPage * PER_PAGE);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── En-tête ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <span className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mes documents</h1>
          <p className="text-sm text-slate-500">Reçus, factures et remboursements.</p>
        </div>
      </div>

      {/* ── Barre de filtres simplifiée ─────────────────────── */}
      <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center gap-2">

        {/* Catégorie */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {CATEGORY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setCategory(o.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                category === o.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chambre, type, référence…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        {/* Période (optionnel, plus discret) */}
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="date"
            value={arrival}
            max={departure || undefined}
            onChange={(e) => setArrival(e.target.value)}
            title="Arrivée à partir de"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-34"
          />
          <span className="text-slate-400 text-xs">→</span>
          <input
            type="date"
            value={departure}
            min={arrival || undefined}
            onChange={(e) => setDeparture(e.target.value)}
            title="Départ jusqu'au"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-34"
          />
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Reçus & factures ────────────────────────────────── */}
      {showDocs && (
        <CollapsibleSection
          icon={FileText}
          title="Reçus & factures"
          count={docs.length}
          open={openDocs}
          onToggle={() => setOpenDocs((o) => !o)}
        >
          {loading ? (
            <LoadingSpinner />
          ) : !allDocs.length ? (
            <EmptyState
              message="Aucun document pour le moment. Vos reçus apparaîtront après votre premier paiement."
              ctaLabel="Voir mes réservations"
              ctaTo="/mon-espace/reservations"
            />
          ) : !docs.length ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
              Aucun document ne correspond à ces filtres.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {pagedDocs.map(renderDoc)}
              </div>
              <Paginator
                page={docPage}
                lastPage={docLastPage}
                total={docs.length}
                onPage={setDocPage}
              />
            </>
          )}
        </CollapsibleSection>
      )}

      {/* ── Remboursements ──────────────────────────────────── */}
      {showRefunds && (
        <CollapsibleSection
          icon={RotateCcw}
          title="Remboursements"
          count={filteredRefunds.length}
          open={openRefunds}
          onToggle={() => setOpenRefunds((o) => !o)}
        >
          {refundsLoading ? (
            <LoadingSpinner />
          ) : !refunds.length ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
              Aucune demande de remboursement.
            </p>
          ) : !filteredRefunds.length ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
              Aucun remboursement ne correspond à ces filtres.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {pagedRefunds.map(renderRefund)}
              </div>
              <Paginator
                page={refundPage}
                lastPage={refundLastPage}
                total={filteredRefunds.length}
                onPage={setRefundPage}
              />
            </>
          )}
        </CollapsibleSection>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Retrouvez aussi vos documents sur chaque{' '}
        <Link to="/mon-espace/reservations" className="text-brand-600 hover:underline">réservation</Link>.
      </p>
    </div>
  );
}
