'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-xs">
        <input
          ref={ref}
          className={`h-11 rounded-input border px-md text-body text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-primary ${
            error ? 'border-semantic-error' : 'border-border-strong'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-small text-semantic-error">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
