/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * Palette de marque — vert « confiance & croissance », clin d'œil
         * discret au drapeau ivoirien sans en reprendre la saturation.
         * L'échelle 50→900 est inchangée : toutes les classes brand-* du code
         * existant restent valides.
         */
        brand: {
          50:  '#F4FAF7',
          100: '#DDF3E6',
          200: '#BDE6CE',
          300: '#8FD6AA',
          400: '#5CC183',
          500: '#2F9E5B',
          600: '#247E49',
          700: '#1E673D',
          800: '#1A5333',
          900: '#123822',
        },

        /** Accent orange premium — notifications, stats, CTA secondaires. */
        accent: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        /** Couleurs système — fonds, surfaces et sémantique d'état. */
        canvas:  '#F8FAFC',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#0F172A', // texte principal
          muted:   '#64748B', // texte secondaire
        },
        success: '#22C55E',
        info:    '#0EA5E9',
        warning: '#F59E0B',
        danger:  '#EF4444',
      },

      fontFamily: {
        // Corps de texte : Inter. Titres : Manrope (classe `font-display`).
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      boxShadow: {
        // Ombres très discrètes, dans l'esprit Stripe / Linear.
        card:         '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.05)',
      },
    },
  },
  plugins: [],
};
