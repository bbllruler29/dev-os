# Contract Upload & Text Extraction

Implements FR-02, FR-03, FR-05, US-002, US-005.

## User Flow

1. User selects contract type (NDA or MSA) from a dropdown, then drags/drops or picks a PDF file (`app/(dashboard)/contracts/upload/page.tsx`).
2. Client validates file size (≤ 10 MB) and extension (`.pdf`) before upload; shows an inline error if violated without hitting the network.
3. `useUploadContract` mutation (`hooks/useUploadContract.ts`) posts a multipart form to `POST /api/contracts/upload`.
4. Upload progress is shown as a determinate bar (based on `XMLHttpRequest` progress events or `fetch` with a readable stream — implementation detail left to the component, but progress UI must be shown, not just a spinner).
5. On success, the UI renders the pre-processing preview: the standard term list for the selected contract type (see below), plus any custom terms already added.
6. User may click "+ Add Key Term" to add up to 5 custom terms (`useAddCustomTerm` mutation, optimistic UI).
7. User clicks "Process Contract" to move to AI extraction (see `ai-extraction-and-processing.md`).

## Standard Term Lists (verbatim from PRD Section 4)

**NDA (10 terms):** Parties, Effective Date, Confidentiality Obligations, Permitted Disclosures, Term & Duration, Governing Law, Jurisdiction, IP Ownership, Non-Solicitation, Breach & Remedy.

**MSA (12 terms):** Parties, Service Scope, Payment Terms, Invoice Schedule, Late Payment Penalty, Liability Cap, Indemnification, IP Ownership, Termination Clause, Governing Law, Dispute Resolution, Notice Period.

Store these as static constants:

```ts
// lib/constants/standardTerms.ts
export const STANDARD_TERMS: Record<'NDA' | 'MSA', string[]> = {
  NDA: [
    'Parties', 'Effective Date', 'Confidentiality Obligations', 'Permitted Disclosures',
    'Term & Duration', 'Governing Law', 'Jurisdiction', 'IP Ownership',
    'Non-Solicitation', 'Breach & Remedy',
  ],
  MSA: [
    'Parties', 'Service Scope', 'Payment Terms', 'Invoice Schedule',
    'Late Payment Penalty', 'Liability Cap', 'Indemnification', 'IP Ownership',
    'Termination Clause', 'Governing Law', 'Dispute Resolution', 'Notice Period',
  ],
}
```

## `POST /api/contracts/upload`

- **Runtime:** Node.js (file parsing requires Node APIs).
- **Body:** `multipart/form-data` with fields `file` (PDF binary) and `contract_type` (`'NDA' | 'MSA'`).
- **Server-side validation (Zod on the non-file fields, manual checks on the file):**
  - File size ≤ 10 MB → else `422` `{ error: { code: 'VALIDATION_ERROR', message: 'File exceeds 10 MB limit.' } }`
  - Page count ≤ 20 (checked after parsing) → else `422` `{ error: { code: 'VALIDATION_ERROR', message: 'PDF exceeds 20-page limit.' } }`
  - `contract_type` must be `'NDA'` or `'MSA'` → else `422`
- **Processing steps:**
  1. Read the uploaded file into a buffer.
  2. Run `lib/pdf/extractText.ts` to produce `[PAGE N]`-marked text (see below).
  3. If extracted text has fewer than 100 words total, return `422` `{ error: { code: 'VALIDATION_ERROR', message: 'Scanned PDFs are not supported yet.' } }` and do not create a `contracts` row.
  4. `INSERT INTO contracts (user_id, contract_name, contract_type, contract_text, page_count, status)` with `status = 'uploaded'`. `contract_name` is derived from the original filename (strip extension).
  5. Attempt `supabase.storage.from('contracts').upload(`${userId}/${contractId}/${filename}.pdf`, buffer)`. This is **non-blocking**: if it fails, log the error, leave `file_path` as `null`, and still return success — the AI pipeline and text viewer fallback do not depend on Storage.
  6. If Storage upload succeeds, `UPDATE contracts SET file_path = <path>`.
- **Response `200`:**
  ```json
  {
    "contract_id": "uuid",
    "page_count": 12,
    "standard_term_list": ["Parties", "Effective Date", "..."]
  }
  ```

## `lib/pdf/extractText.ts`

```ts
import pdf from 'pdf-parse'

export async function extractText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const pages: string[] = []
  const result = await pdf(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      pages.push(pageText)
      return pageText
    },
  })

  const markedText = pages
    .map((pageText, i) => `[PAGE ${i + 1}]\n${pageText}`)
    .join('\n\n')

  return { text: markedText, pageCount: pages.length || result.numpages }
}
```

`[PAGE N]` markers are 1-indexed and prefix each page's text block. This is the single source of truth read by both the AI extraction pipeline and the chat route — neither re-parses the PDF.

## `POST /api/contracts/[id]/custom-terms`

- **Body:** `{ "term_name": string }` (validated with Zod: 1–100 chars, required).
- **Processing:** `INSERT INTO custom_key_terms (contract_id, user_id, term_name)`. The `enforce_max_custom_key_terms` DB trigger (see `supabase-schema.sql`) rejects the 6th+ insert with a Postgres exception (`errcode 23514`); the Route Handler catches this and returns `422` `{ error: { code: 'VALIDATION_ERROR', message: 'A contract can have at most 5 custom key terms.' } }`.
- **Response `201`:** the created `custom_key_terms` row.
- **Ownership check:** verify the contract's `user_id` matches the authenticated user before inserting (RLS also enforces this at the DB layer as defense in depth).

## Edge Cases

- File > 10 MB or > 20 pages → client-side check blocks submission when detectable (size is; page count is not until parsed) — server-side check is authoritative.
- Extracted text < 100 words → "Scanned PDFs are not supported yet" error state, no partial contract row created.
- Storage upload fails → contract still created, `file_path = null`; results page falls back to `TextViewerFallback` (see `pdf-viewer.md`).
- 6th custom term → `422`, UI shows inline error under the "+ Add Key Term" input, does not clear already-added terms.
