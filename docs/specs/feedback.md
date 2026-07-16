# Feedback (Thumbs Up/Down)

Implements FR-12, US-010 (P2).

## Component

`components/feedback/FeedbackWidget.tsx` — thumbs up / thumbs down buttons, shown on the results page (per key term or per contract — the PRD does not specify granularity beyond "thumbs up/down feedback with optional comment"; scope this per-contract, attached to the overall extraction quality, not per individual term).

## `POST /api/contracts/[id]/feedback`

- **Body:** `{ "rating": "up" | "down", "comment"?: string }` (Zod: `rating` required enum, `comment` optional, max 1000 chars).
- **Auth:** verify `contracts.user_id = auth.uid()`.
- **Processing:** `INSERT INTO user_feedback (contract_id, user_id, rating, comment)`.
- **Response `201`:** the created `user_feedback` row.

## `hooks/useSubmitFeedback.ts`

```ts
export function useSubmitFeedback(contractId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { rating: 'up' | 'down'; comment?: string }) => {
      const res = await fetch(`/api/contracts/${contractId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error((await res.json()).error.message)
      return res.json()
    },
  })
}
```

## UX

- Selecting thumbs down reveals an optional comment textarea before submitting.
- After submission, show a brief confirmation ("Thanks for your feedback") and disable further submissions for that contract (one feedback entry per contract per user — not enforced at the DB level since the PRD doesn't state a uniqueness constraint, but the UI should prevent duplicate submissions in the same session).

## Edge Cases

- Comment provided without a rating → blocked client-side (`rating` is required).
- Submitting feedback on a contract still `processing` → allowed; feedback is about the review experience generally, not gated on `status`.
