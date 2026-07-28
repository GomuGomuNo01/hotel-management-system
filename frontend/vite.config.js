import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    // open: true supprimé — ralentit le démarrage en dev
  },

  build: {
    // Compression + minification maximale
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // retire console.* en prod
        drop_debugger: true,
        passes: 2,
      },
    },
    // Seuil d'avertissement chunk (default 500 kB → trop bas)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        /*
         * Chunks manuels — À N'UTILISER QUE POUR LES DÉPENDANCES RÉELLEMENT
         * PRÉSENTES AU PREMIER RENDU.
         *
         * Déclarer ici une dépendance chargée uniquement en différé (recharts,
         * laravel-echo…) la fait entrer dans le graphe de l'entrée : Vite émet
         * alors un <link rel="modulepreload"> et le navigateur la télécharge en
         * priorité haute dès la page d'accueil. recharts (392 ko) et
         * laravel-echo/pusher (72 ko) étaient dans ce cas.
         *
         * Laissées hors de cette liste, ces dépendances sont regroupées par
         * Rollup dans les chunks de route différés qui les utilisent, et ne
         * sont téléchargées qu'au moment où l'écran concerné s'affiche.
         */
        manualChunks: {
          // Framework React (immuable entre les déploiements)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI / icônes — présents dans la navbar dès le premier écran
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          // Zustand store — lu par les gardes de route
          'vendor-store': ['zustand'],
          // HTTP — l'intercepteur axios est monté au démarrage
          'vendor-http': ['axios'],
        },
      },
    },
  },
});
