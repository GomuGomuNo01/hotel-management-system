import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Champ mot de passe avec bouton œil pour afficher/masquer.
 * Compatible avec react-hook-form via forwardRef.
 *
 * Usage :
 *   <PasswordInput {...register('password')} placeholder="••••••••" />
 */
const PasswordInput = forwardRef(function PasswordInput(
  { className, error, ...props },
  ref,
) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn(
          'input pr-10',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
          className,
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {show ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});

export default PasswordInput;
