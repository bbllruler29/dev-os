import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ContractSummary } from '@/types/contract'

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async (): Promise<ContractSummary[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_name, contract_type, status, created_at')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data as ContractSummary[]
    },
  })
}
