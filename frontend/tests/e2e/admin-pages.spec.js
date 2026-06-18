import { test, expect } from '@playwright/test';

/**
 * Filet de sécurité avant décomposition : smokes authentifiés hermétiques sur
 * les pages admin lourdes (Dashboard, Rapports, Réservations). Auth injectée +
 * API stubbée, aucun backend requis.
 *
 * Principe : l'ErrorBoundary est monté à la racine (main.jsx). Si un composant
 * de la page lève une erreur au rendu, TOUT l'arbre est remplacé par l'écran de
 * secours — donc asserter un contenu stable de la page prouve qu'elle s'est
 * rendue sans planter. C'est le garde-fou recherché pour refactorer ces écrans.
 */

const USER = {
  id: 1, first_name: 'Admin', last_name: 'Démo', full_name: 'Admin Démo',
  email: 'admin@hotel.local', role: 'manager',
  permissions: [
    'manage_rooms', 'manage_reservations', 'manage_checkin_checkout',
    'manage_payments', 'manage_complaints', 'view_reports',
    'view_audit_summary', 'view_reviews', 'manage_clients', 'manage_housekeeping',
  ],
};

const dashboardStats = {
  success: true,
  data: {
    kpi: {
      available_rooms: 5, occupied_rooms: 3, maintenance_rooms: 1,
      today_reservations: 2, pending_reservations: 1,
      today_check_ins: 1, today_check_outs: 1, checked_in_count: 3, upcoming_checkins_3days: 2,
      pending_payments: 0, pending_refunds: 0, pending_payments_amount: 0,
      revenue_today: 50000, revenue_this_month: 300000, pending_balances: 0,
    },
    recent_reservations: [], upcoming_checkins: [],
    today_check_ins: [], today_check_outs: [],
    pending_payments: [], pending_balances: [],
  },
};

const reportSummary = {
  success: true,
  data: {
    period: { label: 'juin 2026', generated_at: new Date().toISOString() },
    revenue: {
      this_month: 300000, last_month: 200000, net_this_month: 280000, ytd: 1500000, all_time: 5000000,
      by_month: [{ month: '2026-06', total: 300000 }],
      daily: [{ day: 14, total: 50000 }],
    },
    indicators: { adr: 25000, revpar: 15000, occupancy_rate: 60, refund_rate: 5 },
    outstanding: { balance_amount: 40000, balance_count: 1, pending_payment_amount: 0, pending_payment_count: 0 },
    reservations: { total: 30, this_month: 8, pending: 2, confirmed: 10, checked_in: 4, completed: 12, cancelled: 2 },
    rooms: { total: 10, available: 5, occupied: 3, maintenance: 1, occupancy_rate: 60 },
    refunds: { pending: 1, approved: 3, rejected: 0, total_amount_refunded: 120000, amount_this_month: 40000, rate_this_month: 5 },
    payment_methods: [{ method: 'orange_ci', count: 5, total: 200000 }, { method: 'cash', count: 3, total: 100000 }],
    revenue_by_room: [{ room_id: 1, room_number: '101', room_type: 'double', price_per_night: 45000, bookings: 4, revenue: 180000 }],
    top_rooms: [{ room_id: 1, room_number: '101', room_type: 'double', bookings: 4 }],
  },
};

const reservationsList = {
  success: true,
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
};

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(({ user }) => {
    localStorage.setItem('hms-auth', JSON.stringify({
      state: { user, role: 'admin', token: 'e2e-test-token' },
      version: 0,
    }));
  }, { user: USER });

  await page.route('http://localhost:8000/api/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me'))                       return route.fulfill({ json: { success: true, data: { user: USER, role: 'admin' } } });
    if (url.includes('/admin/dashboard/stats'))         return route.fulfill({ json: dashboardStats });
    if (url.includes('/admin/reports'))                 return route.fulfill({ json: reportSummary });
    if (url.includes('/admin/reservations/deposit-alerts')) return route.fulfill({ json: { success: true, data: { count: 0 } } });
    if (url.includes('/admin/reservations'))            return route.fulfill({ json: reservationsList });
    if (url.includes('/admin/badges'))                  return route.fulfill({ json: { data: { refunds: 0, deposits: 0, checkins: 0, complaints: 0 } } });
    return route.fulfill({ json: { success: true, data: {} } });
  });
});

test('le tableau de bord admin se rend sans planter', async ({ page }) => {
  await page.goto('/admin');
  // Le badge de rôle est dans l'en-tête : présent ⇒ tout l'arbre (KPI + vue rôle)
  // s'est rendu sans lever d'erreur (sinon l'ErrorBoundary aurait tout remplacé).
  await expect(page.getByText('Manager').first()).toBeVisible();
});

test('la page Rapports financiers se rend sans planter', async ({ page }) => {
  await page.goto('/admin/rapports');
  await expect(page.getByRole('heading', { name: /Rapports financiers/i })).toBeVisible();
  // Une valeur agrégée issue du stub confirme le rendu du corps de page.
  await expect(page.getByText('Évolution des revenus')).toBeVisible();
});

test('la page Réservations se rend sans planter', async ({ page }) => {
  await page.goto('/admin/reservations');
  await expect(page.getByRole('heading', { name: 'Réservations' })).toBeVisible();
});
