import {
  BedDouble, ArrowRightToLine, ShieldAlert, Sparkles, Calendar, Users,
  Banknote, MessageSquareWarning, BarChart2, Shield, Zap,
} from 'lucide-react';

/**
 * Données statiques et helper du formulaire admin (propriétaire) : groupes de
 * permissions, presets de rôles, types de pièce d'identité, recadrage photo.
 * Extraits de AdminFormPage pour alléger la page.
 */

/* ─── Permissions par groupe ──────────────────────────────────── */
export const PERMISSION_GROUPS = [
  {
    group: 'Hébergement',
    items: [
      {
        key: 'manage_rooms',
        label: 'Gestion des chambres',
        description: 'Créer, modifier et supprimer les chambres, types et tarifs.',
        Icon: BedDouble,
      },
      {
        key: 'manage_checkin_checkout',
        label: 'Arrivées & Départs',
        description: 'Valider les arrivées et départs des clients (réservations entièrement payées).',
        Icon: ArrowRightToLine,
      },
      {
        key: 'checkin_with_deposit',
        label: 'Arrivées/Départs - Acompte non soldé',
        description:
          'Voir les réservations avec acompte restant dû et encaisser le solde avant de valider l\'arrivée. ' +
          'Réservé au Manager et au Comptable. Nécessite le droit « Arrivées & Départs ».',
        Icon: ShieldAlert,
        warning: true,   // affichage spécial dans le formulaire
      },
      {
        key: 'manage_housekeeping',
        label: 'Ménage des chambres',
        description: "Suivre l'état ménage des chambres et marquer leur nettoyage.",
        Icon: Sparkles,
      },
    ],
  },
  {
    group: 'Réservations & Clients',
    items: [
      { key: 'manage_reservations', label: 'Gestion des réservations', description: 'Consulter, modifier et annuler les réservations.',           Icon: Calendar },
      { key: 'manage_clients',      label: 'Gestion des clients',      description: 'Accéder aux profils clients et modifier leurs informations.', Icon: Users },
    ],
  },
  {
    group: 'Finances',
    items: [
      { key: 'manage_payments', label: 'Paiements & Remboursements', description: 'Enregistrer les paiements espèces et gérer les remboursements.', Icon: Banknote },
    ],
  },
  {
    group: 'Service client',
    items: [
      { key: 'manage_complaints', label: 'Réclamations', description: 'Consulter les réclamations des clients et les marquer comme traitées.', Icon: MessageSquareWarning },
    ],
  },
  {
    group: 'Rapports & Audit',
    items: [
      { key: 'view_reports',       label: 'Rapports financiers',       description: "Consulter les statistiques de revenus, taux d'occupation, etc.", Icon: BarChart2 },
      { key: 'view_audit_summary', label: "Journal d'audit (résumé)",  description: 'Voir un résumé des actions réalisées - sans accès aux détails complets.', Icon: Shield },
      { key: 'view_reviews',       label: 'Consultation des avis',     description: 'Accéder à tous les avis clients, y compris les avis négatifs non publiés sur le site.', Icon: Zap },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

/* ─── Rôles ───────────────────────────────────────────────────── */
export const ROLES = [
  {
    value: 'manager',
    label: 'Manager',
    description: "Accès complet à la gestion opérationnelle de l'hôtel, y compris les acomptes.",
    // Manager voit tout, y compris checkin_with_deposit
    preset: ALL_PERMISSIONS,
  },
  {
    value: 'receptionist',
    label: 'Réceptionniste',
    description: 'Gère les arrivées, départs et réservations - uniquement pour réservations entièrement payées.',
    // Pas de checkin_with_deposit : le réceptionniste ne voit pas les réservations avec solde restant
    preset: ['manage_reservations', 'manage_clients', 'manage_checkin_checkout'],
  },
  {
    value: 'accountant',
    label: 'Comptable',
    description: 'Gère les finances, paiements et peut traiter les acomptes avant les arrivées/départs.',
    // Comptable peut voir et traiter les réservations avec acompte non soldé
    preset: ['manage_checkin_checkout', 'checkin_with_deposit', 'manage_payments', 'view_reports', 'view_audit_summary'],
  },
];

/* ─── Type de document ────────────────────────────────────────── */
export const ID_DOCUMENT_TYPES = [
  { value: '',             label: '- Choisir -' },
  { value: 'passport',     label: 'Passeport' },
  { value: 'national_id',  label: "Carte nationale d'identité" },
  { value: 'driver_license', label: 'Permis de conduire' },
];

/* ─── Recadrage carré 400×400 (même rendu net que le traitement serveur) ─
 * Évite l'aperçu flou : on recentre, recadre en carré puis on redimensionne
 * en 400×400 avec un lissage de qualité, et on renvoie un JPEG.
 */
export function cropImageToSquare(file, size = 400) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const min   = Math.min(img.naturalWidth, img.naturalHeight);
      const sx    = (img.naturalWidth  - min) / 2;
      const sy    = (img.naturalHeight - min) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('crop-failed')); return; }
          const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load-failed')); };
    img.src = url;
  });
}
