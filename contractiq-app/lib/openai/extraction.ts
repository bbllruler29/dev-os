import { getOpenAIClient } from './client'
import { withRetry } from './withRetry'
import { ExtractionResponseSchema, type ExtractionResponse } from '@/lib/validation/schemas'
import { STANDARD_TERMS } from '@/lib/constants/standardTerms'
import type { ContractType } from '@/types/contract'

const FEW_SHOT_EXAMPLES = `
### Example 1 (NDA)
Excerpt: "[PAGE 1]\\nThis Non-Disclosure Agreement is entered into by Acme Corp ('Disclosing Party') and Beta LLC ('Receiving Party') effective as of March 1, 2024."
Output: { "term_name": "Parties", "value": "Acme Corp and Beta LLC", "page_number": 1, "confidence_score": 97, "source_sentence": "This Non-Disclosure Agreement is entered into by Acme Corp ('Disclosing Party') and Beta LLC ('Receiving Party') effective as of March 1, 2024." }
Output: { "term_name": "Effective Date", "value": "March 1, 2024", "page_number": 1, "confidence_score": 95, "source_sentence": "This Non-Disclosure Agreement is entered into by Acme Corp ('Disclosing Party') and Beta LLC ('Receiving Party') effective as of March 1, 2024." }

### Example 2 (NDA)
Excerpt: "[PAGE 2]\\nThe obligations of confidentiality under this Agreement shall survive for a period of three (3) years following termination, except that trade secrets shall remain protected indefinitely."
Output: { "term_name": "Term & Duration", "value": "3 years post-termination; trade secrets indefinite", "page_number": 2, "confidence_score": 91, "source_sentence": "The obligations of confidentiality under this Agreement shall survive for a period of three (3) years following termination, except that trade secrets shall remain protected indefinitely." }

### Example 3 (NDA)
Excerpt: "[PAGE 3]\\nAny dispute arising hereunder may be subject to the laws applicable in the relevant jurisdiction."
Output: { "term_name": "Governing Law", "value": "Not clearly specified — refers vaguely to 'the relevant jurisdiction'", "page_number": 3, "confidence_score": 38, "source_sentence": "Any dispute arising hereunder may be subject to the laws applicable in the relevant jurisdiction." }

### Example 4 (MSA)
Excerpt: "[PAGE 1]\\nThis Master Services Agreement is made between Client Inc. and Vendor Co. Vendor shall provide software consulting services as described in each Statement of Work."
Output: { "term_name": "Parties", "value": "Client Inc. and Vendor Co.", "page_number": 1, "confidence_score": 96, "source_sentence": "This Master Services Agreement is made between Client Inc. and Vendor Co. Vendor shall provide software consulting services as described in each Statement of Work." }
Output: { "term_name": "Service Scope", "value": "Software consulting services as described in each Statement of Work", "page_number": 1, "confidence_score": 90, "source_sentence": "Vendor shall provide software consulting services as described in each Statement of Work." }

### Example 5 (MSA)
Excerpt: "[PAGE 4]\\nClient shall pay all undisputed invoices within thirty (30) days of receipt. Amounts unpaid after this period shall accrue interest at 1.5% per month."
Output: { "term_name": "Payment Terms", "value": "Net 30 days", "page_number": 4, "confidence_score": 94, "source_sentence": "Client shall pay all undisputed invoices within thirty (30) days of receipt." }
Output: { "term_name": "Late Payment Penalty", "value": "1.5% per month on unpaid amounts", "page_number": 4, "confidence_score": 93, "source_sentence": "Amounts unpaid after this period shall accrue interest at 1.5% per month." }

### Example 6 (MSA)
Excerpt: "[PAGE 6]\\nEach party's total liability arising out of this Agreement shall not exceed the fees paid in the preceding twelve months, except in cases of gross negligence."
Output: { "term_name": "Liability Cap", "value": "Fees paid in preceding 12 months, except gross negligence", "page_number": 6, "confidence_score": 89, "source_sentence": "Each party's total liability arising out of this Agreement shall not exceed the fees paid in the preceding twelve months, except in cases of gross negligence." }
`.trim()

function buildSystemPrompt(): string {
  return `You are a contract analysis engine for ContractIQ, a tool that extracts key terms from NDA and MSA contracts for non-lawyers.

For every requested term, find the value in the provided contract text and return it as a JSON object with these exact fields:
- term_name (string): the term as given in the request, verbatim
- value (string): the extracted value, concise and readable
- page_number (integer): the 1-indexed page from the nearest preceding [PAGE N] marker
- confidence_score (number 0-100): how confident you are that this value is correct and complete
- source_sentence (string): the verbatim sentence(s) from the contract text that support this value

Rules:
- If a term cannot be found in the document, still include it with your best-effort value, a low confidence_score (below 30), and the most relevant sentence you could find as source_sentence.
- Never fabricate a source_sentence — it must be copied verbatim from the contract text.
- Also return "detected_contract_type" ("NDA" or "MSA") based on the actual content of the document, independent of what the user selected — this is used as a soft mismatch check.
- Return ONLY a single JSON object of the shape { "detected_contract_type": "NDA" | "MSA", "terms": [ ... ] }. No prose, no markdown fences.

Here are labelled examples of correctly extracted terms, spanning high, medium, and low confidence:

${FEW_SHOT_EXAMPLES}`
}

function buildUserPrompt(params: {
  contractType: ContractType
  contractText: string
  customTermNames: string[]
}): string {
  const standardTerms = STANDARD_TERMS[params.contractType]
  const allTerms = [...standardTerms, ...params.customTermNames]

  return `Contract type selected by the user: ${params.contractType}

Extract the following terms: ${allTerms.join(', ')}

Contract text (with [PAGE N] markers):
${params.contractText}`
}

const CORRECTIVE_PROMPT =
  'Your previous response was not valid JSON. Return only the JSON object, no explanation, no markdown fences.'

async function callExtractionModel(system: string, user: string, corrective?: string) {
  const client = getOpenAIClient()
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  if (corrective) {
    messages.push({ role: 'user', content: corrective })
  }

  const completion = await withRetry(() =>
    client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages,
    })
  )

  return completion.choices[0]?.message?.content ?? ''
}

export async function extractKeyTerms(params: {
  contractType: ContractType
  contractText: string
  customTermNames: string[]
}): Promise<ExtractionResponse> {
  const system = buildSystemPrompt()
  const user = buildUserPrompt(params)

  const rawResponse = await callExtractionModel(system, user)

  const firstAttempt = ExtractionResponseSchema.safeParse(safeJsonParse(rawResponse))
  if (firstAttempt.success) {
    return firstAttempt.data
  }

  const retryResponse = await callExtractionModel(system, user, CORRECTIVE_PROMPT)
  const secondAttempt = ExtractionResponseSchema.safeParse(safeJsonParse(retryResponse))
  if (secondAttempt.success) {
    return secondAttempt.data
  }

  throw new Error('OpenAI returned an invalid extraction response after retry.')
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
