import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { cn } from '../../utils/cn';

/* ─── Indicatif unique : Côte d'Ivoire (+225) ─────────────────────
   Le projet ne gère qu'un seul pays. Le masque utilise # par chiffre ;
   les séparateurs sont insérés automatiquement.
────────────────────────────────────────────────────────────────── */
const DIAL_CODE  = '+225';
const FLAG       = '🇨🇮';
const PATTERN    = '## ## ## ## ##';
const MAX_DIGITS = 10;

/* ─── Applique le masque de saisie ───────────────────────────────── */
function applyMask(rawDigits) {
  let out = '';
  let di  = 0;
  for (const ch of PATTERN) {
    if (di >= rawDigits.length) break;
    if (ch === '#') out += rawDigits[di++];
    else            out += ch;
  }
  return out.replace(/[\s\-().]+$/, '');
}

/* ─── Extrait les chiffres d'une valeur existante (sans l'indicatif) ── */
function parseDigits(value) {
  if (!value) return '';
  let v = String(value).trim();
  if (v.startsWith(DIAL_CODE)) v = v.slice(DIAL_CODE.length);
  return v.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

/* ─── Composant principal ─────────────────────────────────────────── */
export default function PhoneInputWithCode({
  value       = '',
  onChange,
  label,
  hint,
  error,
  disabled,
  required,
  placeholder,
  className,
}) {
  const [rawDigits, setRawDigits] = useState(parseDigits(value));

  /* Resynchronise si la valeur change de l'extérieur (mode édition) */
  useEffect(() => {
    if (value) setRawDigits(parseDigits(value));
  }, []); // intentionnellement au montage uniquement

  const notify = (d) => {
    const formatted = applyMask(d);
    onChange?.(`${DIAL_CODE}${formatted ? ' ' + formatted : ''}`);
  };

  const handleNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    setRawDigits(digits);
    notify(digits);
  };

  const displayValue = applyMask(rawDigits);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="label flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className={cn(
        'flex items-stretch rounded-lg border-2 bg-white shadow-sm transition-all duration-200',
        'hover:border-slate-400',
        'focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10',
        error
          ? 'border-red-400 hover:border-red-400 focus-within:border-red-500 focus-within:ring-red-500/10'
          : 'border-slate-300',
        disabled && 'opacity-60 pointer-events-none bg-slate-50',
      )}>
        {/* Indicatif fixe (+225) */}
        <span className="flex items-center gap-1.5 px-3.5 border-r border-slate-200 text-sm font-medium text-slate-700 bg-slate-50 rounded-l-lg select-none">
          <span className="text-base leading-none">{FLAG}</span>
          <span className="tabular-nums">{DIAL_CODE}</span>
        </span>

        {/* Champ numéro */}
        <input
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleNumberChange}
          placeholder={placeholder ?? PATTERN.replace(/#/g, '0')}
          disabled={disabled}
          required={required}
          maxLength={PATTERN.length}
          className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-transparent outline-none rounded-r-lg placeholder:text-slate-400 min-w-0"
        />
      </div>

      {hint  && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
