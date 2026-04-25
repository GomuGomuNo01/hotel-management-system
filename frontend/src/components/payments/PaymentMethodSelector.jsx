import { cn } from '../../utils/cn';

const METHODS = [
  { value: 'orange_ci', label: 'Orange CI', tag: 'OM', color: 'bg-orange-500' },
  { value: 'wave_ci', label: 'Wave CI', tag: 'WV', color: 'bg-blue-500' },
];

export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-4 text-left transition',
            value === m.value
              ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className={cn('h-10 w-10 rounded-lg text-white flex items-center justify-center font-bold', m.color)}>
            {m.tag}
          </div>
          <div>
            <p className="font-medium">{m.label}</p>
            <p className="text-xs text-gray-500">Mobile Money</p>
          </div>
        </button>
      ))}
    </div>
  );
}
