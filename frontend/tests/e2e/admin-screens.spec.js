import { test, expect } from '@playwright/test';

/**
 * Smoke authentifié des deux nouveaux écrans admin (Planning, Housekeeping).
 *
 * Hermétique : l'authentification est injectée dans le store persisté et toutes
 * les requêtes /api/** sont stubbées. Le test vérifie le rendu réel des pages
 * (routing, guards par permission, affichage des données) sans backend ni base.
 */

const PERMS = ['manage_reservations', 'manage_housekeeping', 'manage_rooms', 'manage_clients'];
const USER = {
  id: 1, first_name: 'Admin', last_name: 'Démo', full_name: 'Admin Démo',
  email: 'admin@hotel.local', role: 'manager', permissions: PERMS,
};

/** Date du jour décalée de `offset` jours, au format yyyy-MM-dd. */
function iso(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const planningPayload = {
  success: true,
  message: '',
  data: {
    range: { from: iso(0), to: iso(14), days: 14 },
    rooms: [
      {
        id: 1, room_number: '101', room_type: 'double', status: 'reserved',
        reservations: [
          { id: 11, client_name: 'Awa Koné',  status: 'confirmed', check_in_date: iso(1), check_out_date: iso(4) },
          // Chevauche le précédent sur la même chambre → conflit attendu.
          { id: 12, client_name: 'Yao Brou',  status: 'pending',   check_in_date: iso(2), check_out_date: iso(5) },
        ],
      },
      {
        id: 2, room_number: '102', room_type: 'simple', status: 'available',
        reservations: [
          { id: 21, client_name: 'Marie Diabaté', status: 'checked_in', check_in_date: iso(0), check_out_date: iso(3) },
        ],
      },
    ],
  },
};

const housekeepingPayload = {
  success: true,
  message: '',
  data: {
    summary: { clean: 5, dirty: 2, in_progress: 1, out_of_service: 0 },
    rooms: [
      { id: 1, room_number: '101', room_type: 'double', status: 'available', housekeeping_status: 'dirty', housekeeping_label: 'À nettoyer' },
      { id: 2, room_number: '102', room_type: 'simple', status: 'available', housekeeping_status: 'clean', housekeeping_label: 'Propre' },
    ],
  },
};

test.beforeEach(async ({ context, page }) => {
  // Auth injectée avant tout script de page (store persisté zustand).
  await context.addInitScript(({ user, perms }) => {
    localStorage.setItem('hms-auth', JSON.stringify({
      state: { user, role: 'admin', token: 'e2e-test-token' },
      version: 0,
    }));
  }, { user: USER, perms: PERMS });

  // Stub de l'API backend : ciblé sur l'origine du backend (localhost:8000)
  // et NON sur « **/api/** », qui intercepterait aussi les modules source du
  // frontend servis par Vite (ex. /src/api/admin.api.js) et casserait l'app.
  await page.route('http://localhost:8000/api/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      return route.fulfill({ json: { success: true, data: { user: USER, role: 'admin' } } });
    }
    if (url.includes('/admin/planning')) {
      return route.fulfill({ json: planningPayload });
    }
    if (url.includes('/admin/housekeeping')) {
      return route.fulfill({ json: housekeepingPayload });
    }
    // Tout le reste (badges, alertes…) : réponse neutre pour éviter les 401.
    return route.fulfill({ json: { success: true, data: {} } });
  });
});

test('le planning affiche les occupations et signale les conflits', async ({ page }) => {
  await page.goto('/admin/planning');

  await expect(page.getByRole('heading', { name: "Planning d'occupation" })).toBeVisible();
  await expect(page.getByText('101').first()).toBeVisible();
  await expect(page.getByText('Awa Koné')).toBeVisible();
  // Les deux séjours qui se chevauchent sur la chambre 101 → bandeau de conflit.
  await expect(page.getByText(/conflit d'occupation/i).first()).toBeVisible();
});

test('le housekeeping affiche les états et les actions de transition', async ({ page }) => {
  await page.goto('/admin/housekeeping');

  await expect(page.getByRole('heading', { name: 'Housekeeping' })).toBeVisible();
  // Compteur « À nettoyer » (carte) + badge de la chambre 101.
  await expect(page.getByText('À nettoyer').first()).toBeVisible();
  await expect(page.getByText('Chambre 101')).toBeVisible();
  // Action contextuelle disponible sur une chambre sale.
  await expect(page.getByRole('button', { name: /marquer propre/i }).first()).toBeVisible();
});
