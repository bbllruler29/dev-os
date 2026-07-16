import { useMutation } from '@tanstack/react-query'
import type { CustomKeyTerm } from '@/types/contract'

async function addCustomTerm({
  contractId,
  termName,
}: {
  contractId: string
  termName: string
}): Promise<CustomKeyTerm> {
  const res = await fetch(`/api/contracts/${contractId}/custom-terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term_name: termName }),
  })
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Failed to add custom term.')
  }

  return body as CustomKeyTerm
}

export function useAddCustomTerm() {
  return useMutation({ mutationFn: addCustomTerm })
}
