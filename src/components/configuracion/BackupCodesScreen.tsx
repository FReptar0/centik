'use client'

import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { toast } from 'sonner'

interface BackupCodesScreenProps {
  /** 10 formatted XXXX-XXXX backup codes — plaintext, shown ONCE (D-12) */
  codes: string[]
  /** Fires only after mandatory checkbox is checked + Listo clicked */
  onFinish: () => void
}

/**
 * Phase 29 D-12 — single display of the 10 backup codes (post-enable or post-regen).
 * Mandatory "He guardado mis codigos de respaldo" checkbox gates the Listo CTA.
 * Codes are plaintext in memory for this render only; parent must not re-render
 * this with the same codes (they are never retrievable again from the server).
 */
export default function BackupCodesScreen({ codes, onFinish }: BackupCodesScreenProps) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('No pudimos copiar los codigos', { duration: 5000 })
    }
  }

  function handleDownload() {
    const blob = new Blob([codes.join('\n') + '\n'], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'centik-codigos-respaldo.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Guarda estos 10 codigos en un lugar seguro. Cada uno se puede usar UNA sola vez para iniciar
        sesion si pierdes acceso a tu app autenticadora.
      </p>

      <div className="rounded-2xl bg-surface p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {codes.map((c) => (
            <span key={c} className="font-mono tabular-nums text-text-primary text-sm">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-full border border-border-divider px-4 py-2 text-sm text-text-primary transition-colors duration-200 hover:border-text-secondary"
        >
          {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          {copied ? 'Copiado' : 'Copiar todos'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-full border border-border-divider px-4 py-2 text-sm text-text-primary transition-colors duration-200 hover:border-text-secondary"
        >
          <Download size={14} />
          Descargar (.txt)
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="h-4 w-4"
        />
        He guardado mis codigos de respaldo
      </label>

      <button
        type="button"
        onClick={onFinish}
        disabled={!saved}
        className="w-full rounded-full bg-accent text-black font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Listo
      </button>
    </div>
  )
}
