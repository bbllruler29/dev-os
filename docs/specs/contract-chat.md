# Contract Chat (SSE Streaming)

Implements FR-08, FR-09, US-007, US-012, and Decision #3 (SSE, not Supabase Realtime).

## Components

```
components/chat/ChatPanel.tsx          — 'use client', sidebar tab within the results page
components/chat/ChatMessageList.tsx
components/chat/ChatMessageBubble.tsx  — user right-aligned, assistant left-aligned
components/chat/ChatInput.tsx
hooks/useChatMessages.ts               — ['chatMessages', sessionId] query, loads history
hooks/useSendChatMessage.ts            — SSE-aware mutation
lib/openai/chat.ts                     — RAG prompt builder + streaming call
```

## User Flow

1. User clicks the floating "Chat with Contract" button → `ChatPanel` opens as a sidebar tab (not a route change).
2. On open, `useChatMessages(sessionId)` fetches persisted history via `GET /api/contracts/[id]/chat/messages`.
3. User types a question, submits via `ChatInput`.
4. `useSendChatMessage` immediately appends the user's message to the `['chatMessages', sessionId]` cache (optimistic).
5. It opens a streaming connection (SSE) to `POST /api/contracts/[id]/chat`.
6. Token deltas render incrementally into the assistant bubble as they arrive.
7. On the stream's `done` event, TanStack Query reconciles the streamed text with the persisted row (refetch or merge the server-confirmed `chat_messages` insert).
8. The completed response shows a "Source: Page X" citation, clickable — sets `targetPage` in `UIStateContext` to jump the PDF/text viewer.

## `POST /api/contracts/[id]/chat`

- **Runtime:** `export const runtime = 'nodejs'` — required because the OpenAI streaming SDK needs Node APIs, not Edge.
- **Auth & preconditions:** verify `contracts.user_id = auth.uid()` and `contracts.status = 'completed'`. If not completed, `422` `{ error: { code: 'VALIDATION_ERROR', message: 'Contract must finish processing before chat is available.' } }`.
- **Body:** `{ "message": string }` (Zod: 1–4000 chars).
- **Steps:**
  1. Find or create the `chat_sessions` row for this `contract_id` (1:1 relationship — `SELECT ... WHERE contract_id = $1`, insert if none exists).
  2. `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 200` to build conversation history.
  3. Run the lightweight heuristic query-classification (`lib/openai/chat.ts`, function `classifyQuery`) — keyword/pattern-based, **no extra LLM call** — producing `'contract' | 'history' | 'both'`, used to adjust the system prompt's emphasis.
  4. Build the RAG prompt: full `contracts.contract_text` + the up-to-200-message history + the system prompt: *"Answer only from the document text provided. If the answer is not in the document, say so."* Every response must include a `[Page X]` citation.
  5. Call OpenAI with `stream: true`, temperature `0.4`, max output tokens `1000`.
  6. Relay each token delta to the client as an SSE event via a `ReadableStream`/`TransformStream`.
  7. On stream completion: parse the mandatory `[Page X]` citation from the full text (regex `/\[Page (\d+)\]/i`), then in one write: `INSERT INTO chat_messages` for **both** the user message and the assistant message (`role='user'` and `role='assistant'`), including `citation_page` and `query_classification` on the assistant row.
  8. The DB is never written to mid-stream — only after the full response is assembled server-side.
- **SSE event format:**
  ```
  event: delta
  data: {"text": "The confidentiality"}

  event: delta
  data: {"text": " obligation survives"}

  event: done
  data: {"citation_page": 4}
  ```
- **Errors:** if OpenAI fails after 3 retries (1s/2s/4s), emit an `event: error` SSE event with `{ "message": "Try again in a few minutes." }` and close the stream; do not persist a partial assistant message.

## `lib/openai/chat.ts`

```ts
export function classifyQuery(message: string, hasHistory: boolean): 'contract' | 'history' | 'both' {
  // heuristic: pattern-match phrases like "you said", "earlier", "before" -> 'history' or 'both'
  // otherwise -> 'contract'. No LLM call.
}

export async function buildChatPrompt(params: {
  contractText: string
  history: { role: 'user' | 'assistant'; content: string }[]
  message: string
  classification: 'contract' | 'history' | 'both'
}): Promise<{ system: string; messages: { role: string; content: string }[] }> {
  // system prompt: document-only grounding + mandatory [Page X] citation instruction
}

export async function streamChatCompletion(params: {
  system: string
  messages: { role: string; content: string }[]
}): Promise<AsyncIterable<string>> {
  // OpenAI stream: true, temperature 0.4, max_tokens 1000, wrapped in withRetry for the initial call
}
```

## `GET /api/contracts/[id]/chat/messages`

- Loads persisted history on page (re)load (US-012).
- `SELECT id, role, content, citation_page, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`.
- **No Supabase Realtime channel anywhere in this flow** — this is a plain request/response fetch, matching Decision #3.

## Hallucination Guardrails (applied here)

- System prompt is strictly document-only: *"Answer only from the document text provided. If the answer is not in the document, say so."*
- "I cannot find this in the document" is a valid, expected response — not an error state, not retried, not flagged.
- Every response must carry a `[Page X]` citation; if the model omits it, treat the response as still valid to display but log a warning (do not block the user) — do not force a retry loop that could double the latency for every chat turn.

## Edge Cases

- Contract `status != 'completed'` → chat entry point (floating button) is disabled/hidden until processing finishes.
- User asks something answerable only from prior chat turns (not the document) → `classifyQuery` returns `'history'` or `'both'`, prompt weighting shifts toward conversation history while still including the document.
- Question entirely out of scope of the document → assistant responds "I cannot find this in the document" per the system prompt — verified by the automated regression test in `docs/specs/` testing strategy (Section 13 of the engineering doc).
- SSE connection drops mid-stream (network blip) → client shows a "Connection lost — retry" affordance; no partial message is persisted server-side since persistence only happens on `done`.
