/**
 * Identité de marque — source unique de vérité.
 *
 * Le nom est surchargeable par environnement via VITE_APP_NAME ; à défaut, on
 * retombe sur « Hospy ». Centraliser ici évite les libellés codés en dur
 * dispersés dans la navbar, les sidebars, le footer et le titre d'onglet.
 *
 * Toute surface affichant la marque doit lire BRAND — jamais une chaîne en dur.
 */
export const BRAND = {
  name: import.meta.env.VITE_APP_NAME || 'Hospy',
  tagline: 'La gestion hôtelière, simplifiée.',
  /** Descriptif court — méta description, écrans d'accueil. */
  description:
    "Le PMS moderne des hôtels de Côte d'Ivoire et d'Afrique francophone : réservations, séjours, ménage et paiements réunis.",
  /** Monogramme du logo — doit rester lisible à 16 px (favicon, avatars). */
  monogram: 'H',
};

/** Couleur de marque (brand-500) — usages hors Tailwind : graphiques, theme-color. */
export const BRAND_COLOR = '#2F9E5B';

/** Couleur d'accent premium — indicateurs, séries secondaires des graphiques. */
export const ACCENT_COLOR = '#D97706';
