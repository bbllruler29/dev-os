import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { AddCustomTermSchema } from '@/lib/validation/schemas'
import { requireAuth } from '@/lib/security/authGuard'
import { verifyContractOwnership } from '@/lib/security/chatSecurity'
import { sanitizeForLLM, PromptInjectionDetectedError } from '@/lib/security/promptInjectionGuard'

export const runtime = 'nodejs'

const MAX_CUSTOM_TERMS_ERROR_CODE = '23514'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const ownership = await verifyContractOwnership(supabase, params.id, user.id, 'id')
  if (ownership.error) return ownership.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid request body.')
  }

  const parsed = AddCustomTermSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid term name.')
  }

  // Custom term names are embedded verbatim into the extraction prompt sent
  // to OpenAI (lib/openai/extraction.ts buildUserPrompt), so they're user
  // input reaching the LLM just as much as a chat message is.
  let termName: string
  try {
    termName = sanitizeForLLM(parsed.data.term_name)
  } catch (err) {
    if (err instanceof PromptInjectionDetectedError) {
      return apiError('PROMPT_INJECTION', 'This term name could not be processed.')
    }
    throw err
  }

  const { data: customTerm, error } = await supabase
    .from('custom_key_terms')
    .insert({
      contract_id: params.id,
      user_id: user.id,
      term_name: termName,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === MAX_CUSTOM_TERMS_ERROR_CODE) {
      return apiError('VALIDATION_ERROR', 'A contract can have at most 5 custom key terms.')
    }
    return apiError('INTERNAL_ERROR', 'Failed to add the custom term.')
  }

  return NextResponse.json(customTerm, { status: 201 })
}
