'use client'

import { useMemo } from 'react'
import { KeyTermRow } from './KeyTermRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCorrectKeyTerm } from '@/hooks/useCorrectKeyTerm'
import { useUIState } from '@/providers/UIStateContext'
import { STANDARD_TERMS } from '@/lib/constants/standardTerms'
import type { KeyTerm } from '@/types/keyTerm'
import type { ContractType } from '@/types/contract'

interface KeyTermsPanelProps {
  contractId: string
  contractType: ContractType
  keyTerms: KeyTerm[]
}

export function KeyTermsPanel({ contractId, contractType, keyTerms }: KeyTermsPanelProps) {
  const { setTargetPage } = useUIState()
  const correctTerm = useCorrectKeyTerm(contractId)

  const orderedTerms = useMemo(() => {
    const standardOrder = STANDARD_TERMS[contractType]
    const standardTerms = keyTerms.filter((term) => !term.is_manual)
    const customTerms = keyTerms.filter((term) => term.is_manual)

    standardTerms.sort((a, b) => standardOrder.indexOf(a.term_name) - standardOrder.indexOf(b.term_name))

    return [...standardTerms, ...customTerms]
  }, [keyTerms, contractType])

  if (orderedTerms.length === 0) {
    return (
      <EmptyState
        title="No key terms extracted"
        description="ContractIQ couldn't extract any key terms from this document."
      />
    )
  }

  return (
    <div>
      {orderedTerms.map((term) => (
        <KeyTermRow
          key={term.id}
          term={term}
          onPageClick={setTargetPage}
          onCorrect={(value) => correctTerm.mutate({ contractId, termId: term.id, value })}
          isSaving={correctTerm.isPending && correctTerm.variables?.termId === term.id}
        />
      ))}
    </div>
  )
}
