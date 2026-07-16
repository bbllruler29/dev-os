import { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  tone?: 'default' | 'warning'
}

export function Tooltip({ content, children, tone = 'default' }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex items-center">
      <span tabIndex={0} className="outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-xs w-max max-w-[240px] -translate-x-1/2 rounded-input px-sm py-xs text-small opacity-0 shadow-lg transition-opacity duration-150 ease-out group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${
          tone === 'warning'
            ? 'bg-semantic-error text-white'
            : 'bg-text-primary text-white'
        }`}
      >
        {content}
      </span>
    </span>
  )
}
