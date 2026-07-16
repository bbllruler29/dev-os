# Auth & Route Protection

Implements FR-01 / US-001. Covers sign-up, sign-in, sign-out, session management, and protected-route middleware.

## User Flow

1. Visitor lands on `/` (marketing page), clicks "Get Started Free".
2. A sign-up modal opens (email + password fields, client-side validation: valid email format, password ≥ 8 chars).
3. Form calls `supabase.auth.signUp({ email, password })` directly from the browser client — no custom Route Handler.
4. On success, Supabase Auth creates a row in `auth.users`; the client SDK receives a session.
5. `middleware.ts` (via `@supabase/ssr`) writes the session into cookies on the next request.
6. Client redirects to `/dashboard`.
7. Returning users use the same modal in "Sign In" mode, calling `supabase.auth.signInWithPassword({ email, password })`.
8. Sign-out calls `supabase.auth.signOut()` and redirects to `/`.

## Files

```
lib/supabase/client.ts       — browser Supabase client (createBrowserClient)
lib/supabase/server.ts       — server component / route handler Supabase client (createServerClient)
middleware.ts                 — session refresh + route protection
app/(auth)/login/page.tsx     — sign-in form
app/(auth)/signup/page.tsx    — sign-up form
components/auth/AuthForm.tsx  — shared form used by both login and signup ('use client')
```

## `lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## `lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

## `middleware.ts`

Protects every route under `/dashboard/*` and `/contracts/*`. Unauthenticated requests to these paths redirect to `/login`. All other routes (marketing, `/login`, `/signup`) pass through.

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/contracts']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  )

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## Validation

- Email: standard email format, required.
- Password: minimum 8 characters, required. No additional complexity rules specified by the PRD — do not invent stricter policy.
- Errors from Supabase Auth (`user already registered`, `invalid credentials`) are surfaced inline under the form, not as toasts.

## Edge Cases

- Duplicate sign-up email → Supabase Auth returns an error; show "An account with this email already exists. Sign in instead?" with a link to `/login`.
- Wrong password → "Invalid email or password."
- Session expiry mid-session → middleware redirects to `/login?redirectTo=<original path>`; after re-auth, redirect back to `redirectTo`.

## Out of Scope

No admin/support role exists (Consolidated Assumption #9). No OAuth/social login — email/password only, per FR-01.
