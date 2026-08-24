/**
 * ComplaintFormModal - formulaire de création d'une réclamation
 * liée à une réservation. Réutilisable depuis la modale de réservation
 * et la page « Service client ».
 *
 * Props :
 *  - reservation : { id, room?, check_in_date, check_out_date }
 *  - onClose()
 *  - onSubmitted(complaint)  - appelé après succès
 */
import { useEffect, useId, useRef, useState } from 'react';
import toast from '../../lib/toast';
import { MessageSquareWarning, X, Send, Hash } from 'lucide-react';
import { complaintApi, COMPLAINT_CATEGORIES } from '../../api/complaint.api';
import ModalPortal from '../common/ModalPortal';

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

export default function ComplaintFormModal({ reservation, onClose, onSubmitted }) {
  const [category, setCategory]   = useState('');
  const [subject, setSubject]     = useState('');
  const [message, setMessage]     = useState('');
  const [busy, setBusy]           = useState(false);

  const isOther = category === 'other';
  const room    = reservation?.room ?? {};

  const titleId   = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && !busy && onClose?.();
    document.addEventListener('keydown', onEsc);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onEsc);
  }, [busy, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category)               return toast.error('Veuillez choisir le type de problème.');
    if (isOther && !subject.trim()) return toast.error("Veuillez préciser l'objet.");
    if (message.trim().length < MIN_MESSAGE) {
      return toast.error(`Votre message doit contenir au moins ${MIN_MESSAGE} caractères.`);
    }

    setBusy(true);
    try {
      const res = await complaintApi.create(reservation.id, {
        category,
        custom_subject: isOther ? subject.trim() : undefined,
        message: message.trim(),
      });
      toast.success('Votre réclamation a bien été transmise.');
      onSubmitted?.(res.complaint);
    } catch (err) {
      toast.error(err?.response?.data?.message || "L'envoi a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[95vh] overflow-hidden flex flex-col shadow-2xl outline-none"
      >

        {/* En-tête */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 pt-5 pb-4 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-amber-100 text-xs mb-1">
                <Hash className="h-3 w-3" /> Réservation #{reservation?.id}
                {room.room_number && <span>· Chambre {room.room_number}</span>}
              </div>
              <h2 id={titleId} className="font-bold text-xl leading-tight flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5" /> Signaler un problème
              </h2>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Type de problème
            </label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
            >
              <option value="" disabled>Sélectionnez une catégorie…</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {isOther && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Objet <span className="font-normal text-slate-400">(précisez)</span>
              </label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Ex. : Objet oublié dans la chambre"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                disabled={busy}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Décrivez votre problème
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[120px] placeholder:text-slate-400"
              placeholder="Donnez un maximum de détails pour nous permettre de traiter rapidement votre demande…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE}
              disabled={busy}
            />
            <p className="text-xs text-slate-400 text-right">{message.length}/{MAX_MESSAGE}</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={busy}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Envoi…' : <><Send className="h-4 w-4" /> Envoyer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
