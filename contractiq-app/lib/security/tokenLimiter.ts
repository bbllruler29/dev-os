import { MAX_FILE_SIZE_BYTES, MAX_PAGE_COUNT } from '@/lib/constants/standardTerms'

// Re-exported so every size/count/length ceiling in the app lives under
// lib/security, even though file size and page count are defined alongside
// the other upload constants in lib/constants/standardTerms.ts.
export { MAX_FILE_SIZE_BYTES, MAX_PAGE_COUNT }

export const MAX_MESSAGE_LENGTH = 5000

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Max prior chat messages sent to the model as context. Configurable via env so cost/context-window exposure can be tuned without a code change. */
export const MAX_CHAT_HISTORY = readPositiveIntEnv('MAX_CHAT_HISTORY', 100)
