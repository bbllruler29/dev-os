import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// The client must call this route instead of supabase.auth.signOut()
// directly so the session cookie is cleared server-side via createClient().
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return new NextResponse(null, { status: 204 })
}
