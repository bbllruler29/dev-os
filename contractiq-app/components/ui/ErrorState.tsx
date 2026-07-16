'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm rounded-card border border-border bg-surface-elevated p-3xl text-center">
      <AlertTriangle size={24} strokeWidth={1.5} className="text-semantic-error" />
      <h3 className="text-h4 text-text-primary">{title}</h3>
      <p className="max-w-md text-body text-text-secondary">{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry} className="mt-sm">
          Try again
        </Button>
      )}
    </div>
  )
}
