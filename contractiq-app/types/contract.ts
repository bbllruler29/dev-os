export type ContractType = 'NDA' | 'MSA'

export type ContractStatus = 'uploaded' | 'processing' | 'completed' | 'error'

export interface Contract {
  id: string
  user_id: string
  contract_name: string
  contract_type: ContractType
  status: ContractStatus
  file_path: string | null
  contract_text: string | null
  page_count: number | null
  processing_error: string | null
  detected_contract_type: ContractType | null
  last_accessed_at: string
  created_at: string
  updated_at: string
}

export interface ContractSummary {
  id: string
  contract_name: string
  contract_type: ContractType
  status: ContractStatus
  created_at: string
}

export interface DashboardStats {
  total: number
  nda: number
  msa: number
}

export interface CustomKeyTerm {
  id: string
  contract_id: string
  user_id: string
  term_name: string
  created_at: string
}
