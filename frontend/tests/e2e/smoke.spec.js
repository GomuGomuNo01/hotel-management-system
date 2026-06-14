import { test, expect } from '@playwright/test';

test.describe('Smoke — l\'application se rend sans planter', () => {
  test('la page d\'accueil se charge et expose un accès connexion', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Un visiteur non connecté voit toujours un accès à la connexion dans la navbar.
    await expect(page.getByRole('link', { name: /connexion|se connecter/i }).first()).toBeVisible();
  });

  test('la page de connexion valide le formulaire côté client', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

    // Soumission à vide → la validation Zod (react-hook-form) se déclenche,
    // sans appel réseau. On évite de saisir un e-mail malformé car la
    // validation native de <input type="email"> bloquerait la soumission.
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page.getByText('E-mail invalide')).toBeVisible();
    await expect(page.getByText('Mot de passe requis')).toBeVisible();
  });

  test('le lien « Créer un compte » mène à l\'inscription', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /créer un compte/i }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('une route inconnue retombe sur la page 404', async ({ page }) => {
    await page.goto('/route-qui-nexiste-pas');
    await expect(page).toHaveURL(/\/404$/);
    await expect(page.getByText('Page introuvable')).toBeVisible();
  });
});
