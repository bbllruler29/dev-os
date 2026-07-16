import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { extractKeyTerms } from '@/lib/openai/extraction'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, rateLimitedResponse } from '@/lib/security/rateLimiter'
import type { ContractStatus, ContractType } from '@/types/contract'

export const runtime = 'nodejs'

const RETRYABLE_STATUSES: ContractStatus[] = ['uploaded', 'error']

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const rateLimit = await checkRateLimit(user.id, 'contract_processing')
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds)
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, contract_type, contract_text, status')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!contract) {
    return apiError('NOT_FOUND', 'Contract not found.')
  }

  if (!RETRYABLE_STATUSES.includes(contract.status as ContractStatus)) {
    return apiError('VALIDATION_ERROR', 'Contract is already processed or processing.')
  }

  if (!contract.contract_text) {
    return apiError('VALIDATION_ERROR', 'Contract has no extracted text to analyse.')
  }

  await supabase.from('contracts').update({ status: 'processing' }).eq('id', params.id)

  const { data: customTerms } = await supabase
    .from('custom_key_terms')
    .select('id, term_name')
    .eq('contract_id', params.id)

  const customTermsList = customTerms ?? []
  const customTermIdByName = new Map(
    customTermsList.map((term) => [term.term_name.trim().toLowerCase(), term.id])
  )

  try {
    const extraction = await extractKeyTerms({
      contractType: contract.contract_type as ContractType,
      contractText: contract.contract_text,
      customTermNames: customTermsList.map((term) => term.term_name),
    })

    const keyTermRows = extraction.terms.map((term) => {
      const customKeyTermId = customTermIdByName.get(term.term_name.trim().toLowerCase()) ?? null
      return {
        contract_id: params.id,
        user_id: user.id,
        term_name: term.term_name,
        value: term.value,
        page_number: term.page_number,
        confidence_score: term.confidence_score,
        source_sentence: term.source_sentence,
        is_manual: customKeyTermId !== null,
        custom_key_term_id: customKeyTermId,
      }
    })

    if (keyTermRows.length > 0) {
      const { error: insertError } = await supabase.from('key_terms').insert(keyTermRows)
      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    await supabase
      .from('contracts')
      .update({ status: 'completed', detected_contract_type: extraction.detected_contract_type })
      .eq('id', params.id)

    return NextResponse.json({ key_terms: keyTermRows, status: 'completed' })
  } catch (err) {
    // Log the real error server-side only. The raw message (which may come
    // from the OpenAI SDK or a DB driver) must never be persisted to a
    // column the frontend renders directly to the user — it can contain
    // internal details (stack traces, request IDs, backend hostnames).
    console.error('[contracts/process] extraction failed:', err)
    await supabase
      .from('contracts')
      .update({ status: 'error', processing_error: 'The document could not be analyzed. Please try again.' })
      .eq('id', params.id)

    return apiError('INTERNAL_ERROR', 'Extraction failed. Try again in a few minutes.')
  }
}
