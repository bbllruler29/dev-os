'use client'

import { useContracts } from '@/hooks/useContracts'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { DashboardSummaryCard } from '@/components/dashboard/DashboardSummaryCard'
import { ContractHistoryTable } from '@/components/dashboard/ContractHistoryTable'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DashboardPage() {
  const contractsQuery = useContracts()
  const statsQuery = useDashboardStats()

  const isLoading = contractsQuery.isLoading || statsQuery.isLoading
  const isError = contractsQuery.isError || statsQuery.isError

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-lg">
      <h1 className="text-h1 text-text-primary">Dashboard</h1>

      {isLoading && <LoadingState label="Loading your dashboard…" />}

      {isError && !isLoading && (
        <ErrorState
          message="We couldn't load your dashboard. Please try again."
          onRetry={() => {
            contractsQuery.refetch()
            statsQuery.refetch()
          }}
        />
      )}

      {!isLoading && !isError && statsQuery.data && contractsQuery.data && (
        <>
          <DashboardSummaryCard stats={statsQuery.data} />
          <div>
            <h2 className="mb-md text-h3 text-text-primary">Recent Contracts</h2>
            <ContractHistoryTable contracts={contractsQuery.data} limit={5} />
          </div>
        </>
      )}
    </div>
  )
}
