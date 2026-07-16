/**
 * Identité de marque — source unique de vérité.
 *
 * Le nom est surchargeable par environnement via VITE_APP_NAME ; à défaut, on
 * retombe sur « Hôtel La Baie des Lacs ». Centraliser ici évite les libellés
 * codés en dur dispersés dans la navbar, les sidebars, le footer et le titre
 * d'onglet.
 */
export const BRAND = {
  name: import.meta.env.VITE_APP_NAME || 'Hôtel La Baie des Lacs',
  tagline: "L'hospitalité ivoirienne, sublimée.",
};
