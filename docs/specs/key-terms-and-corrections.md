# Key Terms Panel & Inline Correction

Implements FR-04, FR-11, US-004, US-009.

## Components

```
components/key-terms/KeyTermsPanel.tsx        — list container, right panel of the results page
components/key-terms/KeyTermRow.tsx           — one row: term name | value | page | confidence
components/key-terms/ConfidenceBadge.tsx      — color-coded badge + non-dismissible tooltip for < 50%
components/key-terms/SourceSentenceTooltip.tsx — "Why?" expandable, shows source_sentence verbatim
```

## `KeyTermsPanel`

- Fetches via `useKeyTerms(contractId)` (TanStack Query, `['keyTerms', contractId]`).
- Renders one `KeyTermRow` per term, standard terms first (in `STANDARD_TERMS` order), then custom terms (marked with a "Custom" badge, `is_manual = true`).
- Each row shows: term name, value, page number (clickable — sets `targetPage` in `UIStateContext`, scrolls/jumps the PDF viewer), confidence badge, "Why?" expander.

## `ConfidenceBadge`

- Renders using the four-band palette (see `ai-extraction-and-processing.md` for band boundaries and hex values).
- **FR-11 hard rule:** any term with `confidence_score < 50` renders a non-dismissible ⚠️ tooltip: *"Low confidence — we recommend verifying this in the document directly."* The tooltip has no close button — it is always visible on hover/focus, and the term itself is never hidden or filtered out regardless of confidence.
- Clicking a low-confidence badge also triggers `PdfViewer`/`TextViewerFallback` to auto-highlight the nearest matching page span (via `targetPage`).

## `SourceSentenceTooltip`

- "Why?" button expands to show `key_terms.source_sentence` verbatim, no truncation, no paraphrasing.
- If `source_sentence` is empty (should not happen per the Zod schema in `ai-extraction-and-processing.md`, which requires `min(1)`), do not render the expander.

## Inline Correction (US-009)

1. User clicks a term's value to edit it inline (click-to-edit, not a modal).
2. `useCorrectKeyTerm` mutation (`hooks/useCorrectKeyTerm.ts`) optimistically updates the `['keyTerms', contractId]` cache immediately, then calls `PATCH /api/contracts/[id]/key-terms/[termId]`.
3. On error, the mutation rolls back the optimistic update and shows an inline error toast on the row.
4. On success, the row shows an "Edited" badge next to the value.

### `PATCH /api/contracts/[id]/key-terms/[termId]`

- **Body:** `{ "value": string }` (Zod: 1–2000 chars, required).
- **Auth:** verify the term's `contract_id` belongs to a contract owned by `auth.uid()`.
- **Must complete in < 2 seconds** (US-009 acceptance criterion) — single-row update, no additional OpenAI calls.
- **SQL:**
  ```sql
  UPDATE key_terms
  SET value = $1,
      is_edited = true,
      original_ai_value = CASE WHEN is_edited = false THEN value ELSE original_ai_value END,
      edited_at = now()
  WHERE id = $2 AND user_id = auth.uid()
  ```
  `original_ai_value` is captured only on the **first** edit — subsequent edits do not overwrite it, preserving the original AI output for the `term_corrections` view.
- **Response `200`:** the updated `key_terms` row.
- **Errors:** `404` if the term doesn't exist or isn't owned by the caller; `422` if `value` fails validation.

## Edge Cases

- Editing a term that is already edited → `original_ai_value` stays pinned to the first AI value, not the most recent edit.
- Editing to an empty string → blocked client-side and server-side (`422`).
- Term with `confidence_score` exactly `50` → not flagged (rule is strictly `< 50`, matching FR-11's exact threshold).
