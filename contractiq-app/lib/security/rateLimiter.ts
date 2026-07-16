import { createAdminClient } from '@/lib/supabase/admin'
import { apiError } from '@/lib/utils/apiError'

export type RateLimitAction = 'auth' | 'chat' | 'contract_processing' | 'contract_upload'

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  auth: { max: 10, windowMs: 60_000 }, // 10 requests / minute
  chat: { max: 30, windowMs: 60_000 }, // 30 requests / minute
  contract_processing: { max: 5, windowMs: 60 * 60_000 }, // 5 requests / hour
  contract_upload: { max: 20, windowMs: 24 * 60 * 60_000 }, // 20 uploads / day
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/**
 * Sliding-window rate limit backed by the `rate_limit_events` table.
 * `identifier` is auth.uid() for authenticated actions, or `ip:<address>` for
 * the pre-auth `auth` bucket (login/signup), since those calls have no user
 * yet to key on. Always uses the service-role client so the identifier being
 * checked can never manipulate its own counters via RLS.
 *
 * Fails open on infra errors (logged) — an outage in the rate limit table
 * should not take down the whole app for legitimate users.
 */
export async function checkRateLimit(identifier: string, action: RateLimitAction): Promise<RateLimitResult> {
  const { max, windowMs } = LIMITS[action]
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - windowMs).toISOString()

  let existing: { created_at: string }[]
  try {
    const { data, error } = await admin
      .from('rate_limit_events')
      .select('created_at')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })

    if (error) throw error
    existing = data ?? []
  } catch (err) {
    console.error('[rateLimiter] check failed, failing open:', err)
    return { allowed: true }
  }

  if (existing.length >= max) {
    const oldestMs = new Date(existing[0].created_at).getTime()
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestMs + windowMs - Date.now()) / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  try {
    const { error } = await admin.from('rate_limit_events').insert({ identifier, action })
    if (error) throw error
  } catch (err) {
    console.error('[rateLimiter] failed to record event:', err)
  }

  return { allowed: true }
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  const response = apiError('RATE_LIMITED', 'Too many requests. Please try again later.')
  response.headers.set('Retry-After', String(retryAfterSeconds))
  return response
}

/** Best-effort client IP extraction behind a proxy/load balancer. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
