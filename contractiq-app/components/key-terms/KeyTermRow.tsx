'use client'

import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ConfidenceBadge } from './ConfidenceBadge'
import { SourceSentenceTooltip } from './SourceSentenceTooltip'
import type { KeyTerm } from '@/types/keyTerm'

interface KeyTermRowProps {
  term: KeyTerm
  onPageClick: (page: number) => void
  onCorrect: (value: string) => void
  isSaving: boolean
}

export function KeyTermRow({ term, onPageClick, onCorrect, isSaving }: KeyTermRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(term.value)

  function startEditing() {
    setDraftValue(term.value)
    setIsEditing(true)
  }

  function handleSave() {
    if (draftValue.trim() && draftValue !== term.value) {
      onCorrect(draftValue.trim())
    }
    setIsEditing(false)
  }

  return (
    <div className="border-b border-border py-md last:border-0">
      <div className="mb-xs flex items-center justify-between gap-sm">
        <div className="flex items-center gap-xs">
          <h3 className="text-body font-semibold text-text-primary">{term.term_name}</h3>
          {term.is_manual && <Badge tone="primary">Custom</Badge>}
          {term.is_edited && <Badge tone="info">Edited</Badge>}
        </div>
        <ConfidenceBadge score={term.confidence_score} />
      </div>

      {isEditing ? (
        <div className="flex items-center gap-xs">
          <input
            autoFocus
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setIsEditing(false)
            }}
            disabled={isSaving}
            className="h-9 flex-1 rounded-input border border-brand-primary px-sm text-body text-text-primary outline-none"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-input p-xs text-semantic-success hover:bg-semantic-success/10"
            aria-label="Save"
          >
            <Check size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="rounded-input p-xs text-text-muted hover:bg-canvas-subtle"
            aria-label="Cancel"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          onClick={startEditing}
          className="group flex w-full items-center justify-between gap-sm rounded-input px-xs py-xs text-left transition-colors hover:bg-canvas-subtle"
        >
          <span className="text-body text-text-secondary">{term.value}</span>
          <Pencil size={14} strokeWidth={1.5} className="shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}

      <div className="mt-xs flex items-center justify-between gap-sm">
        <button
          onClick={() => onPageClick(term.page_number)}
          className="text-small font-semibold text-brand-primary hover:underline"
        >
          Page {term.page_number}
        </button>
        <SourceSentenceTooltip sourceSentence={term.source_sentence} />
      </div>
    </div>
  )
}
