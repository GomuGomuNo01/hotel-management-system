import { BRAND } from '../../config/brand';
import { cn } from '../../utils/cn';

/**
 * Logo — marque + nom, déclinable sur toutes les surfaces (navbar publique,
 * sidebars admin/propriétaire, footer, écrans d'authentification).
 *
 * Le monogramme reprend le favicon : même géométrie, donc même reconnaissance
 * entre l'onglet du navigateur et l'application.
 *
 * @param {'sm'|'md'|'lg'} [size]      - taille du monogramme et du wordmark
 * @param {string}   [subtitle]        - libellé secondaire (ex. « Administration »)
 * @param {boolean}  [onDark]          - inverse le wordmark pour les fonds sombres
 * @param {boolean}  [markOnly]        - n'affiche que le monogramme
 */
export default function Logo({ size = 'md', subtitle, onDark = false, markOnly = false, className }) {
  const dims = {
    sm: { box: 'h-7 w-7',  radius: 'rounded-lg',  text: 'text-sm',  mono: 'text-[13px]' },
    md: { box: 'h-8 w-8',  radius: 'rounded-xl',  text: 'text-lg',  mono: 'text-[15px]' },
    lg: { box: 'h-11 w-11', radius: 'rounded-2xl', text: 'text-2xl', mono: 'text-xl' },
  }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center flex-shrink-0 font-display font-extrabold text-white',
          'bg-gradient-to-br from-brand-500 to-brand-700 shadow-card',
          dims.box, dims.radius, dims.mono,
        )}
      >
        {BRAND.monogram}
      </span>

      {!markOnly && (
        <span className="flex flex-col leading-tight min-w-0">
          <span
            className={cn(
              'font-display font-extrabold tracking-tight truncate',
              dims.text,
              onDark ? 'text-white' : 'text-ink',
            )}
          >
            {BRAND.name}
          </span>
          {subtitle && (
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider truncate',
                onDark ? 'text-white/60' : 'text-ink-muted',
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
