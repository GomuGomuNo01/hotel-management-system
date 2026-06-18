import { test, expect } from '@playwright/test';

/**
 * Smokes authentifiés hermétiques des pages client. Auth client injectée +
 * API stubbée. Filet de rendu pour la décomposition de la page de paiement.
 */

const CLIENT = {
  id: 1, first_name: 'Awa', last_name: 'Koné', full_name: 'Awa Koné',
  email: 'client@hotel.local', role: 'client',
  email_verified_at: '2026-01-01T00:00:00.000000Z',
};

const reservation = {
  success: true,
  data: {
    id: 1,
    status: 'pending',
    room: { room_number: '101', room_type: 'double' },
    check_in_date: '2026-07-01',
    check_out_date: '2026-07-04',
    nights: 3,
    total_amount: 135000,
    paid_amount: 0,
    remaining_amount: 135000,
    is_fully_paid: false,
    payment_plan: 'full',
    refund: null,
  },
};

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(({ user }) => {
    localStorage.setItem('hms-auth', JSON.stringify({
      state: { user, role: 'client', token: 'e2e-client-token' },
      version: 0,
    }));
  }, { user: CLIENT });

  await page.route('http://localhost:8000/api/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me'))        return route.fulfill({ json: { success: true, data: { user: CLIENT, role: 'client' } } });
    if (url.includes('/reservations/'))  return route.fulfill({ json: reservation });
    return route.fulfill({ json: { success: true, data: {} } });
  });
});

test('la page de paiement se rend sans planter', async ({ page }) => {
  await page.goto('/mon-espace/paiement/1');
  await expect(page.getByRole('heading', { name: 'Paiement' })).toBeVisible();
  // Le formulaire de premier paiement s'affiche (réservation non payée).
  await expect(page.getByText('Payer maintenant').first()).toBeVisible();
});
