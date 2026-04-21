import { test, expect, type Page } from '@playwright/test'
import { generateSync } from 'otplib'

/**
 * Phase 29 Plan 29-05 — single happy-path E2E (D-34).
 *
 * Flow: login as seeded admin -> enable 2FA (scan + verify) -> save backup
 * codes -> logout -> login with fresh TOTP code -> logout -> login with
 * backup code -> reach /.
 *
 * Deterministic time: we read the secret from the modal DOM and compute
 * the live TOTP code via otplib.generateSync(Date.now()) in the test
 * process. No browser clock stubbing needed — generateSync is pure and
 * runs synchronously between modal render and input fill.
 *
 * Idempotent: the teardown step disables 2FA via the Desactivar modal so
 * subsequent runs start from a clean totpEnabled=false seeded admin. If
 * teardown fails, the fallback SQL is documented in 29-05-SUMMARY.md.
 */

const ADMIN_EMAIL = 'fmemije00@gmail.com'
const ADMIN_PASSWORD = 'centik-dev-2026'

async function loginWithPassword(page: Page): Promise<void> {
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(ADMIN_EMAIL)
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /Iniciar sesion/i }).click()
}

async function logout(page: Page): Promise<void> {
  // Sidebar logout button — <button title="Cerrar sesion"> inside a <form>
  await page.locator('button[title="Cerrar sesion"]').first().click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
}

test.describe('TOTP 2FA happy path (Phase 29 D-34)', () => {
  test('enables 2FA, logs in with TOTP code, then logs in with backup code', async ({ page }) => {
    // 1. Login as seeded admin (single-factor — admin starts with totpEnabled=false)
    await loginWithPassword(page)
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // 2. Navigate to /configuracion and open the Activar 2FA wizard
    await page.goto('/configuracion')
    await page.getByRole('button', { name: /Activar 2FA/i }).click()

    // Scope all in-modal locators to the role=dialog so they don't match
    // .font-mono elements that live elsewhere on /configuracion (e.g. the
    // invite tokens list).
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // 3. Step 1 (scan) — wait for the secret to render in the <p class="font-mono">
    //    AND stabilize. React 19 strict mode double-invokes the useEffect so the
    //    secret may change once before settling; wait for two consecutive reads
    //    to match before trusting the value.
    const secretLocator = modal.locator('p.font-mono').first()
    await expect(secretLocator).toBeVisible({ timeout: 10000 })
    await expect
      .poll(async () => (await secretLocator.textContent())?.replace(/\s+/g, '') ?? '', {
        timeout: 10000,
      })
      .toMatch(/^[A-Z2-7]{16,}$/)

    // 4. Continue to step 2 (verify) — this triggers the component to render the
    //    form with the <input type="hidden" name="secret" value={prepare.secret}>.
    //    Reading the value from the hidden input is authoritative: it's the
    //    exact bytes that will be POST-ed to enableTotpAction.
    await modal.getByRole('button', { name: /Continuar/i }).click()

    const secretInput = modal.locator('input[type="hidden"][name="secret"]')
    await expect(secretInput).toHaveAttribute('value', /^[A-Z2-7]{16,}$/, { timeout: 10000 })
    const secret = (await secretInput.inputValue()).trim()
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/)

    // 5. Compute a fresh 6-digit TOTP code and submit. otplib.generateSync is
    //    deterministic at the current Date.now() — compute as close to the
    //    click as possible to minimize the 30s-window drift risk.
    const code1 = generateSync({ secret })
    await modal.locator('input[name="code"]').fill(code1)
    await modal.getByRole('button', { name: /Verificar/i }).click()

    // 6. Step 3 (codes) — 10 backup codes render as <span class="font-mono ..."> inside
    //    the BackupCodesScreen grid. enableTotpAction hashes 10 backup codes at
    //    bcrypt cost 12 (~7-8s in dev) before opening the $transaction, so we
    //    have to wait longer than the default for the codes screen to appear.
    const codeElements = modal.locator('span.font-mono')
    await expect(codeElements.first()).toBeVisible({ timeout: 30000 })
    await expect(codeElements).toHaveCount(10)
    const backupCodes = await codeElements.allTextContents()
    const firstBackup = backupCodes[0].trim()
    const secondBackup = backupCodes[1].trim()

    // 7. Acknowledge + finish wizard
    await modal.getByLabel(/He guardado mis codigos de respaldo/i).check()
    await modal.getByRole('button', { name: /^Listo$/i }).click()

    // 8. Logout (back to /login)
    await logout(page)

    // 9. Login again — this time step 1 succeeds then TotpStep renders
    await loginWithPassword(page)
    await expect(page.locator('input[name="code"]')).toBeVisible({ timeout: 10000 })

    // 10. Compute a fresh TOTP code and submit — must reach /
    const code2 = generateSync({ secret })
    await page.locator('input[name="code"]').fill(code2)
    await page.getByRole('button', { name: /Verificar/i }).click()
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // 11. Logout again
    await logout(page)

    // 12. Login one more time — use the backup code branch instead of TOTP
    await loginWithPassword(page)
    await expect(page.locator('input[name="code"]')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Usar codigo de respaldo/i }).click()
    await page.locator('input[name="code"]').fill(firstBackup)
    await page.getByRole('button', { name: /Verificar/i }).click()
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // 13. Teardown — disable 2FA so the seeded admin returns to totpEnabled=false
    //     (idempotent re-runs). Use the second backup code since the first was
    //     consumed in step 12.
    await page.goto('/configuracion')
    await page.getByRole('button', { name: /^Desactivar$/i }).click()
    const disableModal = page.getByRole('dialog')
    await expect(disableModal).toBeVisible({ timeout: 10000 })
    await disableModal.locator('input[name="code"]').fill(secondBackup)
    await disableModal.getByRole('button', { name: /^Desactivar$/i }).click()
    // verifyCurrentCode iterates 9 unused backup codes with bcrypt.compare (~60ms
    // each) + transaction + revalidatePath — give it room in dev mode.
    await expect(page.getByText(/Desactivado/i).first()).toBeVisible({ timeout: 30000 })
  })
})
