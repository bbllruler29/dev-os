import { useMutation } from '@tanstack/react-query'

interface SubmitFeedbackInput {
  contractId: string
  rating: 'up' | 'down'
  comment?: string
}

async function submitFeedback({ contractId, rating, comment }: SubmitFeedbackInput) {
  const res = await fetch(`/api/contracts/${contractId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  })
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Failed to submit feedback.')
  }

  return body
}

export function useSubmitFeedback() {
  return useMutation({ mutationFn: submitFeedback })
}
