/**
 * formatXOF - Formateur monétaire unifié pour tout le projet.
 *
 * Produit toujours : "5 450 500 F CFA"
 *   - Séparateur de milliers : espace insécable (U+202F) via fr-FR
 *   - Libellé fixe " F CFA" (pas "XOF", pas "FCFA", pas "CFA Franc")
 *   - Pas de décimales (monnaie entière)
 *
 * ⚠️ N'utilise PAS Intl avec style:'currency'/currency:'XOF' car le rendu
 *    varie selon le navigateur / version ICU (XOF, FCFA, CFA, F CFA...).
 */
const _fmt = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatXOF = (amount) =>
  `${_fmt.format(Math.round(amount ?? 0))} F CFA`;
