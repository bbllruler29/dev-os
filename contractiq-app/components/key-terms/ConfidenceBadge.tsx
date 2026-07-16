import { AlertTriangle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { getConfidenceBand } from '@/types/keyTerm'

const BAND_CLASSES: Record<ReturnType<typeof getConfidenceBand>, string> = {
  high: 'bg-confidence-high/10 text-confidence-high',
  good: 'bg-confidence-good/10 text-confidence-good',
  medium: 'bg-confidence-medium/10 text-confidence-medium',
  low: 'bg-confidence-low/10 text-confidence-low',
}

export function ConfidenceBadge({ score }: { score: number }) {
  const band = getConfidenceBand(score)
  const isLowConfidence = band === 'low'

  const badge = (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-sm py-xs text-small font-semibold ${BAND_CLASSES[band]}`}
    >
      {isLowConfidence && <AlertTriangle size={14} strokeWidth={1.5} />}
      {Math.round(score)}%
    </span>
  )

  if (!isLowConfidence) {
    return badge
  }

  return (
    <Tooltip
      tone="warning"
      content="Low confidence — we recommend verifying this in the document directly."
    >
      {badge}
    </Tooltip>
  )
}
