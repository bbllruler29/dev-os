import type { SupabaseClient, User } from '@supabase/supabase-js'
import { apiError } from '@/lib/utils/apiError'

type RequireAuthResult = { user: User; error?: undefined } | { user?: undefined; error: ReturnType<typeof apiError> }

/**
 * Verifies the caller has a valid Supabase session. Every API route must call
 * this before touching business logic or the database.
 */
export async function requireAuth(supabase: SupabaseClient): Promise<RequireAuthResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: apiError('UNAUTHORIZED', 'You must be signed in.') }
  }

  return { user }
}
