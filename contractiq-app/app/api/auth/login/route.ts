import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { checkRateLimit, rateLimitedResponse, getClientIp } from '@/lib/security/rateLimiter'

export const runtime = 'nodejs'

const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

// Handles signInWithPassword server-side (via createClient()) so session
// cookies are set correctly on the response, and so login attempts can be
// rate limited — a direct client-side supabase.auth call would bypass both.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`ip:${ip}`, 'auth')
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid request body.')
  }

  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid credentials.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error || !data.session) {
    return apiError('UNAUTHORIZED', 'Invalid email or password.')
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
