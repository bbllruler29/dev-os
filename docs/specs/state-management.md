# State Management (TanStack Query)

Implements Decision #2 (Section 5 of the engineering doc): all server-state goes through TanStack Query, exclusively. Client-only UI state uses React Context / `useState`.

## Provider Setup

```
providers/QueryProvider.tsx     — TanStack Query client provider, wraps app/layout.tsx
providers/UIStateContext.tsx    — chat panel visibility, targetPage, modal state
```

```tsx
// providers/QueryProvider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

```tsx
// providers/UIStateContext.tsx
'use client'
import { createContext, useContext, useState } from 'react'

type UIState = {
  targetPage: number
  setTargetPage: (page: number) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
}

const UIStateContext = createContext<UIState | null>(null)

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [targetPage, setTargetPage] = useState(1)
  const [chatOpen, setChatOpen] = useState(false)
  return (
    <UIStateContext.Provider value={{ targetPage, setTargetPage, chatOpen, setChatOpen }}>
      {children}
    </UIStateContext.Provider>
  )
}

export function useUIState() {
  const ctx = useContext(UIStateContext)
  if (!ctx) throw new Error('useUIState must be used within UIStateProvider')
  return ctx
}
```

Both providers wrap the app in `app/layout.tsx`, nested inside `<body>`.

## Query Keys

| Query Key | Purpose | Fetch Mechanism |
|---|---|---|
| `['contracts', userId]` | Dashboard contract list | Direct Supabase read |
| `['dashboardStats', userId]` | Summary counts by type | Direct Supabase read |
| `['contract', contractId]` | Single contract detail | Route Handler (`GET /api/contracts/[id]`) |
| `['keyTerms', contractId]` | Extracted + custom key terms | Route Handler (part of contract detail, or separate fetch) |
| `['customKeyTerms', contractId]` | Custom term list pre-processing | Route Handler / direct read |
| `['chatMessages', sessionId]` | Persisted chat history | Route Handler (`GET /api/contracts/[id]/chat/messages`) |

## Mutations

| Mutation | Behavior |
|---|---|
| `useUploadContract` | POST upload; on success invalidates `['contracts']`, `['dashboardStats']` |
| `useAddCustomTerm` | Optimistic append to `['customKeyTerms', contractId]`; rolls back on error |
| `useProcessContract` | On success invalidates `['keyTerms', contractId]` and `['contracts']` |
| `useCorrectKeyTerm` | Optimistic patch to `['keyTerms', contractId]`; rolls back on error (US-009) |
| `useSubmitFeedback` | Fire-and-forget POST, no cache dependency |
| `useSendChatMessage` | SSE-aware — appends streamed deltas directly into the `['chatMessages', sessionId]` cache via `queryClient.setQueryData`, then reconciles with the persisted row on the stream's `done` event (no full refetch) |

## Invalidation Rules (verbatim from engineering doc Section 5)

- Upload invalidates `['contracts']`.
- Processing invalidates `['keyTerms', contractId]` and `['contracts']`.
- Correcting a term optimistically patches the cache and invalidates on settle.
- Chat stream completion appends to `['chatMessages', sessionId]` without a full refetch.

## Client-Only UI State (never in TanStack Query)

- Chat panel open/closed (`UIStateContext.chatOpen`)
- Active PDF page / `targetPage` (`UIStateContext.targetPage`) — written by key-term row clicks, confidence badge clicks, and chat citation clicks; read by `PdfViewer` and `TextViewerFallback`
- Modal open/closed state (auth modal, add-custom-term modal)
- 3-step upload/processing progress indicator state
