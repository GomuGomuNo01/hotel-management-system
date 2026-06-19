/**
 * ClientDetailDrawer - panneau latéral d'aperçu d'un client (admin).
 *
 * Suit la même implémentation que PdfViewerDrawer (convention du projet) :
 * glisse depuis la droite via transform, voile en fondu, z-[55]/[56] (sous le
 * lecteur PDF z-[60]/[61] pour pouvoir consulter les documents par-dessus),
 * ~50 % de l'écran, animation à l'ouverture ET à la fermeture.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Phone, MapPin, CalendarDays, Loader2, Globe,
  CheckCircle2, AlertCircle, Mail, IdCard, FileText,
  CalendarCheck, Wallet, Cake, Eye,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import AuthImage from '../common/AuthImage';
import { usePdfViewer } from '../../store/pdfViewerStore';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

const PROVIDER_LABELS = { local: 'Local', google: 'Google' };
const GENDER_LABELS   = { male: 'Homme', female: 'Femme', other: 'Autre' };
const DOC_TYPE_LABELS = {
  cni: "Carte nationale d'identité",
  national_id: "Carte nationale d'identité",
  passport: 'Passeport',
  passeport: 'Passeport',
  driver_license: 'Permis de conduire',
  permis: 'Permis de conduire',
  residence_permit: 'Titre de séjour',
};

/* Cellule d'info compacte - conçue pour un grid-cols-3 */
function InfoCell({ icon: Icon, label, value, span = 1 }) {
  const spanClass = span === 2 ? 'col-span-2' : span === 3 ? 'col-span-3' : '';
  return (
    <div className={`rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0 ${spanClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-800 break-words leading-snug">
        {value || <span className="text-slate-400 font-normal italic text-xs">-</span>}
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, tone = 'blue' }) {
  const tones = {
    blue:    'text-blue-700 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    amber:   'text-amber-700 bg-amber-50 border-amber-100',
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${tones[tone]}`}>
      <Icon className="h-4 w-4 mx-auto opacity-70" />
      <p className="text-lg font-extrabold tabular-nums mt-1 leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function ClientDetailDrawer({ clientId, onClose }) {
  const [client, setClient]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);

  // Transition d'entrée après montage
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fermeture animée : sortie puis démontage après 300 ms
  const handleClose = () => {
    setOpen(false);
    setTimeout(() => onClose?.(), 300);
  };

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    setLoading(true);
    adminApi.clients.get(clientId)
      .then((res) => { if (mounted) setClient(res?.data ?? res); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [clientId]);

  // Échap + blocage scroll (même convention que PdfViewerDrawer)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reservations = useMemo(() => client?.reservations ?? [], [client]);
  const initials     = `${client?.last_name?.[0] ?? ''}${client?.first_name?.[0] ?? ''}`.toUpperCase();
  const verified     = !!client?.email_verified_at;
  const idDocs       = client?.id_documents ?? [];
  const address      = [client?.address_line, client?.city].filter(Boolean).join(', ');

  const stats = useMemo(() => {
    const total      = typeof client?.reservations_count === 'number' ? client.reservations_count : reservations.length;
    const completed  = reservations.filter((r) => r.status === 'checked_out').length;
    // Total réglé net (paiements − remboursements), calculé côté serveur.
    // Repli sur la somme des paiements si le champ n'est pas (encore) fourni.
    const totalSpent = client?.total_paid != null
      ? Number(client.total_paid)
      : reservations.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);
    return { total, completed, totalSpent };
  }, [client, reservations]);

  // Ouvre un document d'identité dans le lecteur PDF latéral (z-[60]/[61])
  const openDoc = (doc) => {
    usePdfViewer.getState().view(
      doc.name || "Pièce d'identité",
      doc.name,
      () => adminApi.clients.idDocumentBlob(clientId, doc.path),
      'Document indisponible.',
    );
  };

  return createPortal(
    <>
      {/* Voile - z sous le lecteur PDF pour que celui-ci s'affiche par-dessus */}
      <div
        className={`fixed inset-0 z-[55] bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panneau */}
      <aside
        className={`fixed top-0 right-0 z-[56] h-full w-full md:w-1/2 bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Profil client"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <h2 className="font-semibold text-slate-800">Profil client</h2>
          <button onClick={handleClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : !client ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Client introuvable.</div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* ── Hero identité ──────────────────────────────────── */}
            <div className="bg-gradient-to-b from-slate-50 to-white px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                {client.profile_photo ? (
                  <img
                    src={client.profile_photo}
                    alt={client.full_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-extrabold border-2 border-blue-200 flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-900 leading-tight">{client.full_name}</p>
                  <p className="text-sm text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" /> {client.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {PROVIDER_LABELS[client.provider] ?? client.provider ?? 'Local'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {verified ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {verified ? 'E-mail vérifié' : 'Non vérifié'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats : 3 cartes côte à côte */}
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <StatCard icon={CalendarCheck} value={stats.total}                    label="Réservations"    tone="blue" />
                <StatCard icon={CheckCircle2}  value={stats.completed}                label="Séjours terminés" tone="emerald" />
                <StatCard icon={Wallet}        value={formatXOF(stats.totalSpent)}    label="Total réglé"     tone="amber" />
              </div>
            </div>

            <div className="p-5 space-y-6">

              {/* ── Coordonnées : grille 3 par ligne ───────────────── */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Coordonnées</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <InfoCell icon={Phone}       label="Téléphone"        value={client.phone} />
                  <InfoCell icon={MapPin}      label="Adresse"          value={address}      span={2} />
                  <InfoCell icon={Cake}        label="Date de naissance" value={client.date_of_birth ? formatDate(client.date_of_birth) : null} />
                  <InfoCell icon={Globe}       label="Genre"            value={GENDER_LABELS[client.gender]} />
                  <InfoCell icon={CalendarDays} label="Inscrit le"      value={formatDate(client.created_at)} />
                  {client.emergency_contact_name && (
                    <InfoCell
                      icon={Phone}
                      label="Contact d'urgence"
                      value={`${client.emergency_contact_name} - ${client.emergency_contact_phone ?? ''}`}
                      span={3}
                    />
                  )}
                </div>
              </div>

              {/* ── Pièce d'identité ────────────────────────────────── */}
              {(client.id_document_type || idDocs.length > 0) && (
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pièce d'identité</p>
                  {client.id_document_type && (
                    <div className="grid grid-cols-3 gap-2.5">
                      <InfoCell
                        icon={IdCard}
                        label="Type"
                        value={DOC_TYPE_LABELS[client.id_document_type] ?? client.id_document_type}
                        span={3}
                      />
                    </div>
                  )}
                  {idDocs.length > 0 && (
                    <div className="space-y-2.5">
                      {idDocs.map((doc, i) => {
                        const isImage = /\.(png|jpe?g|webp|gif|bmp)$/i.test(doc.name || doc.path || '');
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openDoc(doc)}
                            className="group block w-full text-left rounded-xl border border-slate-200 overflow-hidden hover:ring-2 hover:ring-blue-300 hover:border-blue-300 transition"
                            title={`Consulter ${doc.name}`}
                          >
                            {isImage ? (
                              <div className="relative bg-slate-100">
                                <AuthImage
                                  loader={() => adminApi.clients.idDocumentBlob(clientId, doc.path)}
                                  alt={doc.name}
                                  className="w-full max-h-72 object-contain"
                                />
                                <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/90 text-slate-700 border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition">
                                  <Eye className="h-3.5 w-3.5" /> Consulter
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 p-3">
                                <span className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-slate-700 truncate">{doc.name}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                                  <Eye className="h-3.5 w-3.5" /> Consulter
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}
