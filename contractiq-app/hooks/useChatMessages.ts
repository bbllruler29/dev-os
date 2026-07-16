import { useQuery } from '@tanstack/react-query'
import type { ChatMessage } from '@/types/chatMessage'

async function fetchChatMessages(contractId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/contracts/${contractId}/chat/messages`)
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error?.message ?? 'Failed to load chat history.')
  }

  return body.messages as ChatMessage[]
}

export function useChatMessages(contractId: string) {
  return useQuery({
    queryKey: ['chatMessages', contractId],
    queryFn: () => fetchChatMessages(contractId),
    enabled: !!contractId,
  })
}
