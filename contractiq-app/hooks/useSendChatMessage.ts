import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ChatMessage } from '@/types/chatMessage'

interface SseEvent {
  type: string
  data: { text?: string; citation_page?: number | null; message?: string }
}

function parseSseEvents(chunk: string): SseEvent[] {
  return chunk
    .split('\n\n')
    .filter(Boolean)
    .map((rawEvent) => {
      const eventMatch = rawEvent.match(/^event: (.+)$/m)
      const dataMatch = rawEvent.match(/^data: (.+)$/m)
      if (!eventMatch || !dataMatch) return null
      try {
        return { type: eventMatch[1], data: JSON.parse(dataMatch[1]) }
      } catch {
        return null
      }
    })
    .filter((event): event is SseEvent => event !== null)
}

export function useSendChatMessage(contractId: string) {
  const queryClient = useQueryClient()
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(message: string) {
    setError(null)
    setStreamingText('')
    setIsStreaming(true)

    const queryKey = ['chatMessages', contractId]
    queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) => [
      ...old,
      {
        id: `temp-user-${Date.now()}`,
        session_id: '',
        user_id: '',
        role: 'user',
        content: message,
        citation_page: null,
        query_classification: null,
        created_at: new Date().toISOString(),
      },
    ])

    try {
      const res = await fetch(`/api/contracts/${contractId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to send message.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of parseSseEvents(events.join('\n\n'))) {
          if (event.type === 'delta' && event.data.text) {
            accumulated += event.data.text
            setStreamingText(accumulated)
          } else if (event.type === 'done') {
            await queryClient.invalidateQueries({ queryKey })
          } else if (event.type === 'error') {
            throw new Error(event.data.message ?? 'Something went wrong.')
          }
        }
      }
    } catch (err) {
      setError((err as Error).message)
      queryClient.invalidateQueries({ queryKey })
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }

  return { sendMessage, isStreaming, streamingText, error }
}
