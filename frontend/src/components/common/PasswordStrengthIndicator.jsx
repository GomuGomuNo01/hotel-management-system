/* eslint-disable react-refresh/only-export-components -- helper getPasswordStrength co-localisé volontairement avec le composant ; n'affecte que le Fast Refresh en dev. */
import { Check, X } from 'lucide-react';

const RULES = [
  { id: 'length',   label: '8 caractères minimum',         test: (p) => p.length >= 8 },
  { id: 'upper',    label: 'Au moins 1 majuscule (A–Z)',    test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',    label: 'Au moins 1 minuscule (a–z)',    test: (p) => /[a-z]/.test(p) },
  { id: 'number',   label: 'Au moins 1 chiffre (0–9)',      test: (p) => /[0-9]/.test(p) },
  { id: 'symbol',   label: 'Au moins 1 caractère spécial (!@#$%…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Calcule la force du mot de passe (0-4) en fonction des règles respectées.
 * 0 = vide  1 = faible  2 = moyen  3 = fort  4 = très fort
 */
export function getPasswordStrength(password) {
  if (!password) return 0;
  return RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_CONFIG = [
  { label: '',           color: 'bg-gray-200',   text: '' },
  { label: 'Très faible', color: 'bg-red-500',    text: 'text-red-600' },
  { label: 'Faible',      color: 'bg-orange-500', text: 'text-orange-600' },
  { label: 'Moyen',       color: 'bg-yellow-500', text: 'text-yellow-600' },
  { label: 'Fort',        color: 'bg-emerald-500', text: 'text-emerald-600' },
  { label: 'Très fort',   color: 'bg-emerald-600', text: 'text-emerald-700' },
];

export default function PasswordStrengthIndicator({ password }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const cfg      = STRENGTH_CONFIG[strength] ?? STRENGTH_CONFIG[0];

  return (
    <div className="mt-2 space-y-2">
      {/* Barre de force */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-300 ${
                i <= strength ? cfg.color : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        {cfg.label && (
          <span className={`text-xs font-medium whitespace-nowrap ${cfg.text}`}>
            {cfg.label}
          </span>
        )}
      </div>

      {/* Critères */}
      <ul className="grid grid-cols-1 gap-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
              {ok
                ? <Check className="h-3 w-3 flex-shrink-0" />
                : <X    className="h-3 w-3 flex-shrink-0" />
              }
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
