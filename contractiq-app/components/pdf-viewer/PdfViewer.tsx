'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

interface PdfViewerProps {
  filePath: string
  targetPage: number
}

const SIGNED_URL_EXPIRY_SECONDS = 3600

export function PdfViewer({ filePath, targetPage }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function getSignedUrl(): Promise<string> {
      const supabase = createClient()
      const { data, error: signedError } = await supabase.storage
        .from('contracts')
        .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS)

      if (signedError || !data?.signedUrl) {
        throw new Error('Could not load the PDF file.')
      }
      return data.signedUrl
    }

    async function render() {
      setIsLoading(true)
      setError(null)
      pageRefs.current.clear()

      try {
        const signedUrl = await getSignedUrl()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

        const loadingTask = pdfjsLib.getDocument(signedUrl)
        const pdf = await loadingTask.promise
        if (cancelled) return

        setNumPages(pdf.numPages)

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return
          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.3 })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'w-full rounded-input border border-border shadow-sm'

          const context = canvas.getContext('2d')
          if (!context) continue

          await page.render({ canvasContext: context, viewport }).promise

          const pageContainer = pageRefs.current.get(pageNumber)
          if (pageContainer) {
            pageContainer.innerHTML = ''
            pageContainer.appendChild(canvas)
          }
        }
      } catch {
        if (!cancelled) setError('Could not load the PDF viewer for this contract.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [filePath, renderKey])

  useEffect(() => {
    if (isLoading) return
    const target = pageRefs.current.get(targetPage)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target.classList.add('ring-2', 'ring-brand-primary')
      const timeout = setTimeout(() => target.classList.remove('ring-2', 'ring-brand-primary'), 1200)
      return () => clearTimeout(timeout)
    }
  }, [targetPage, isLoading])

  if (error) {
    return <ErrorState message={error} onRetry={() => setRenderKey((k) => k + 1)} />
  }

  return (
    <div className="relative">
      {isLoading && <LoadingState label="Loading PDF…" />}
      <div ref={containerRef} className="flex flex-col gap-md">
        {Array.from({ length: numPages || 0 }, (_, index) => index + 1).map((pageNumber) => (
          <div
            key={pageNumber}
            ref={(el) => {
              if (el) pageRefs.current.set(pageNumber, el)
            }}
            className="min-h-[200px] rounded-input transition-shadow duration-150 ease-out"
          />
        ))}
      </div>
    </div>
  )
}
