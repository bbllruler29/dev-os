'use client'

import { DragEvent, useRef, useState } from 'react'
import { FileText, UploadCloud } from 'lucide-react'
import { ContractTypeSelector } from './ContractTypeSelector'
import { Button } from '@/components/ui/Button'
import { useUploadContract } from '@/hooks/useUploadContract'
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants/standardTerms'
import type { ContractType } from '@/types/contract'

interface UploadFormProps {
  onUploaded: (result: { contractId: string; pageCount: number; standardTermList: string[] }) => void
}

export function UploadForm({ onUploaded }: UploadFormProps) {
  const [contractType, setContractType] = useState<ContractType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const upload = useUploadContract()

  function validateAndSetFile(candidate: File) {
    if (!candidate.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Only PDF files are supported.')
      return
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setFileError('File exceeds 10 MB limit.')
      return
    }
    setFileError(null)
    setFile(candidate)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  function handleSubmit() {
    if (!file || !contractType) return
    upload.mutate(
      { file, contractType },
      {
        onSuccess: (data) => {
          onUploaded({
            contractId: data.contract_id,
            pageCount: data.page_count,
            standardTermList: data.standard_term_list,
          })
        },
      }
    )
  }

  const canSubmit = !!file && !!contractType && !upload.isPending

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="mb-sm text-h4 text-text-primary">1. Select contract type</h2>
        <ContractTypeSelector value={contractType} onChange={setContractType} disabled={upload.isPending} />
      </div>

      <div>
        <h2 className="mb-sm text-h4 text-text-primary">2. Upload your PDF</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-sm rounded-card border-2 border-dashed p-3xl text-center transition-colors ${
            isDragging ? 'border-brand-primary bg-brand-accent-light' : 'border-border-strong bg-surface-elevated'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0]
              if (selected) validateAndSetFile(selected)
            }}
          />
          {file ? (
            <>
              <FileText size={24} strokeWidth={1.5} className="text-brand-primary" />
              <p className="text-body font-semibold text-text-primary">{file.name}</p>
              <p className="text-small text-text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </>
          ) : (
            <>
              <UploadCloud size={24} strokeWidth={1.5} className="text-text-muted" />
              <p className="text-body text-text-secondary">Drag and drop a PDF here, or click to browse</p>
              <p className="text-small text-text-muted">Up to 10 MB, 20 pages</p>
            </>
          )}
        </div>
        {fileError && <p className="mt-xs text-small text-semantic-error">{fileError}</p>}
      </div>

      {upload.isPending && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-brand-primary transition-all duration-150 ease-out"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <p className="mt-xs text-small text-text-muted">Uploading… {upload.progress}%</p>
        </div>
      )}

      {upload.isError && (
        <p className="text-body text-semantic-error">{(upload.error as Error).message}</p>
      )}

      <Button variant="primary" disabled={!canSubmit} isLoading={upload.isPending} onClick={handleSubmit}>
        Upload Contract
      </Button>
    </div>
  )
}
