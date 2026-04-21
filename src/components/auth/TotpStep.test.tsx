import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// Mock the Server Action — useActionState calls it but our tests don't exercise submission
vi.mock('@/actions/auth', () => ({
  verifyTotpAction: vi.fn(),
}))

import TotpStep from './TotpStep'

afterEach(() => {
  cleanup()
})

describe('TotpStep', () => {
  const baseProps = {
    email: 'user@example.com',
    challenge: 'signed.challenge.token',
    callbackUrl: '/movimientos',
  }

  it('renders hidden inputs with email, challenge and callbackUrl from props', () => {
    const { container } = render(<TotpStep {...baseProps} />)
    const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement
    const challengeInput = container.querySelector('input[name="challenge"]') as HTMLInputElement
    const callbackInput = container.querySelector('input[name="callbackUrl"]') as HTMLInputElement

    expect(emailInput?.value).toBe('user@example.com')
    expect(challengeInput?.value).toBe('signed.challenge.token')
    expect(callbackInput?.value).toBe('/movimientos')
    expect(emailInput?.type).toBe('hidden')
  })

  it('renders a code input with name "code" and numeric inputMode by default', () => {
    const { container } = render(<TotpStep {...baseProps} />)
    const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement
    expect(codeInput).toBeTruthy()
    expect(codeInput.getAttribute('inputmode')).toBe('numeric')
  })

  it('renders the default label for TOTP mode', () => {
    render(<TotpStep {...baseProps} />)
    expect(screen.getByText('Codigo de 6 digitos')).toBeDefined()
  })

  it('renders the backup-code toggle button with the correct label', () => {
    render(<TotpStep {...baseProps} />)
    expect(screen.getByText('Usar codigo de respaldo')).toBeDefined()
  })

  it('renders the "Verificar" submit button', () => {
    render(<TotpStep {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeDefined()
  })

  it('clicking the toggle switches to backup-code mode (label + inputMode swap)', () => {
    const { container } = render(<TotpStep {...baseProps} />)
    const toggle = screen.getByText('Usar codigo de respaldo')
    fireEvent.click(toggle)

    // Label becomes the return-to-TOTP variant
    expect(screen.getByText('Usar codigo de 6 digitos')).toBeDefined()
    // Input label switches
    expect(screen.getByText('Codigo de respaldo')).toBeDefined()
    // inputMode switches to text
    const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement
    expect(codeInput.getAttribute('inputmode')).toBe('text')
  })
})
