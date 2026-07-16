import { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm rounded-card border border-dashed border-border-strong bg-canvas-subtle p-3xl text-center">
      <Inbox size={24} strokeWidth={1.5} className="text-text-muted" />
      <h3 className="text-h4 text-text-primary">{title}</h3>
      {description && <p className="max-w-md text-body text-text-secondary">{description}</p>}
      {action && <div className="mt-sm">{action}</div>}
    </div>
  )
}
