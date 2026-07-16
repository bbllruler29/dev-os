import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createSupabaseClient<any>> | null = null

/**
 * Service-role Supabase client. Bypasses RLS — only ever import this from
 * server-only modules (lib/security/*), never from a route handler directly
 * and never from client components. The service role key must stay
 * unprefixed (no NEXT_PUBLIC_) so it is never bundled to the browser.
 */
export function createAdminClient() {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase admin client is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    }

    adminClient = createSupabaseClient<any>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return adminClient
}
