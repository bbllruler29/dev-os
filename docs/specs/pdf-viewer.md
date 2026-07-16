# PDF Viewer & Text Viewer Fallback

Implements FR-06, FR-07, US-003, US-006.

## Components

```
components/pdf-viewer/PdfViewer.tsx           — 'use client', PDF.js-based viewer
components/pdf-viewer/TextViewerFallback.tsx  — 'use client', parses [PAGE N] markers
providers/UIStateContext.tsx                  — holds targetPage (client-only UI state)
```

## Selection Logic

On the results page (`app/(dashboard)/contracts/[contractId]/page.tsx`):

```tsx
{contract.file_path ? (
  <PdfViewer contractId={contract.id} targetPage={targetPage} />
) : (
  <TextViewerFallback contractText={contract.contract_text} targetPage={targetPage} />
)}
```

Both components accept the same `targetPage: number` prop from `UIStateContext` and must respond to changes in it (from key-term clicks, confidence-badge clicks, and chat citation clicks) by scrolling/navigating to that page.

## `PdfViewer`

- **Data source:** a Supabase Storage signed URL for `file_path`, expiring after 1 hour (Constraint §5). Fetch the signed URL via `supabase.storage.from('contracts').createSignedUrl(file_path, 3600)` — this can be a direct client call (RLS/Storage policies already scope it to the owner) or wrapped in `GET /api/contracts/[id]` if simpler to co-locate with the rest of the contract detail fetch.
- **Rendering:** use `pdfjs-dist` to render each page to a `<canvas>`, virtualized/lazy-rendered for performance on up to 20-page documents (no need for windowing libraries at this page count — render on mount, cache rendered pages).
- **`targetPage` behavior:** on prop change, scroll the container so the target page's canvas is in view; briefly highlight the page border to draw attention.
- **Signed URL expiry:** if a fetch against an expired signed URL fails (1 hour is longer than a typical session but can be hit on long-lived tabs), silently re-fetch a new signed URL and retry once before showing an error state.

## `TextViewerFallback`

- **Data source:** `contracts.contract_text` (already fetched with the contract).
- **Parsing:** split on the `[PAGE N]` marker regex `/\[PAGE (\d+)\]/g`, rendering each page's text as a labelled section (`<section id="page-N">` with a "Page N" heading).
- **`targetPage` behavior:** on prop change, `scrollIntoView({ behavior: 'smooth', block: 'start' })` on `#page-{targetPage}`.
- Used whenever `contracts.file_path` is `null` — either because Storage upload failed at upload time (non-blocking, see `contract-upload-and-extraction.md`) or the signed URL request fails outright.

## Edge Cases

- `file_path` is `null` → always render `TextViewerFallback`, never show a broken PDF viewer or an error state — this is expected, documented degraded behavior (FR-06).
- `targetPage` set to a page number beyond `page_count` → clamp to `page_count`, do not throw.
- Very short `contract_text` pages (e.g. a mostly-blank signature page) → still render the section, do not skip empty pages, since page numbers must line up 1:1 with `key_terms.page_number` and chat citations.
