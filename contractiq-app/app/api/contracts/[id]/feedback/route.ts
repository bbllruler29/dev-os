import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { FeedbackSchema } from '@/lib/validation/schemas'
import { requireAuth } from '@/lib/security/authGuard'
import { verifyContractOwnership } from '@/lib/security/chatSecurity'

export const runtime = 'nodejs'

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

  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid feedback.')
  }

  const { data: feedback, error } = await supabase
    .from('user_feedback')
    .insert({
      contract_id: params.id,
      user_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .select('*')
    .single()

  if (error || !feedback) {
    return apiError('INTERNAL_ERROR', 'Failed to submit feedback.')
  }

  return NextResponse.json(feedback, { status: 201 })
}
