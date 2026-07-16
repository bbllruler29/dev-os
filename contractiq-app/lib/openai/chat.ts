import { getOpenAIClient } from './client'
import { withRetry } from './withRetry'
import type { QueryClassification } from '@/types/chatMessage'

export { parseCitation } from '@/lib/utils/citation'

const HISTORY_REFERENCE_PATTERNS = [
  /\byou (said|mentioned|told me)\b/i,
  /\bearlier\b/i,
  /\bbefore\b/i,
  /\bprevious(ly)?\b/i,
  /\bagain\b/i,
  /\bwe (talked|discussed)\b/i,
]

export function classifyQuery(message: string, hasHistory: boolean): QueryClassification {
  if (!hasHistory) return 'contract'

  const referencesHistory = HISTORY_REFERENCE_PATTERNS.some((pattern) => pattern.test(message))
  return referencesHistory ? 'both' : 'contract'
}

const SYSTEM_PROMPT = `You are the ContractIQ assistant. You answer questions about a specific NDA or MSA contract on behalf of a non-lawyer user.

Rules:
- Answer only from the document text provided below. If the answer is not in the document, say so clearly — for example "I cannot find this in the document." This is a valid, expected answer, not a failure.
- Every answer must end with a page citation in the exact format "[Page X]", referencing the page where your answer is grounded. If your answer draws on conversation history rather than the document, omit the citation.
- Be concise and plain-spoken — the user is not a lawyer.
- Never invent contract terms or clauses that are not present in the text.`

export function buildChatMessages(params: {
  contractText: string
  history: { role: 'user' | 'assistant'; content: string }[]
  message: string
  classification: QueryClassification
}): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const contextNote =
    params.classification === 'both'
      ? 'The user may be referring to earlier parts of this conversation as well as the document — consider both.'
      : 'Answer based on the document text below.'

  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${contextNote}\n\nDocument text:\n${params.contractText}`,
    },
    ...params.history,
    { role: 'user', content: params.message },
  ]
}

export async function streamChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
) {
  const client = getOpenAIClient()

  return withRetry(() =>
    client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 1000,
      stream: true,
      messages,
    })
  )
}
