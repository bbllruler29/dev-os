'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

const STEPS = ['Extracting text', 'Analysing with AI', 'Compiling results']

const STEP_DURATIONS_MS = [800, 6000]

export function ProcessingProgress({ isComplete }: { isComplete: boolean }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (isComplete) {
      setActiveStep(STEPS.length - 1)
      return
    }

    const timers = STEP_DURATIONS_MS.map((duration, index) =>
      setTimeout(() => setActiveStep(index + 1), duration)
    )

    return () => timers.forEach(clearTimeout)
  }, [isComplete])

  return (
    <div className="flex flex-col gap-md">
      {STEPS.map((step, index) => {
        const isDone = isComplete || index < activeStep
        const isActive = !isComplete && index === activeStep

        return (
          <div key={step} className="flex items-center gap-sm">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                isDone ? 'bg-semantic-success text-white' : isActive ? 'bg-brand-primary text-white' : 'bg-border text-text-muted'
              }`}
            >
              {isDone ? (
                <Check size={14} strokeWidth={2} />
              ) : isActive ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <span className="text-small">{index + 1}</span>
              )}
            </div>
            <span className={`text-body ${isDone || isActive ? 'text-text-primary' : 'text-text-muted'}`}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}
