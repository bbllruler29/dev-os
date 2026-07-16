import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ContractType } from '@/types/contract'

interface UploadContractInput {
  file: File
  contractType: ContractType
}

interface UploadContractResponse {
  contract_id: string
  page_count: number
  standard_term_list: string[]
}

function uploadContractWithProgress(
  { file, contractType }: UploadContractInput,
  onProgress: (percent: number) => void
): Promise<UploadContractResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('contract_type', contractType)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/contracts/upload')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      let body: { contract_id?: string; page_count?: number; standard_term_list?: string[]; error?: { message: string } }
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        reject(new Error('Unexpected response from the server.'))
        return
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadContractResponse)
      } else {
        reject(new Error(body.error?.message ?? 'Upload failed.'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))

    xhr.send(formData)
  })
}

export function useUploadContract() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: (input: UploadContractInput) => {
      setProgress(0)
      return uploadContractWithProgress(input, setProgress)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    },
  })

  return { ...mutation, progress }
}
