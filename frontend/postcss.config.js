export default {
  plugins: {
    // Tailwind 4 : le plugin PostCSS vit dans son propre paquet.
    // autoprefixer n'est plus nécessaire — Tailwind 4 gère les préfixes
    // navigateurs lui-même, via Lightning CSS.
    '@tailwindcss/postcss': {},
  },
};
