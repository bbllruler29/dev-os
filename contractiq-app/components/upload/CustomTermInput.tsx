'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAddCustomTerm } from '@/hooks/useAddCustomTerm'
import { MAX_CUSTOM_TERMS } from '@/lib/constants/standardTerms'
import type { CustomKeyTerm } from '@/types/contract'

interface CustomTermInputProps {
  contractId: string
  customTerms: CustomKeyTerm[]
  onAdded: (term: CustomKeyTerm) => void
}

export function CustomTermInput({ contractId, customTerms, onAdded }: CustomTermInputProps) {
  const [termName, setTermName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const addTerm = useAddCustomTerm()

  const atLimit = customTerms.length >= MAX_CUSTOM_TERMS

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!termName.trim()) return

    setError(null)
    addTerm.mutate(
      { contractId, termName: termName.trim() },
      {
        onSuccess: (term) => {
          onAdded(term)
          setTermName('')
        },
        onError: (err) => setError((err as Error).message),
      }
    )
  }

  return (
    <div>
      <h2 className="mb-sm text-h4 text-text-primary">3. Add custom key terms (optional)</h2>

      {customTerms.length > 0 && (
        <div className="mb-sm flex flex-wrap gap-xs">
          {customTerms.map((term) => (
            <Badge key={term.id} tone="primary">
              {term.term_name}
            </Badge>
          ))}
        </div>
      )}

      {!atLimit && (
        <form onSubmit={handleSubmit} className="flex gap-sm">
          <Input
            value={termName}
            onChange={(e) => setTermName(e.target.value)}
            placeholder="e.g. Data Retention Period"
            disabled={addTerm.isPending}
            error={error ?? undefined}
            className="flex-1"
          />
          <Button type="submit" variant="ghost" isLoading={addTerm.isPending} disabled={!termName.trim()}>
            <Plus size={18} strokeWidth={1.5} />
            Add Key Term
          </Button>
        </form>
      )}

      {atLimit && (
        <p className="text-small text-text-muted">You&apos;ve reached the maximum of 5 custom terms.</p>
      )}
    </div>
  )
}
