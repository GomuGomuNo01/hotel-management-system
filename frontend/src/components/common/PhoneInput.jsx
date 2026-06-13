import { Phone } from 'lucide-react';

/**
 * PhoneInput - champ téléphone sécurisé
 *
 * - Bloque toute saisie alphabétique via onKeyDown
 * - Nettoie les lettres collées via copier-coller (onChange)
 * - Affiche le label avec l'icône téléphone si label est fourni
 * - Compatible mobile : type="tel" + inputMode="tel"
 */
export default function PhoneInput({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = '+225 07 00 00 00 00',
  label,
  hint,
  className,
  error,
}) {
  /* Touches autorisées hors caractères imprimables */
  const ALLOWED_KEYS = new Set([
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End',
  ]);

  const handleKeyDown = (e) => {
    if (ALLOWED_KEYS.has(e.key)) return;          // touches de contrôle
    if (e.ctrlKey || e.metaKey) return;            // raccourcis clavier (Ctrl+C, Ctrl+V…)
    if (/^[+\d\s\-().]$/.test(e.key)) return;     // caractères valides
    e.preventDefault();                            // bloquer tout le reste (lettres, etc.)
  };

  const handleChange = (e) => {
    /* Purger les lettres qui auraient pu passer (ex. coller depuis un presse-papier) */
    const cleaned = e.target.value.replace(/[a-zA-Z]/g, '');
    onChange(cleaned);
  };

  return (
    <div>
      {label && (
        <label className="label flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          {label}
        </label>
      )}
      <input
        type="tel"
        inputMode="tel"
        className={`${className ?? 'input'} ${error ? 'border-red-400' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        maxLength={20}
        pattern="[+\d\s\-().]+"
        autoComplete="tel"
      />
      {hint && !error && (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
