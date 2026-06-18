import { test, expect } from '@playwright/test';

/**
 * Smokes authentifiés hermétiques des pages propriétaire (owner). Auth owner
 * injectée + API stubbée. Filet de rendu pour la décomposition de ces écrans.
 */

const OWNER = {
  id: 1, full_name: 'Propriétaire Démo', email: 'owner@hotel.local', role: 'owner',
};

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(({ user }) => {
    localStorage.setItem('hms-auth', JSON.stringify({
      state: { user, role: 'owner', token: 'e2e-owner-token' },
      version: 0,
    }));
  }, { user: OWNER });

  await page.route('http://localhost:8000/api/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      return route.fulfill({ json: { success: true, data: { user: OWNER, role: 'owner' } } });
    }
    return route.fulfill({ json: { success: true, data: {} } });
  });
});

test("le formulaire de création d'admin se rend sans planter", async ({ page }) => {
  // Mode création (/owner/admins/new) : aucun fetch, formulaire pur.
  await page.goto('/owner/admins/new');
  await expect(page.getByRole('heading', { name: 'Créer un nouvel administrateur' })).toBeVisible();
});
