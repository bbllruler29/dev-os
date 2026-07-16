'use client'

import type { ContractType } from '@/types/contract'

const OPTIONS: { value: ContractType; label: string; description: string }[] = [
  { value: 'NDA', label: 'NDA', description: 'Non-Disclosure Agreement' },
  { value: 'MSA', label: 'MSA', description: 'Master Services Agreement' },
]

interface ContractTypeSelectorProps {
  value: ContractType | null
  onChange: (value: ContractType) => void
  disabled?: boolean
}

export function ContractTypeSelector({ value, onChange, disabled }: ContractTypeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Contract type" className="grid grid-cols-2 gap-md">
      {OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-card border p-lg text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? 'border-brand-primary bg-brand-accent-light'
                : 'border-border bg-surface-elevated hover:border-brand-secondary'
            }`}
          >
            <p className="text-h4 text-text-primary">{option.label}</p>
            <p className="text-body text-text-secondary">{option.description}</p>
          </button>
        )
      })}
    </div>
  )
}
