import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/utils/apiError'
import { checkRateLimit, rateLimitedResponse, getClientIp } from '@/lib/security/rateLimiter'

export const runtime = 'nodejs'

const SignupSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

// Same rationale as /api/auth/login — server-side so the signup bucket of
// the auth rate limit (10 req/min per IP) actually applies.
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

  const parsed = SignupSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid signup details.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)

  if (error) {
    return apiError('VALIDATION_ERROR', error.message)
  }

  return NextResponse.json({
    confirmationRequired: !data.session,
    email: parsed.data.email,
  })
}
