# Dashboard

Implements FR-10, US-008, and Flows A/B (Sections 4).

## Components

```
app/(dashboard)/dashboard/page.tsx
components/dashboard/DashboardSummaryCard.tsx
components/dashboard/ContractHistoryTable.tsx
hooks/useContracts.ts        — ['contracts', userId]
hooks/useDashboardStats.ts   — ['dashboardStats', userId]
```

## Data Fetching

Both reads are **direct Supabase client reads** (RLS-scoped), wrapped in TanStack Query — not Route Handlers, per the engineering doc's pattern ("direct read for simple RLS-scoped queries, Route Handler for anything touching OpenAI or requiring server-only logic").

```ts
// hooks/useContracts.ts
export function useContracts(userId: string) {
  return useQuery({
    queryKey: ['contracts', userId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_name, contract_type, status, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
```

```ts
// hooks/useDashboardStats.ts
export function useDashboardStats(userId: string) {
  return useQuery({
    queryKey: ['dashboardStats', userId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_type')
      if (error) throw error
      return {
        total: data.length,
        nda: data.filter((c) => c.contract_type === 'NDA').length,
        msa: data.filter((c) => c.contract_type === 'MSA').length,
      }
    },
  })
}
```

## `DashboardSummaryCard`

- Shows total contracts reviewed + breakdown by type (NDA / MSA counts).
- Prominent "Review a Contract" CTA button linking to `/contracts/upload`.

## `ContractHistoryTable`

- Shows the last 5 contracts (or all, sortable — FR-10 requires the table to be **sortable** by date/name/type; showing the most recent 5 by default on the dashboard is Flow B's stated behavior, with a link to a full history if needed).
- Columns: Contract Name, Type, Status (colored per design system's Contract Status tokens: Completed `#16A34A`, Processing `#F59E0B`, Failed `#DC2626`, Draft `#64748B`), Date.
- Clicking a row navigates to `/contracts/[contractId]`.
- Sortable column headers (click to toggle asc/desc) — client-side sort on the already-fetched `['contracts', userId]` data, no refetch needed per sort toggle.

## Empty State (Flow A, step 4)

When `['contracts', userId]` returns zero rows, render exact copy: **"No contracts reviewed yet — upload your first contract to begin"** with the same "Review a Contract" CTA.

## Invalidation

- Uploading a contract invalidates `['contracts', userId]` (and by extension the summary stats should be recomputed — invalidate `['dashboardStats', userId]` too on upload success).
- Processing a contract invalidates `['contracts', userId]` (status change from `uploaded` → `processing` → `completed`).
