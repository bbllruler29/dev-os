import type { ContractType } from '@/types/contract'

export const STANDARD_TERMS: Record<ContractType, string[]> = {
  NDA: [
    'Parties',
    'Effective Date',
    'Confidentiality Obligations',
    'Permitted Disclosures',
    'Term & Duration',
    'Governing Law',
    'Jurisdiction',
    'IP Ownership',
    'Non-Solicitation',
    'Breach & Remedy',
  ],
  MSA: [
    'Parties',
    'Service Scope',
    'Payment Terms',
    'Invoice Schedule',
    'Late Payment Penalty',
    'Liability Cap',
    'Indemnification',
    'IP Ownership',
    'Termination Clause',
    'Governing Law',
    'Dispute Resolution',
    'Notice Period',
  ],
}

export const MAX_CUSTOM_TERMS = 5
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_PAGE_COUNT = 20
export const MIN_EXTRACTED_WORD_COUNT = 100
