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
        // Chunks manuels : découpe les grosses dépendances en chunks séparés
        // → chaque chunk est mis en cache navigateur indépendamment
        manualChunks: {
          // Framework React (immuable entre les déploiements)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI / icônes
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          // Réservations WebSocket
          'vendor-ws': ['laravel-echo', 'pusher-js'],
          // Graphiques (owner dashboard)
          'vendor-charts': ['recharts'],
          // Formulaires
          'vendor-forms': ['react-hook-form'],
          // Zustand store
          'vendor-store': ['zustand'],
          // HTTP
          'vendor-http': ['axios'],
        },
      },
    },
  },
});
