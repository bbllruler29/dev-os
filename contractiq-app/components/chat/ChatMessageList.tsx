'use client'

import { useEffect, useRef } from 'react'
import { ChatMessageBubble } from './ChatMessageBubble'
import { EmptyState } from '@/components/ui/EmptyState'
import { parseCitation } from '@/lib/utils/citation'
import type { ChatMessage } from '@/types/chatMessage'

interface ChatMessageListProps {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean
}

export function ChatMessageList({ messages, streamingText, isStreaming }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText])

  if (messages.length === 0 && !isStreaming) {
    return (
      <EmptyState
        title="Ask a question about this contract"
        description='Try "What happens if I breach this agreement?"'
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-sm overflow-y-auto px-md py-sm">
      {messages.map((message) => (
        <ChatMessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          citationPage={message.citation_page}
        />
      ))}
      {isStreaming && (
        <ChatMessageBubble role="assistant" content={streamingText || '…'} citationPage={parseCitation(streamingText)} />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
