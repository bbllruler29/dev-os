# API Conventions, Validation & Error Handling

Applies to every Route Handler under `app/api/*`. Covers the standardized error envelope, request validation, and the contract-deletion endpoint (the one route not detailed in a feature-specific spec).

## Error Envelope

Every error response, regardless of endpoint, follows:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message." } }
```

| HTTP Status | Code | Meaning |
|---|---|---|
| `401` | `UNAUTHORIZED` | No valid session |
| `404` | `NOT_FOUND` | Resource doesn't exist or isn't owned by the caller |
| `422` | `VALIDATION_ERROR` | Request body/file fails validation (size, page count, 6th custom term, malformed input) |
| `429` | `RATE_LIMITED` | Rate limit exceeded (thresholds finalized in Stage 7 — `lib/security/`) |
| `500` | `INTERNAL_ERROR` | Unhandled server error, including OpenAI failures after 3 retries |

Shared helper:

```ts
// lib/utils/apiError.ts
import { NextResponse } from 'next/server'

export type ApiErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'INTERNAL_ERROR'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

export function apiError(code: ApiErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] })
}
```

## Request Validation

All request bodies are validated with Zod schemas **before** any DB or OpenAI call. Schemas live alongside each route or in `lib/validation/*.ts` if shared. On a Zod validation failure, return `apiError('VALIDATION_ERROR', <first issue message>)`.

## Ownership Checks

Every route that operates on a `contracts` row (or a child row via `contract_id`) must verify `user_id = auth.uid()` explicitly in the query, even though RLS enforces it at the DB layer — this gives a clean `404` instead of relying solely on RLS silently returning zero rows, and keeps intent explicit in the route code.

## `GET /api/contracts/[id]`

- Route Handler (joins `contracts`, `key_terms`, `custom_key_terms` in one response — this is why it isn't a direct client read like the dashboard list).
- **Response `200`:**
  ```json
  {
    "contract": { "id": "...", "contract_name": "...", "contract_type": "NDA", "status": "completed", "file_path": "...", "page_count": 8, "created_at": "..." },
    "key_terms": [ { "id": "...", "term_name": "...", "value": "...", "page_number": 2, "confidence_score": 92.5, "source_sentence": "...", "is_manual": false, "is_edited": false } ],
    "custom_key_terms": [ { "id": "...", "term_name": "..." } ]
  }
  ```
- **404** if the contract doesn't exist or isn't owned by the caller.

## `DELETE /api/contracts/[id]`

- **Auth:** verify ownership.
- **Processing:**
  1. If `file_path` is set, delete the Storage object: `supabase.storage.from('contracts').remove([file_path])`.
  2. `DELETE FROM contracts WHERE id = $1 AND user_id = auth.uid()` — cascades to `key_terms`, `custom_key_terms`, `chat_sessions` → `chat_messages`, and `user_feedback` via `ON DELETE CASCADE` (see `supabase-schema.sql`).
- **Response `204`** on success.
- **Errors:** `404` if not found/not owned. If Storage deletion fails, log it but still proceed with the DB delete (the DB row is the source of truth for "does this contract exist"; an orphaned Storage object is a cleanup concern, not a user-facing failure).

## Deferred to Phase 2

`POST /api/contracts/[id]/export?format=csv|pdf` (US-011) — not implemented in MVP. Generation mechanism (client vs. server) is an open question per the engineering doc, Consolidated Assumption #12.

## Rate Limiting

Rate limiting is **forward-planned for Stage 7 (Security Foundation)**, not implemented in this stage. The engineering doc's stated thresholds (Auth 10/min, Chat 30/min, Processing 5/hr, Upload 20/day) are recorded here for continuity but the `lib/security/` implementation and `rate_limit_events` table are out of scope until Stage 7.
