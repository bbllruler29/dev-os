import type { SupabaseClient } from '@supabase/supabase-js'
import { apiError } from '@/lib/utils/apiError'

type OwnershipResult<T> = { record: T; error?: undefined } | { record?: undefined; error: ReturnType<typeof apiError> }

/**
 * Confirms `contract.user_id === auth.uid()`. Returns 404 (never 403) on
 * mismatch or absence so a user cannot distinguish "not mine" from
 * "doesn't exist".
 */
export async function verifyContractOwnership(
  supabase: SupabaseClient,
  contractId: string,
  userId: string,
  select = '*'
): Promise<OwnershipResult<Record<string, unknown>>> {
  const { data: contract } = await (supabase.from('contracts').select(select) as any)
    .eq('id', contractId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!contract) {
    return { error: apiError('NOT_FOUND', 'Contract not found.') }
  }
  return { record: contract as Record<string, unknown> }
}

/**
 * Confirms `chat_session.user_id === auth.uid()` for the session tied to a
 * given contract. A `null` session (no chat has started yet) is not an
 * error — callers decide whether that means "create one" or "return empty".
 */
export async function findOwnedSession(
  supabase: SupabaseClient,
  contractId: string,
  userId: string
): Promise<{ id: string } | null> {
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', contractId)
    .eq('user_id', userId)
    .maybeSingle()

  return session ?? null
}
