'use client'

import { useState, useId } from 'react'
import { cn } from '@/lib/utils'

interface FloatingInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'decimal' | 'date'
  prefix?: string
  suffix?: string
  error?: string
  optional?: boolean
  id?: string
  name?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * Underline-only input with floating label.
 * Label sits at input baseline when empty/unfocused, floats up as uppercase
 * micro-label on focus or when value is present. Accent underline on focus,
 * negative underline + error message on error.
 */
export default function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  prefix,
  suffix,
  error,
  optional = false,
  id: providedId,
  name,
  className,
  disabled = false,
  autoFocus = false,
}: FloatingInputProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const [isFocused, setIsFocused] = useState(false)

  const isFloating = isFocused || value.length > 0

  const labelText = optional && isFloating ? `${label} (opcional)` : label

  return (
    <div className={cn('relative', className)}>
      {/* Label */}
      <label
        htmlFor={id}
        className={cn(
          'absolute left-0 pointer-events-none',
          'transition-all duration-200 ease-out',
          prefix && !isFloating ? 'left-5' : 'left-0',
          isFloating
            ? 'top-[-8px] text-[11px] uppercase tracking-[2px] text-text-secondary'
            : 'top-[10px] text-sm text-text-tertiary',
        )}
      >
        {labelText}
      </label>

      {/* Prefix */}
      {prefix && (
        <span className="absolute left-0 top-[10px] text-xs text-text-tertiary pointer-events-none">
          {prefix}
        </span>
      )}

      {/* Input */}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full bg-transparent font-sans text-sm text-text-primary',
          'border-0 border-b outline-none focus-visible:outline-none',
          'py-[10px] px-0',
          'transition-all duration-200',
          prefix && 'pl-5',
          suffix && 'pr-5',
          error
            ? 'border-negative'
            : isFocused
              ? 'border-accent'
              : 'border-border-divider',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />

      {/* Suffix */}
      {suffix && (
        <span className="absolute right-0 top-[10px] text-xs text-text-tertiary pointer-events-none">
          {suffix}
        </span>
      )}

      {/* Error message */}
      {error && <p className="mt-1 text-[11px] text-negative">{error}</p>}
    </div>
  )
}
