export interface KeyTerm {
  id: string
  contract_id: string
  user_id: string
  term_name: string
  value: string
  page_number: number
  confidence_score: number
  source_sentence: string
  is_manual: boolean
  custom_key_term_id: string | null
  is_edited: boolean
  original_ai_value: string | null
  edited_at: string | null
  created_at: string
  updated_at: string
}

export type ConfidenceBand = 'high' | 'good' | 'medium' | 'low'

export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= 90) return 'high'
  if (score >= 70) return 'good'
  if (score >= 50) return 'medium'
  return 'low'
}
