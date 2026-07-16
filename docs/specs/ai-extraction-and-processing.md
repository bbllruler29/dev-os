# AI Extraction & Contract Processing

Implements FR-04, US-004, and the extraction half of Section 8 (AI Architecture).

## User Flow

1. User clicks "Process Contract" after reviewing the pre-processing preview.
2. `useProcessContract` mutation calls `POST /api/contracts/[id]/process`.
3. UI shows a 3-step progress indicator: "Extracting text" (already done at upload, shown briefly for continuity) → "Analysing with AI" → "Compiling results".
4. On success, the mutation invalidates `['keyTerms', contractId]` and `['contracts']`, then the UI redirects to the results page (`app/(dashboard)/contracts/[contractId]/page.tsx`).

## `POST /api/contracts/[id]/process`

- **Runtime:** Node.js.
- **Auth:** verify `contracts.user_id = auth.uid()`; `404` if not found/not owned.
- **Preconditions:** `contracts.status` must be `'uploaded'` or `'error'` (allows retry). If already `'processing'` or `'completed'`, return `409` `{ error: { code: 'VALIDATION_ERROR', message: 'Contract is already processed or processing.' } }`.
- **Steps:**
  1. `UPDATE contracts SET status = 'processing'`.
  2. Fetch `contract_text`, `contract_type`, and any `custom_key_terms` rows for this contract.
  3. Build the extraction prompt via `lib/openai/extraction.ts`.
  4. Call OpenAI GPT-4o, JSON mode, temperature `0.1`, max output tokens `2000`.
  5. Parse and validate the response against the expected JSON schema (Zod). If parsing fails, issue **one** automatic retry with the corrective prompt: `"Your previous response was not valid JSON. Return only the JSON array, no explanation."` If the retry also fails, go to step 7 (error path).
  6. Bulk `INSERT INTO key_terms (contract_id, user_id, term_name, value, page_number, confidence_score, source_sentence, is_manual, custom_key_term_id)` — one row per extracted term. Standard terms: `is_manual = false`, `custom_key_term_id = null`. Custom terms: `is_manual = true`, `custom_key_term_id` set to the matching `custom_key_terms.id`.
  7. On success: `UPDATE contracts SET status = 'completed', detected_contract_type = <from response>`.
  8. On failure after retry, or OpenAI error after 3 retries (1s/2s/4s backoff): `UPDATE contracts SET status = 'error', processing_error = <message>`. Return `500` `{ error: { code: 'INTERNAL_ERROR', message: 'Extraction failed. Try again in a few minutes.' } }`. `status = 'error'` lets the user retry without re-uploading.
- **Response `200`:** `{ "key_terms": KeyTerm[], "status": "completed" }`.

## `lib/openai/extraction.ts`

Builds a few-shot prompt: 3 labelled NDA examples + 3 labelled MSA examples embedded in the system prompt (write representative example input/output pairs covering a range of confidence scores when implementing — these are prompt content, not something requiring further spec detail). The user message contains:

- The selected contract type's standard term list (`STANDARD_TERMS[contractType]`)
- Any custom term names from `custom_key_terms`
- The full `contract_text` (with `[PAGE N]` markers)
- An explicit instruction to include `detected_contract_type` in the response (soft mismatch detection, Consolidated Assumption #7 — no second model call)

**Expected response schema (Zod, enforced before DB insert):**

```ts
import { z } from 'zod'

export const ExtractedTermSchema = z.object({
  term_name: z.string().min(1),
  value: z.string().min(1),
  page_number: z.number().int().positive(),
  confidence_score: z.number().min(0).max(100),
  source_sentence: z.string().min(1),
})

export const ExtractionResponseSchema = z.object({
  detected_contract_type: z.enum(['NDA', 'MSA']),
  terms: z.array(ExtractedTermSchema),
})
```

```ts
export async function buildExtractionPrompt(params: {
  contractType: 'NDA' | 'MSA'
  contractText: string
  customTermNames: string[]
}): Promise<{ system: string; user: string }> {
  // system: role + 6 few-shot examples (3 NDA, 3 MSA) + output-format instructions
  // user: standard terms + custom terms + full contract_text
}

export async function extractKeyTerms(params: {
  contractType: 'NDA' | 'MSA'
  contractText: string
  customTermNames: string[]
}) {
  // calls OpenAI with response_format: { type: 'json_object' }, temperature 0.1, max_tokens 2000
  // parses with ExtractionResponseSchema; on ZodError, retries once with the corrective prompt
}
```

## Confidence Scoring

The model self-reports a `confidence_score` (0–100) per term, embedded directly in the extraction JSON — no separate calibration call. Confidence bands for **display only** (behavior — the < 50% warning — is fixed regardless of the exact band boundaries used for color):

| Range | Color token (see design system) |
|---|---|
| 90–100% | Success green `#16A34A` |
| 70–89% | Lime `#84CC16` |
| 50–69% | Amber `#F59E0B` |
| < 50% | Error red `#DC2626` |

## Retry / Backoff

OpenAI calls (both extraction and chat) retry up to 3 times with exponential backoff: 1s, 2s, 4s. Implement as a shared helper:

```ts
// lib/openai/withRetry.ts
export async function withRetry<T>(fn: () => Promise<T>, delays = [1000, 2000, 4000]): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]))
    }
  }
  throw lastError
}
```

## Edge Cases

- OpenAI returns malformed JSON twice (original + 1 retry) → `contracts.status = 'error'`, error surfaced with "Try again" CTA that re-triggers `POST /api/contracts/[id]/process`.
- `detected_contract_type` differs from the user-selected `contract_type` → non-blocking soft warning banner on the results page: "This looks like it might be a different contract type than selected." Extraction still proceeds and is still shown.
- Zero terms extracted (empty array) → still `status = 'completed'`; results page shows an empty key terms panel with a message rather than treating it as an error.
