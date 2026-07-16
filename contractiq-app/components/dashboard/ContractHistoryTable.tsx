'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import type { ContractSummary, ContractStatus } from '@/types/contract'

type SortField = 'contract_name' | 'contract_type' | 'created_at'
type SortDirection = 'asc' | 'desc'

const STATUS_TONE: Record<ContractStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-status-completed/10 text-status-completed' },
  processing: { label: 'Processing', className: 'bg-status-processing/10 text-status-processing' },
  error: { label: 'Failed', className: 'bg-status-failed/10 text-status-failed' },
  uploaded: { label: 'Draft', className: 'bg-status-draft/10 text-status-draft' },
}

const COLUMNS: { field: SortField; label: string }[] = [
  { field: 'contract_name', label: 'Contract Name' },
  { field: 'contract_type', label: 'Type' },
  { field: 'created_at', label: 'Date' },
]

export function ContractHistoryTable({
  contracts,
  limit,
}: {
  contracts: ContractSummary[]
  limit?: number
}) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sorted = useMemo(() => {
    const copy = [...contracts]
    copy.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return limit ? copy.slice(0, limit) : copy
  }, [contracts, sortField, sortDirection, limit])

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        title="No contracts reviewed yet — upload your first contract to begin"
        action={
          <Button variant="primary" onClick={() => router.push('/contracts/upload')}>
            Review a Contract
          </Button>
        }
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface-elevated">
      <table className="w-full text-left text-body">
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map(({ field, label }) => (
              <th key={field} className="px-lg py-sm text-small font-semibold text-text-muted">
                <button
                  onClick={() => toggleSort(field)}
                  className="flex items-center gap-xs transition-colors hover:text-text-primary"
                >
                  {label}
                  <ArrowUpDown size={14} strokeWidth={1.5} />
                </button>
              </th>
            ))}
            <th className="px-lg py-sm text-small font-semibold text-text-muted">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((contract) => {
            const status = STATUS_TONE[contract.status]
            return (
              <tr
                key={contract.id}
                onClick={() => router.push(`/contracts/${contract.id}`)}
                className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-canvas-subtle"
              >
                <td className="px-lg py-sm text-text-primary">{contract.contract_name}</td>
                <td className="px-lg py-sm text-text-secondary">{contract.contract_type}</td>
                <td className="px-lg py-sm text-text-secondary">
                  {new Date(contract.created_at).toLocaleDateString()}
                </td>
                <td className="px-lg py-sm">
                  <Badge tone="neutral" className={status.className}>
                    {status.label}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
