import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { CorrectKeyTermSchema } from '@/lib/validation/schemas'
import { requireAuth } from '@/lib/security/authGuard'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; termId: string } }
) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid request body.')
  }

  const parsed = CorrectKeyTermSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid value.')
  }

  const { data: existingTerm } = await supabase
    .from('key_terms')
    .select('id, value, is_edited, original_ai_value')
    .eq('id', params.termId)
    .eq('contract_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingTerm) {
    return apiError('NOT_FOUND', 'Key term not found.')
  }

  const { data: updatedTerm, error } = await supabase
    .from('key_terms')
    .update({
      value: parsed.data.value,
      is_edited: true,
      original_ai_value: existingTerm.is_edited ? existingTerm.original_ai_value : existingTerm.value,
      edited_at: new Date().toISOString(),
    })
    .eq('id', params.termId)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error || !updatedTerm) {
    return apiError('INTERNAL_ERROR', 'Failed to save the correction.')
  }

  return NextResponse.json(updatedTerm)
}
