import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { KeyTerm } from '@/types/keyTerm'
import type { ContractDetail } from './useContract'

interface CorrectKeyTermInput {
  contractId: string
  termId: string
  value: string
}

async function correctKeyTerm({ contractId, termId, value }: CorrectKeyTermInput): Promise<KeyTerm> {
  const res = await fetch(`/api/contracts/${contractId}/key-terms/${termId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Failed to save the correction.')
  }

  return body as KeyTerm
}

export function useCorrectKeyTerm(contractId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['contract', contractId]

  return useMutation({
    mutationFn: correctKeyTerm,
    onMutate: async ({ termId, value }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ContractDetail>(queryKey)

      if (previous) {
        queryClient.setQueryData<ContractDetail>(queryKey, {
          ...previous,
          key_terms: previous.key_terms.map((term) =>
            term.id === termId ? { ...term, value, is_edited: true } : term
          ),
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
