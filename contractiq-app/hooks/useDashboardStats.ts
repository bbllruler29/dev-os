import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ContractType, DashboardStats } from '@/types/contract'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('contracts').select('contract_type')

      if (error) throw new Error(error.message)

      const rows = data as { contract_type: ContractType }[]
      return {
        total: rows.length,
        nda: rows.filter((row) => row.contract_type === 'NDA').length,
        msa: rows.filter((row) => row.contract_type === 'MSA').length,
      }
    },
  })
}
