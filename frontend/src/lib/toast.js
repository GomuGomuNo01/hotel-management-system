/**
 * Notifications — durée d'affichage proportionnelle au temps de lecture.
 *
 * Une durée fixe traite « Chambre créée. » et « Le compte de X a été créé. Les
 * identifiants de connexion ont été envoyés par e-mail. » de la même façon :
 * trop long pour la première, trop court pour la seconde. On calcule donc la
 * durée à partir du nombre de mots, bornée pour rester prévisible.
 *
 * Ce module remplace l'import direct de `react-hot-toast` dans l'application ;
 * il en réexporte toute l'API (`dismiss`, `promise`, `loading`, `custom`…).
 * Seul main.jsx importe la bibliothèque directement, pour monter le <Toaster/>.
 *
 * À noter : react-hot-toast met le compte à rebours en pause au survol de la
 * pile de notifications — une bulle lue à moitié ne disparaît pas sous le
 * curseur, et le bouton « ✕ » reste toujours disponible.
 */
import baseToast from 'react-hot-toast';

/** Vitesse de lecture retenue : ~200 mots/minute, soit 300 ms par mot. */
const MS_PER_WORD = 300;

/** Délai de perception : repérer la bulle et y porter le regard. */
const NOTICE_MS = 1500;

/** Bornes par type — un message court reste lisible, un long ne s'éternise pas. */
const BOUNDS = {
  // Confirmation d'une action que l'utilisateur vient de déclencher.
  success: { min: 4000,  max: 10000 },
  // Une erreur demande une décision : on laisse davantage de temps.
  error:   { min: 6000,  max: 12000 },
  // Message neutre (toast() sans type).
  blank:   { min: 4000,  max: 10000 },
};

const clamp = (value, { min, max }) => Math.min(Math.max(value, min), max);

/**
 * Durée de lecture confortable d'un message, en millisecondes.
 * Les messages non textuels (JSX de `toast.custom`) retombent sur le plancher.
 */
export function readingTime(message, type = 'blank') {
  const bounds = BOUNDS[type] ?? BOUNDS.blank;
  if (typeof message !== 'string') return bounds.min;

  const words = message.trim().split(/\s+/).filter(Boolean).length;
  return clamp(NOTICE_MS + words * MS_PER_WORD, bounds);
}

/** Complète les options d'un toast avec sa durée de lecture, sauf durée explicite. */
const withReadingTime = (message, options, type) => ({
  ...options,
  duration: options?.duration ?? readingTime(message, type),
});

/**
 * `toast` enrichi : même API que react-hot-toast, durée calculée par défaut.
 * Une `duration` passée à l'appel reste prioritaire.
 */
const toast = Object.assign(
  (message, options) => baseToast(message, withReadingTime(message, options, 'blank')),
  baseToast, // dismiss, remove, promise, loading, custom…
  {
    success: (message, options) => baseToast.success(message, withReadingTime(message, options, 'success')),
    error:   (message, options) => baseToast.error(message, withReadingTime(message, options, 'error')),
  },
);

export default toast;
