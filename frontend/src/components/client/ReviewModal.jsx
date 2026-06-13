/**
 * ReviewModal - Formulaire de notation d'un séjour.
 *
 * Props :
 *   reservation  – objet réservation (id, room.room_number, room.room_type)
 *   onClose()    – ferme la modale sans rien faire
 *   onSubmitted(review) – appelé après soumission réussie
 */
import { useState } from 'react';
import { Star, X, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewApi } from '../../api/review.api';
import ModalPortal from '../common/ModalPortal';

const LABELS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent !'];
const COLORS  = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-emerald-500'];

function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none disabled:cursor-default transition-transform hover:scale-110"
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`h-9 w-9 transition-colors ${
              n <= display
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-slate-100 text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewModal({ reservation, onClose, onSubmitted }) {
  const [rating,      setRating]      = useState(0);
  const [comment,     setComment]     = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const room = reservation?.room ?? {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Veuillez choisir une note avant de valider.'); return; }

    setSubmitting(true);
    try {
      const res = await reviewApi.submit(reservation.id, { rating, comment: comment.trim() || null });
      toast.success('Merci pour votre avis ! 🎉');
      onSubmitted?.(res.review);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Une erreur est survenue, réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">

        {/* En-tête */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">
              Votre avis sur votre séjour
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Chambre {room.room_number}
              {room.room_type && <span className="capitalize"> - {room.room_type}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Étoiles */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Quelle note donnez-vous à ce séjour ?
            </p>
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} disabled={submitting} />
            </div>
            {rating > 0 && (
              <p className={`text-sm font-semibold ${COLORS[rating]}`}>
                {LABELS[rating]}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              Votre commentaire <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-400"
              placeholder="Partagez votre expérience : accueil, propreté, confort…"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{comment.length}/1000</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 btn-secondary"
            >
              Plus tard
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {submitting
                ? 'Envoi…'
                : <><Send className="h-4 w-4" /> Envoyer mon avis</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
