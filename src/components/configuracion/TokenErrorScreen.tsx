import { Ticket } from 'lucide-react'

export type TokenErrorState = 'invalid' | 'expired' | 'used'

const COPY: Record<TokenErrorState, { heading: string; body: string }> = {
  invalid: {
    heading: 'Enlace invalido',
    body: 'Este enlace de invitacion no es valido. Pide uno nuevo al administrador.',
  },
  expired: {
    heading: 'Enlace expirado',
    body: 'Esta invitacion expiro. Pide una nueva al administrador.',
  },
  used: {
    heading: 'Enlace ya usado',
    body: 'Esta invitacion ya fue utilizada. Si necesitas acceso, pide una nueva.',
  },
}

interface Props {
  state: TokenErrorState
}

/**
 * Displays a differentiated error for invalid / expired / used invite tokens.
 * Pure display component -- no hooks, no interactivity. Safe to render in a
 * Server Component. Icon + heading + body copy per 28-UI-SPEC.md lines 130-134.
 */
export default function TokenErrorScreen({ state }: Props) {
  const { heading, body } = COPY[state]
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-20 text-center max-w-sm w-full px-6"
    >
      <Ticket size={32} className="text-text-tertiary mb-3" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-text-primary mb-2">{heading}</h2>
      <p className="text-sm text-text-secondary">{body}</p>
    </div>
  )
}
