import { useUIState } from '@/providers/UIStateContext'
import type { ChatMessage } from '@/types/chatMessage'

interface ChatMessageBubbleProps {
  role: ChatMessage['role']
  content: string
  citationPage?: number | null
}

export function ChatMessageBubble({ role, content, citationPage }: ChatMessageBubbleProps) {
  const { setTargetPage } = useUIState()
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-card px-md py-sm text-body ${
          isUser ? 'bg-brand-primary text-white' : 'bg-surface text-text-primary'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {citationPage && (
          <button
            onClick={() => setTargetPage(citationPage)}
            className={`mt-xs text-small font-semibold underline ${
              isUser ? 'text-white/80' : 'text-brand-primary'
            }`}
          >
            Source: Page {citationPage}
          </button>
        )}
      </div>
    </div>
  )
}
