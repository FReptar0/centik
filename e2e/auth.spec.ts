import { test, expect } from '@playwright/test'

test.describe('Auth proxy redirect', () => {
  test('redirects unauthenticated user to login with callbackUrl', async ({ page }) => {
    await page.goto('/movimientos')

    // Should have been redirected to /login
    await expect(page).toHaveURL(/\/login/)

    // callbackUrl should be preserved in the URL
    const url = new URL(page.url())
    expect(url.searchParams.get('callbackUrl')).toBe('/movimientos')
  })

  test('login page loads with Centik branding', async ({ page }) => {
    await page.goto('/login')

    // Verify branding elements
    await expect(page.locator('h1')).toContainText('Centik')

    // Verify form elements exist
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()

    // Verify submit button
    await expect(page.getByRole('button', { name: /Iniciar sesion/i })).toBeVisible()
  })
})

test.describe('Full login flow', () => {
  // This test depends on the dev DB having the seeded admin user.
  // Skip if the environment does not have a seeded user.
  test('logs in with seeded admin credentials and redirects back', async ({ page }) => {
    // Navigate to a protected route to trigger redirect
    await page.goto('/movimientos')
    await expect(page).toHaveURL(/\/login/)

    // Fill in credentials (seeded admin user from prisma/seed.ts)
    await page.locator('input[name="email"]').fill('fmemije00@gmail.com')
    await page.locator('input[name="password"]').fill('centik-dev-2026')

    // Submit form
    await page.getByRole('button', { name: /Iniciar sesion/i }).click()

    // After successful login, should redirect back to /movimientos
    await expect(page).toHaveURL(/\/movimientos/, { timeout: 10000 })
  })
})
