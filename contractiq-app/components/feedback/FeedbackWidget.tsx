'use client'

import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSubmitFeedback } from '@/hooks/useSubmitFeedback'

export function FeedbackWidget({ contractId }: { contractId: string }) {
  const [selectedRating, setSelectedRating] = useState<'up' | 'down' | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const submitFeedback = useSubmitFeedback()

  function handleRate(rating: 'up' | 'down') {
    setSelectedRating(rating)
    if (rating === 'up') {
      submitFeedback.mutate(
        { contractId, rating },
        { onSuccess: () => setIsSubmitted(true) }
      )
    }
  }

  function handleSubmitComment() {
    if (!selectedRating) return
    submitFeedback.mutate(
      { contractId, rating: selectedRating, comment: comment.trim() || undefined },
      { onSuccess: () => setIsSubmitted(true) }
    )
  }

  if (isSubmitted) {
    return <p className="text-body text-text-secondary">Thanks for your feedback.</p>
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-sm">
        <span className="text-body text-text-secondary">Was this extraction accurate?</span>
        <button
          onClick={() => handleRate('up')}
          disabled={submitFeedback.isPending}
          aria-label="Thumbs up"
          className={`rounded-input p-xs transition-colors ${
            selectedRating === 'up' ? 'bg-semantic-success/10 text-semantic-success' : 'text-text-muted hover:bg-canvas-subtle'
          }`}
        >
          <ThumbsUp size={18} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => handleRate('down')}
          disabled={submitFeedback.isPending}
          aria-label="Thumbs down"
          className={`rounded-input p-xs transition-colors ${
            selectedRating === 'down' ? 'bg-semantic-error/10 text-semantic-error' : 'text-text-muted hover:bg-canvas-subtle'
          }`}
        >
          <ThumbsDown size={18} strokeWidth={1.5} />
        </button>
      </div>

      {selectedRating === 'down' && (
        <div className="flex flex-col gap-sm">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went wrong? (optional)"
            disabled={submitFeedback.isPending}
            rows={3}
            className="rounded-input border border-border-strong px-md py-sm text-body text-text-primary outline-none transition-colors focus:border-brand-primary"
          />
          <Button
            variant="ghost"
            onClick={handleSubmitComment}
            isLoading={submitFeedback.isPending}
            className="self-start"
          >
            Submit Feedback
          </Button>
        </div>
      )}

      {submitFeedback.isError && (
        <p className="text-small text-semantic-error">{(submitFeedback.error as Error).message}</p>
      )}
    </div>
  )
}
