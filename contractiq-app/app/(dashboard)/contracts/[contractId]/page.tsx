'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useContract } from '@/hooks/useContract'
import { useUIState } from '@/providers/UIStateContext'
import { useProcessContract } from '@/hooks/useProcessContract'
import { useDeleteContract } from '@/hooks/useDeleteContract'
import { PdfViewer } from '@/components/pdf-viewer/PdfViewer'
import { TextViewerFallback } from '@/components/pdf-viewer/TextViewerFallback'
import { KeyTermsPanel } from '@/components/key-terms/KeyTermsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { ProcessingProgress } from '@/components/upload/ProcessingProgress'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Badge } from '@/components/ui/Badge'

export default function ContractResultsPage() {
  const params = useParams<{ contractId: string }>()
  const contractId = params.contractId
  const router = useRouter()

  const contractQuery = useContract(contractId)
  const processContract = useProcessContract()
  const deleteContract = useDeleteContract()
  const { targetPage } = useUIState()
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  if (contractQuery.isLoading) {
    return <LoadingState label="Loading contract…" />
  }

  if (contractQuery.isError || !contractQuery.data) {
    return (
      <ErrorState
        message="We couldn't load this contract."
        onRetry={() => contractQuery.refetch()}
      />
    )
  }

  const { contract, key_terms: keyTerms } = contractQuery.data

  function handleDelete() {
    deleteContract.mutate(contractId, {
      onSuccess: () => router.push('/dashboard'),
    })
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">{contract.contract_name}</h1>
          <div className="mt-xs flex items-center gap-xs">
            <Badge tone="primary">{contract.contract_type}</Badge>
            {contract.detected_contract_type && contract.detected_contract_type !== contract.contract_type && (
              <Badge tone="warning">
                This looks like it might be a {contract.detected_contract_type}, not a {contract.contract_type}
              </Badge>
            )}
          </div>
        </div>

        {isDeleteConfirmOpen ? (
          <div className="flex items-center gap-sm">
            <span className="text-body text-text-secondary">Delete this contract?</span>
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={handleDelete}
              disabled={deleteContract.isPending}
              className="rounded-input bg-semantic-error px-md py-sm text-body font-semibold text-white transition-colors hover:bg-semantic-error/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteContract.isPending ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            aria-label="Delete contract"
            className="rounded-input p-sm text-text-muted transition-colors hover:bg-semantic-error/10 hover:text-semantic-error"
          >
            <Trash2 size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {contract.status === 'uploaded' && (
        <Card className="flex flex-col items-start gap-sm">
          <p className="text-body text-text-secondary">This contract hasn&apos;t been processed yet.</p>
          <Button
            variant="primary"
            isLoading={processContract.isPending}
            onClick={() => processContract.mutate(contractId)}
          >
            Process Contract
          </Button>
        </Card>
      )}

      {contract.status === 'processing' && (
        <Card>
          <ProcessingProgress isComplete={false} />
        </Card>
      )}

      {contract.status === 'error' && (
        <Card>
          <ErrorState
            title="Processing failed"
            message={contract.processing_error ?? 'Try again in a few minutes.'}
            onRetry={() => processContract.mutate(contractId)}
          />
        </Card>
      )}

      {contract.status === 'completed' && (
        <>
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-[1fr_400px]">
            <Card className="max-h-[calc(100vh-220px)] overflow-y-auto">
              {contract.file_path ? (
                <PdfViewer filePath={contract.file_path} targetPage={targetPage} />
              ) : (
                <TextViewerFallback contractText={contract.contract_text ?? ''} targetPage={targetPage} />
              )}
            </Card>

            <Card className="max-h-[calc(100vh-220px)] overflow-y-auto">
              <h2 className="mb-md text-h4 text-text-primary">Key Terms</h2>
              <KeyTermsPanel contractId={contractId} contractType={contract.contract_type} keyTerms={keyTerms} />
            </Card>
          </div>

          <Card>
            <FeedbackWidget contractId={contractId} />
          </Card>

          <ChatPanel contractId={contractId} isAvailable />
        </>
      )}
    </div>
  )
}
