import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { ChatMessageSchema } from '@/lib/validation/schemas'
import { buildChatMessages, classifyQuery, parseCitation, streamChatCompletion } from '@/lib/openai/chat'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, rateLimitedResponse } from '@/lib/security/rateLimiter'
import { sanitizeForLLM, PromptInjectionDetectedError } from '@/lib/security/promptInjectionGuard'
import { verifyContractOwnership, findOwnedSession } from '@/lib/security/chatSecurity'
import { MAX_CHAT_HISTORY } from '@/lib/security/tokenLimiter'

export const runtime = 'nodejs'

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const rateLimit = await checkRateLimit(user.id, 'chat')
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds)
  }

  const ownership = await verifyContractOwnership(supabase, params.id, user.id, 'id, contract_text, status')
  if (ownership.error) return ownership.error
  const contract = ownership.record as { id: string; contract_text: string | null; status: string }

  if (contract.status !== 'completed') {
    return apiError('VALIDATION_ERROR', 'Contract must finish processing before chat is available.')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid request body.')
  }

  const parsed = ChatMessageSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid message.')
  }

  let userMessage: string
  try {
    userMessage = sanitizeForLLM(parsed.data.message)
  } catch (err) {
    if (err instanceof PromptInjectionDetectedError) {
      return apiError('PROMPT_INJECTION', 'This message could not be processed.')
    }
    throw err
  }

  let session = await findOwnedSession(supabase, params.id, user.id)

  if (!session) {
    const { data: newSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({ contract_id: params.id, user_id: user.id })
      .select('id')
      .single()

    if (sessionError || !newSession) {
      return apiError('INTERNAL_ERROR', 'Failed to start a chat session.')
    }
    session = newSession
  }

  const { data: historyRows } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(MAX_CHAT_HISTORY)

  const history = (historyRows ?? []) as { role: 'user' | 'assistant'; content: string }[]
  const classification = classifyQuery(userMessage, history.length > 0)

  const messages = buildChatMessages({
    contractText: contract.contract_text ?? '',
    history,
    message: userMessage,
    classification,
  })

  const encoder = new TextEncoder()
  const sessionId = session.id

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const completion = await streamChatCompletion(messages)

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            fullText += delta
            controller.enqueue(encoder.encode(sseEvent('delta', { text: delta })))
          }
        }

        const citationPage = parseCitation(fullText)

        const { error: insertError } = await supabase.from('chat_messages').insert([
          {
            session_id: sessionId,
            user_id: user.id,
            role: 'user',
            content: userMessage,
            query_classification: classification,
          },
          {
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: fullText,
            citation_page: citationPage,
            query_classification: classification,
          },
        ])

        if (insertError) {
          controller.enqueue(encoder.encode(sseEvent('error', { message: 'Failed to save the conversation.' })))
        } else {
          controller.enqueue(encoder.encode(sseEvent('done', { citation_page: citationPage })))
        }
      } catch {
        controller.enqueue(encoder.encode(sseEvent('error', { message: 'Try again in a few minutes.' })))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
