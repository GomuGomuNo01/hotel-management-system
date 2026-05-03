import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Phone } from 'lucide-react';
import { cn } from '../../utils/cn';

/* ─── Liste des pays (flag, nom, indicatif, masque) ─────────────
   Le masque utilise # pour chaque chiffre attendu.
   Les séparateurs (espace, tiret, parenthèses) sont insérés automatiquement.
────────────────────────────────────────────────────────────────── */
export const COUNTRIES = [
  { code: '+225', name: "Côte d'Ivoire",  flag: '🇨🇮', pattern: '## ## ## ## ##', maxDigits: 10 },
  { code: '+221', name: 'Sénégal',        flag: '🇸🇳', pattern: '## ### ## ##',   maxDigits: 9  },
  { code: '+223', name: 'Mali',           flag: '🇲🇱', pattern: '## ## ## ##',    maxDigits: 8  },
  { code: '+224', name: 'Guinée',         flag: '🇬🇳', pattern: '### ## ## ##',   maxDigits: 9  },
  { code: '+226', name: 'Burkina Faso',   flag: '🇧🇫', pattern: '## ## ## ##',    maxDigits: 8  },
  { code: '+227', name: 'Niger',          flag: '🇳🇪', pattern: '## ## ## ##',    maxDigits: 8  },
  { code: '+228', name: 'Togo',           flag: '🇹🇬', pattern: '## ## ## ##',    maxDigits: 8  },
  { code: '+229', name: 'Bénin',          flag: '🇧🇯', pattern: '## ## ## ##',    maxDigits: 8  },
  { code: '+233', name: 'Ghana',          flag: '🇬🇭', pattern: '## ### ####',    maxDigits: 9  },
  { code: '+234', name: 'Nigeria',        flag: '🇳🇬', pattern: '### ### ####',   maxDigits: 10 },
  { code: '+237', name: 'Cameroun',       flag: '🇨🇲', pattern: '# ## ## ## ##', maxDigits: 9  },
  { code: '+241', name: 'Gabon',          flag: '🇬🇦', pattern: '# ## ## ##',     maxDigits: 7  },
  { code: '+242', name: 'Congo',          flag: '🇨🇬', pattern: '## ### ####',    maxDigits: 9  },
  { code: '+243', name: 'RD Congo',       flag: '🇨🇩', pattern: '### ## ## ##',   maxDigits: 9  },
  { code: '+212', name: 'Maroc',          flag: '🇲🇦', pattern: '# ## ## ## ##', maxDigits: 9  },
  { code: '+213', name: 'Algérie',        flag: '🇩🇿', pattern: '### ## ## ##',   maxDigits: 9  },
  { code: '+216', name: 'Tunisie',        flag: '🇹🇳', pattern: '## ### ###',     maxDigits: 8  },
  { code: '+33',  name: 'France',         flag: '🇫🇷', pattern: '# ## ## ## ##', maxDigits: 10 },
  { code: '+32',  name: 'Belgique',       flag: '🇧🇪', pattern: '### ## ## ##',   maxDigits: 9  },
  { code: '+41',  name: 'Suisse',         flag: '🇨🇭', pattern: '## ### ## ##',   maxDigits: 9  },
  { code: '+44',  name: 'Royaume-Uni',    flag: '🇬🇧', pattern: '#### ### ####', maxDigits: 10 },
  { code: '+1',   name: 'USA / Canada',   flag: '🇺🇸', pattern: '### ### ####',   maxDigits: 10 },
  { code: '+49',  name: 'Allemagne',      flag: '🇩🇪', pattern: '### ### ####',   maxDigits: 10 },
  { code: '+39',  name: 'Italie',         flag: '🇮🇹', pattern: '### ### ####',   maxDigits: 10 },
  { code: '+34',  name: 'Espagne',        flag: '🇪🇸', pattern: '### ### ###',    maxDigits: 9  },
];

/* ─── Applique le masque de saisi ────────────────────────────── */
function applyMask(rawDigits, pattern) {
  let out = '';
  let di  = 0;
  for (const ch of pattern) {
    if (di >= rawDigits.length) break;
    if (ch === '#') {
      out += rawDigits[di++];
    } else {
      out += ch; // séparateur uniquement s'il y a encore des chiffres à afficher
    }
  }
  // Retirer les séparateurs en fin de chaîne
  return out.replace(/[\s\-().]+$/, '');
}

/* ─── Parse une valeur existante en { country, rawDigits } ───── */
function parseValue(value) {
  if (!value) return { country: COUNTRIES[0], rawDigits: '' };
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (value.startsWith(c.code)) {
      return { country: c, rawDigits: value.slice(c.code.length).replace(/\D/g, '') };
    }
  }
  return { country: COUNTRIES[0], rawDigits: value.replace(/\D/g, '') };
}

/* ─── Composant principal ─────────────────────────────────────── */
export default function PhoneInputWithCode({
  value        = '',
  onChange,
  label,
  hint,
  error,
  disabled,
  required,
  placeholder,
  className,
}) {
  const { country: initCountry, rawDigits: initDigits } = parseValue(value);
  const [country,   setCountry]   = useState(initCountry);
  const [rawDigits, setRawDigits] = useState(initDigits);
  const [open,      setOpen]      = useState(false);
  const [search,    setSearch]    = useState('');
  const dropRef  = useRef(null);
  const searchRef = useRef(null);

  /* Recalcule le state si value change de l'extérieur (mode édition) */
  useEffect(() => {
    if (!value) return;
    const parsed = parseValue(value);
    setCountry(parsed.country);
    setRawDigits(parsed.rawDigits);
  }, []);  // intentionnellement vide — ne se re-synchronise qu'au montage

  /* Ferme le dropdown en cliquant dehors */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Focus la recherche à l'ouverture */
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  /* Notifie le parent à chaque changement */
  const notify = (c, d) => {
    const formatted = applyMask(d, c.pattern);
    onChange?.(`${c.code}${formatted ? ' ' + formatted : ''}`);
  };

  const selectCountry = (c) => {
    setCountry(c);
    setRawDigits('');
    setOpen(false);
    setSearch('');
    onChange?.(`${c.code} `);
  };

  const handleNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, country.maxDigits);
    setRawDigits(digits);
    notify(country, digits);
  };

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  const displayValue = applyMask(rawDigits, country.pattern);

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
        {/* ── Sélecteur d'indicatif ── */}
        <div className="relative flex-shrink-0" ref={dropRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={disabled}
            className="flex items-center gap-1.5 h-full px-3.5 border-r border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors rounded-l-lg focus:outline-none focus:bg-slate-50 min-w-[90px]"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="tabular-nums">{country.code}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un pays…"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>
              {/* Liste */}
              <div className="max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
                ) : filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-brand-50 transition-colors',
                      c.code === country.code && 'bg-brand-50 text-brand-700 font-medium',
                    )}
                  >
                    <span className="text-base flex-shrink-0">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-gray-400 tabular-nums text-xs">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Champ numéro ── */}
        <input
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleNumberChange}
          placeholder={placeholder ?? country.pattern.replace(/#/g, '0')}
          disabled={disabled}
          required={required}
          maxLength={country.pattern.length}
          className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-transparent outline-none rounded-r-lg placeholder:text-slate-400 min-w-0"
        />
      </div>

      {hint  && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
