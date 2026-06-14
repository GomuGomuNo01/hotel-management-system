import { defineConfig, devices } from '@playwright/test';

// Smoke E2E : démarre le serveur Vite et vérifie que les routes clés se
// rendent sans planter (boot React, lazy-loading, routing, validation de
// formulaire, fallback 404). Indépendant du backend — il cible des écrans
// qui n'appellent pas l'API au chargement.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
