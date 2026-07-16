'use client'

import { useEffect, useMemo, useRef } from 'react'

interface TextViewerFallbackProps {
  contractText: string
  targetPage: number
}

function parsePages(contractText: string): { pageNumber: number; text: string }[] {
  const matches = Array.from(contractText.matchAll(/\[PAGE (\d+)\]/g))

  if (matches.length === 0) {
    return [{ pageNumber: 1, text: contractText }]
  }

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index : contractText.length
    return {
      pageNumber: Number(match[1]),
      text: contractText.slice(start, end).trim(),
    }
  })
}

export function TextViewerFallback({ contractText, targetPage }: TextViewerFallbackProps) {
  const pages = useMemo(() => parsePages(contractText), [contractText])
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map())

  useEffect(() => {
    const target = pageRefs.current.get(targetPage)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target.classList.add('ring-2', 'ring-brand-primary')
      const timeout = setTimeout(() => target.classList.remove('ring-2', 'ring-brand-primary'), 1200)
      return () => clearTimeout(timeout)
    }
  }, [targetPage])

  return (
    <div className="flex flex-col gap-md">
      {pages.map(({ pageNumber, text }) => (
        <section
          key={pageNumber}
          id={`page-${pageNumber}`}
          ref={(el) => {
            if (el) pageRefs.current.set(pageNumber, el)
          }}
          className="rounded-input border border-border bg-surface-elevated p-lg transition-shadow duration-150 ease-out"
        >
          <p className="mb-sm text-small font-semibold text-text-muted">Page {pageNumber}</p>
          <p className="whitespace-pre-wrap font-mono text-body text-text-primary">{text}</p>
        </section>
      ))}
    </div>
  )
}
