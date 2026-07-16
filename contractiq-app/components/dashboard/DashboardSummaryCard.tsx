import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DashboardStats } from '@/types/contract'

export function DashboardSummaryCard({ stats }: { stats: DashboardStats }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-lg">
      <div className="flex gap-2xl">
        <div>
          <p className="text-small text-text-muted">Total Reviewed</p>
          <p className="text-h2 text-text-primary">{stats.total}</p>
        </div>
        <div>
          <p className="text-small text-text-muted">NDAs</p>
          <p className="text-h2 text-text-primary">{stats.nda}</p>
        </div>
        <div>
          <p className="text-small text-text-muted">MSAs</p>
          <p className="text-h2 text-text-primary">{stats.msa}</p>
        </div>
      </div>

      <Link href="/contracts/upload">
        <Button variant="primary">
          <Plus size={18} strokeWidth={1.5} />
          Review a Contract
        </Button>
      </Link>
    </Card>
  )
}
