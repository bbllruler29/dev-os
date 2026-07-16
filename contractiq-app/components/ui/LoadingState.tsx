import { Loader2 } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm py-3xl text-text-muted">
      <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-brand-primary" />
      <p className="text-body">{label}</p>
    </div>
  )
}
