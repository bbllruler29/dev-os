import { useMutation, useQueryClient } from '@tanstack/react-query'

async function deleteContract(contractId: string): Promise<void> {
  const res = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? 'Failed to delete the contract.')
  }
}

export function useDeleteContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    },
  })
}
