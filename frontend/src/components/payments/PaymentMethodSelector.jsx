/**
 * PaymentMethodSelector
 * Cartes cliquables pour choisir Orange CI ou Wave CI.
 */
export default function PaymentMethodSelector({ value, onChange, disabled = false }) {
  const METHODS = [
    {
      id:          'orange_ci',
      name:        'Orange Money',
      description: 'Paiement via Orange Money CI',
      logo: (
        <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none">
          <circle cx="20" cy="20" r="20" fill="#FF6600" />
          <circle cx="20" cy="20" r="10" fill="white" />
        </svg>
      ),
      ring:   'ring-orange-400',
      border: 'border-orange-400',
      bg:     'bg-orange-50',
      dot:    'bg-orange-500 border-orange-500',
    },
    {
      id:          'wave_ci',
      name:        'Wave',
      description: 'Paiement via Wave CI',
      logo: (
        <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none">
          <circle cx="20" cy="20" r="20" fill="#1C9BEF" />
          <path
            d="M10 22 Q15 13 20 20 Q25 27 30 18"
            stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"
          />
        </svg>
      ),
      ring:   'ring-blue-400',
      border: 'border-blue-400',
      bg:     'bg-blue-50',
      dot:    'bg-blue-500 border-blue-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {METHODS.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(m.id)}
            className={[
              'relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150',
              active
                ? `${m.border} ${m.bg} ring-2 ${m.ring}`
                : 'border-gray-200 bg-white hover:border-gray-300',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {/* Radio visuel */}
            <span className={[
              'absolute top-3 right-3 h-4 w-4 rounded-full border-2 flex items-center justify-center',
              active ? m.dot : 'border-gray-300 bg-white',
            ].join(' ')}>
              {active && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>

            {m.logo}

            <div className="text-center">
              <p className="font-semibold text-gray-900 text-sm leading-tight">{m.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
