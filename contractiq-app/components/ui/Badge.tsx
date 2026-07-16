import { HTMLAttributes } from 'react'

type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-semantic-success/10 text-semantic-success',
  warning: 'bg-semantic-warning/10 text-semantic-warning',
  error: 'bg-semantic-error/10 text-semantic-error',
  info: 'bg-semantic-info/10 text-semantic-info',
  neutral: 'bg-canvas-subtle text-text-muted',
  primary: 'bg-brand-accent-light text-brand-primary',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-sm py-xs text-small font-semibold ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
