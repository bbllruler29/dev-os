import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText, countWords } from '@/lib/pdf/extractText'
import { apiError } from '@/lib/utils/apiError'
import { UploadContractSchema } from '@/lib/validation/schemas'
import { validateFileUpload } from '@/lib/security/inputValidator'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, rateLimitedResponse } from '@/lib/security/rateLimiter'
import { STANDARD_TERMS, MAX_PAGE_COUNT, MIN_EXTRACTED_WORD_COUNT } from '@/lib/constants/standardTerms'
import { MAX_FILE_SIZE_BYTES } from '@/lib/security/tokenLimiter'

export const runtime = 'nodejs'

function deriveContractName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').trim() || 'Untitled Contract'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const rateLimit = await checkRateLimit(user.id, 'contract_upload')
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid form data.')
  }

  const file = formData.get('file')
  const contractTypeRaw = formData.get('contract_type')

  if (!(file instanceof File)) {
    return apiError('VALIDATION_ERROR', 'A PDF file is required.')
  }

  const parsed = UploadContractSchema.safeParse({ contract_type: contractTypeRaw })
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'contract_type must be either NDA or MSA.')
  }
  const { contract_type } = parsed.data

  const fileValidation = validateFileUpload(file, MAX_FILE_SIZE_BYTES)
  if (!fileValidation.valid) {
    return apiError('VALIDATION_ERROR', fileValidation.message ?? 'Invalid file.')
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let text: string
  let pageCount: number
  try {
    const result = await extractText(buffer)
    text = result.text
    pageCount = result.pageCount
  } catch {
    return apiError('VALIDATION_ERROR', 'Could not read this PDF. It may be corrupted.')
  }

  if (pageCount > MAX_PAGE_COUNT) {
    return apiError('VALIDATION_ERROR', 'PDF exceeds 20-page limit.')
  }

  if (countWords(text) < MIN_EXTRACTED_WORD_COUNT) {
    return apiError('VALIDATION_ERROR', 'Scanned PDFs are not supported yet.')
  }

  const contractName = deriveContractName(file.name)

  const { data: contract, error: insertError } = await supabase
    .from('contracts')
    .insert({
      user_id: user.id,
      contract_name: contractName,
      contract_type,
      contract_text: text,
      page_count: pageCount,
      status: 'uploaded',
    })
    .select('id')
    .single()

  if (insertError || !contract) {
    return apiError('INTERNAL_ERROR', 'Failed to save the uploaded contract.')
  }

  const storagePath = `${user.id}/${contract.id}/${file.name}`
  try {
    const { error: storageError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (!storageError) {
      await supabase.from('contracts').update({ file_path: storagePath }).eq('id', contract.id)
    }
  } catch {
    // Non-blocking: Storage failures do not fail the upload. file_path stays null
    // and the results page falls back to the text viewer.
  }

  return NextResponse.json({
    contract_id: contract.id,
    page_count: pageCount,
    standard_term_list: STANDARD_TERMS[contract_type],
  })
}
