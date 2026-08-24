/**
 * Contrôle de taille des fichiers AVANT l'envoi.
 *
 * Sans ce garde-fou, l'utilisateur ne découvre le refus qu'après avoir soumis
 * le formulaire, via le message de validation brut du serveur
 * (« The id_documents.0 field must not be greater than 5120 kilobytes. »).
 *
 * ⚠️ Les limites doivent rester alignées sur les Form Requests du backend
 *    (app/Http/Requests/**) : les modifier ici seul ne change rien côté serveur.
 */
const BYTES_PER_MB = 1024 * 1024;

/** Photo de profil — owner, admin, client (`max:4096`). */
export const MAX_PHOTO_MB = 4;
/** Pièces d'identité d'un administrateur (`id_documents.*` → `max:5120`). */
export const MAX_ADMIN_DOC_MB = 5;
/** Pièces d'identité d'un client (`documents.*` → `max:25600`). */
export const MAX_CLIENT_DOC_MB = 25;
/** Photos d'une chambre (`images.*` → `max:5120`). */
export const MAX_ROOM_IMAGE_MB = 5;

const _size = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Taille lisible d'un fichier : « 8,2 Mo ». */
export const formatFileSize = (bytes) => `${_size.format((bytes ?? 0) / BYTES_PER_MB)} Mo`;

/**
 * Sépare une sélection de fichiers selon la limite de taille.
 *
 * @param   {FileList|File[]|null} files  Sélection issue d'un `<input type="file">`.
 * @param   {number}               maxMb  Limite, en Mo, par fichier.
 * @returns {{ accepted: File[], rejected: File[], error: string|null }}
 *          `error` est un message prêt à afficher, ou `null` si tout passe.
 */
export function filterOversized(files, maxMb) {
  const limit    = maxMb * BYTES_PER_MB;
  const list     = Array.from(files || []);
  const accepted = list.filter((f) => f.size <= limit);
  const rejected = list.filter((f) => f.size > limit);

  let error = null;
  if (rejected.length === 1) {
    error = `« ${rejected[0].name} » (${formatFileSize(rejected[0].size)}) dépasse la limite de ${maxMb} Mo par fichier.`;
  } else if (rejected.length > 1) {
    const names  = rejected.slice(0, 3).map((f) => f.name).join(', ');
    const others = rejected.length - 3;
    const extra  = others > 0 ? `, +${others} autre${others > 1 ? 's' : ''}` : '';
    error = `${rejected.length} fichiers dépassent la limite de ${maxMb} Mo : ${names}${extra}.`;
  }

  return { accepted, rejected, error };
}
