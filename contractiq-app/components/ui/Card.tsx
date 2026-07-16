import { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface-elevated p-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
