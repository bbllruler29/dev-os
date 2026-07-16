import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { KeyTerm } from '@/types/keyTerm'

async function processContract(contractId: string): Promise<{ key_terms: KeyTerm[]; status: string }> {
  const res = await fetch(`/api/contracts/${contractId}/process`, { method: 'POST' })
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Processing failed.')
  }

  return body
}

export function useProcessContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: processContract,
    onSuccess: (_data, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['keyTerms', contractId] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
    },
  })
}
