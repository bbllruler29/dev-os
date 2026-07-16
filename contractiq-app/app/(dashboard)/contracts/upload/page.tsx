'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { UploadForm } from '@/components/upload/UploadForm'
import { CustomTermInput } from '@/components/upload/CustomTermInput'
import { ProcessingProgress } from '@/components/upload/ProcessingProgress'
import { useProcessContract } from '@/hooks/useProcessContract'
import type { CustomKeyTerm } from '@/types/contract'

type UploadStep = 'select' | 'preview' | 'processing'

interface UploadedContract {
  contractId: string
  pageCount: number
  standardTermList: string[]
}

export default function UploadContractPage() {
  const router = useRouter()
  const [step, setStep] = useState<UploadStep>('select')
  const [uploaded, setUploaded] = useState<UploadedContract | null>(null)
  const [customTerms, setCustomTerms] = useState<CustomKeyTerm[]>([])

  const processContract = useProcessContract()

  function handleUploaded(result: UploadedContract) {
    setUploaded(result)
    setStep('preview')
  }

  function handleProcess() {
    if (!uploaded) return
    setStep('processing')
    processContract.mutate(uploaded.contractId, {
      onSuccess: () => {
        router.push(`/contracts/${uploaded.contractId}`)
      },
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-lg">
      <h1 className="text-h1 text-text-primary">Upload a Contract</h1>

      {step === 'select' && (
        <Card>
          <UploadForm onUploaded={handleUploaded} />
        </Card>
      )}

      {step === 'preview' && uploaded && (
        <Card className="flex flex-col gap-lg">
          <div>
            <h2 className="mb-sm text-h4 text-text-primary">
              We&apos;ll look for these {uploaded.standardTermList.length} standard terms
            </h2>
            <div className="flex flex-wrap gap-xs">
              {uploaded.standardTermList.map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-canvas-subtle px-sm py-xs text-small text-text-secondary"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>

          <CustomTermInput
            contractId={uploaded.contractId}
            customTerms={customTerms}
            onAdded={(term) => setCustomTerms((prev) => [...prev, term])}
          />

          <Button variant="primary" onClick={handleProcess} className="w-full justify-center">
            Process Contract
          </Button>
        </Card>
      )}

      {step === 'processing' && uploaded && (
        <Card>
          {processContract.isError ? (
            <ErrorState
              title="Processing failed"
              message={(processContract.error as Error).message}
              onRetry={handleProcess}
            />
          ) : (
            <ProcessingProgress isComplete={processContract.isSuccess} />
          )}
        </Card>
      )}
    </div>
  )
}
