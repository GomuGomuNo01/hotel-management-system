import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configuration dédiée aux tests unitaires/composants (Vitest + jsdom).
// Séparée de vite.config.js pour ne pas mêler build de prod et runner de test,
// et pour éviter toute collision avec le runner Playwright (tests/e2e).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
});
