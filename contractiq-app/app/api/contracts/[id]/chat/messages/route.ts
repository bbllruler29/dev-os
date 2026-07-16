import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/security/authGuard'
import { verifyContractOwnership, findOwnedSession } from '@/lib/security/chatSecurity'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error
  const { user } = auth

  const ownership = await verifyContractOwnership(supabase, params.id, user.id, 'id')
  if (ownership.error) return ownership.error

  const session = await findOwnedSession(supabase, params.id, user.id)

  if (!session) {
    return NextResponse.json({ messages: [] })
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, citation_page, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}
