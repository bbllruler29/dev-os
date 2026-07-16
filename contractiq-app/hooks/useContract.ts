import { useQuery } from '@tanstack/react-query'
import type { Contract, CustomKeyTerm } from '@/types/contract'
import type { KeyTerm } from '@/types/keyTerm'

export interface ContractDetail {
  contract: Contract
  key_terms: KeyTerm[]
  custom_key_terms: CustomKeyTerm[]
}

async function fetchContract(contractId: string): Promise<ContractDetail> {
  const res = await fetch(`/api/contracts/${contractId}`)
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Failed to load contract.')
  }

  return body as ContractDetail
}

export function useContract(contractId: string) {
  return useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => fetchContract(contractId),
    enabled: !!contractId,
    refetchInterval: (query) => (query.state.data?.contract.status === 'processing' ? 3000 : false),
  })
}
