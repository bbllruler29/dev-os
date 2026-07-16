'use client'

import { MessageSquareText, X } from 'lucide-react'
import { useUIState } from '@/providers/UIStateContext'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useSendChatMessage } from '@/hooks/useSendChatMessage'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

interface ChatPanelProps {
  contractId: string
  isAvailable: boolean
}

export function ChatPanel({ contractId, isAvailable }: ChatPanelProps) {
  const { chatOpen, setChatOpen } = useUIState()
  const messagesQuery = useChatMessages(contractId)
  const { sendMessage, isStreaming, streamingText, error } = useSendChatMessage(contractId)

  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        disabled={!isAvailable}
        aria-label="Chat with Contract"
        title={isAvailable ? 'Chat with Contract' : 'Available once processing is complete'}
        className="fixed bottom-xl right-xl flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform duration-150 ease-out hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MessageSquareText size={24} strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-xl right-xl flex h-[560px] w-[380px] flex-col rounded-card border border-border bg-surface-elevated shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-md py-sm">
        <span className="text-h4 text-text-primary">Chat with Contract</span>
        <button
          onClick={() => setChatOpen(false)}
          aria-label="Close chat"
          className="rounded-input p-xs text-text-muted hover:bg-canvas-subtle"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      {messagesQuery.isLoading && <LoadingState label="Loading chat history…" />}

      {messagesQuery.isError && (
        <ErrorState message="Couldn't load chat history." onRetry={() => messagesQuery.refetch()} />
      )}

      {!messagesQuery.isLoading && !messagesQuery.isError && messagesQuery.data && (
        <ChatMessageList
          messages={messagesQuery.data}
          streamingText={streamingText}
          isStreaming={isStreaming}
        />
      )}

      {error && <p className="px-md py-xs text-small text-semantic-error">{error}</p>}

      <ChatInput onSend={sendMessage} disabled={isStreaming || messagesQuery.isLoading} />
    </div>
  )
}
