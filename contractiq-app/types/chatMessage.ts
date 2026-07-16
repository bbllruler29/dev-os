export type ChatRole = 'user' | 'assistant'

export type QueryClassification = 'contract' | 'history' | 'both'

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: ChatRole
  content: string
  citation_page: number | null
  query_classification: QueryClassification | null
  created_at: string
}
