'use client'

import { Delete } from 'lucide-react'

interface NumpadProps {
  value: string
  onChange: (value: string) => void
}

const KEY_CLASS =
  'min-h-[48px] min-w-[48px] rounded-xl bg-surface-elevated font-mono text-xl text-text-primary transition-colors duration-100 hover:bg-surface-hover active:bg-surface-hover'

export default function Numpad({ value, onChange }: NumpadProps) {
  function hasMaxDecimals(): boolean {
    const dotIndex = value.indexOf('.')
    if (dotIndex === -1) return false
    return value.length - dotIndex - 1 >= 2
  }

  function handleDigit(digit: string) {
    if (hasMaxDecimals()) return
    onChange(value + digit)
  }

  function handleDecimal() {
    if (value.includes('.')) return
    onChange(value + '.')
  }

  function handleDoubleZero() {
    if (value === '' || value === '0') {
      onChange('0')
      return
    }

    const dotIndex = value.indexOf('.')
    if (dotIndex === -1) {
      onChange(value + '00')
      return
    }

    const decimals = value.length - dotIndex - 1
    if (decimals >= 2) return

    const zerosToAdd = Math.min(2, 2 - decimals)
    onChange(value + '0'.repeat(zerosToAdd))
  }

  function handleBackspace() {
    if (value === '') return
    onChange(value.slice(0, -1))
  }

  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface p-2">
      {/* Row 1: 1, 2, 3, backspace */}
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('1')}>
        1
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('2')}>
        2
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('3')}>
        3
      </button>
      <button
        type="button"
        className={KEY_CLASS}
        onClick={handleBackspace}
        aria-label="Borrar"
      >
        <Delete size={20} className="mx-auto" aria-hidden="true" />
      </button>

      {/* Row 2: 4, 5, 6, decimal */}
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('4')}>
        4
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('5')}>
        5
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('6')}>
        6
      </button>
      <button type="button" className={KEY_CLASS} onClick={handleDecimal}>
        .
      </button>

      {/* Row 3: 7, 8, 9, 00 */}
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('7')}>
        7
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('8')}>
        8
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('9')}>
        9
      </button>
      <button type="button" className={KEY_CLASS} onClick={handleDoubleZero}>
        00
      </button>

      {/* Row 4: empty, 0, empty, empty */}
      <div />
      <button type="button" className={KEY_CLASS} onClick={() => handleDigit('0')}>
        0
      </button>
      <div />
      <div />
    </div>
  )
}
