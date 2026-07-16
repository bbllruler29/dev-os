'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function SourceSentenceTooltip({ sourceSentence }: { sourceSentence: string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!sourceSentence) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-xs text-small font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover"
      >
        Why?
        {isOpen ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
      </button>
      {isOpen && (
        <blockquote className="mt-xs rounded-input bg-canvas-subtle px-md py-sm font-mono text-small text-text-secondary">
          &ldquo;{sourceSentence}&rdquo;
        </blockquote>
      )}
    </div>
  )
}
