import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Select stylisé — remplace les <select className="input"> du projet.
 *
 * Compatible react-hook-form via forwardRef :
 *   <SelectInput {...register('role')} error={errors.role?.message}>
 *     <option value="">— Choisir —</option>
 *   </SelectInput>
 *
 * Props supplémentaires :
 *   label    — texte du label au-dessus
 *   error    — message d'erreur en rouge
 *   hint     — texte d'aide en gris
 */
const SelectInput = forwardRef(function SelectInput(
  { label, error, hint, className, children, disabled, ...props },
  ref,
) {
  return (
    <div className="space-y-1">
      {label && <label className="label">{label}</label>}

      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          {...props}
          className={cn(
            // Base — identique à .input mais avec padding-right pour la flèche
            'w-full appearance-none rounded-xl border bg-white px-3 py-2 pr-9 text-sm text-gray-900',
            'transition-colors outline-none',
            'focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50',
            // États
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-200 hover:border-gray-300',
            className,
          )}
        >
          {children}
        </select>

        {/* Flèche custom — non-interactive */}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className={cn(
            'h-4 w-4 transition-colors',
            error ? 'text-red-400' : 'text-gray-400',
          )} />
        </span>
      </div>

      {hint  && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});

export default SelectInput;
