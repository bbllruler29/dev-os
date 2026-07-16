import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { requireAuth } from '@/lib/security/authGuard'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!contract) {
    return apiError('NOT_FOUND', 'Contract not found.')
  }

  await supabase.from('contracts').update({ last_accessed_at: new Date().toISOString() }).eq('id', params.id)

  const [{ data: keyTerms }, { data: customKeyTerms }] = await Promise.all([
    supabase
      .from('key_terms')
      .select('*')
      .eq('contract_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('custom_key_terms')
      .select('*')
      .eq('contract_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  return NextResponse.json({
    contract,
    key_terms: keyTerms ?? [],
    custom_key_terms: customKeyTerms ?? [],
  })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, file_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!contract) {
    return apiError('NOT_FOUND', 'Contract not found.')
  }

  if (contract.file_path) {
    await supabase.storage.from('contracts').remove([contract.file_path])
  }

  const { error } = await supabase.from('contracts').delete().eq('id', params.id).eq('user_id', user.id)

  if (error) {
    return apiError('INTERNAL_ERROR', 'Failed to delete the contract.')
  }

  return new NextResponse(null, { status: 204 })
}
