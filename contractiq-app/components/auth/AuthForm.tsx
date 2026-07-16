'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type AuthMode = 'login' | 'signup'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

interface FieldErrors {
  email?: string
  password?: string
  form?: string
}

function mapAuthError(mode: AuthMode, message: string): string {
  const normalized = message.toLowerCase()
  if (mode === 'signup' && normalized.includes('already registered')) {
    return 'An account with this email already exists.'
  }
  if (mode === 'login' && (normalized.includes('invalid login') || normalized.includes('invalid credentials'))) {
    return 'Invalid email or password.'
  }
  return message
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {}
    if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    return nextErrors
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload?.error?.message ?? 'Something went wrong. Please try again.'
        setErrors({ form: mapAuthError(mode, message) })
        return
      }

      if (mode === 'signup') {
        if (payload?.confirmationRequired) {
          setConfirmationSent(true)
        } else {
          router.push(redirectTo)
          router.refresh()
        }
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="flex flex-col gap-sm text-center">
        <h2 className="text-h3 text-text-primary">Check your email</h2>
        <p className="text-body text-text-secondary">
          We sent a confirmation link to <strong>{email}</strong>. Confirm your account, then sign in.
        </p>
        <Link href="/login" className="text-body font-semibold text-brand-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
      <div>
        <label htmlFor="email" className="mb-xs block text-body font-medium text-text-primary">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-xs block text-body font-medium text-text-primary">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isSubmitting}
          placeholder="••••••••"
        />
      </div>

      {errors.form && (
        <div className="rounded-input bg-semantic-error/10 px-md py-sm text-body text-semantic-error">
          {errors.form}
          {mode === 'signup' && errors.form.includes('already exists') && (
            <>
              {' '}
              <Link href="/login" className="font-semibold underline">
                Sign in instead?
              </Link>
            </>
          )}
        </div>
      )}

      <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
        {mode === 'signup' ? 'Create Account' : 'Sign In'}
      </Button>

      <p className="text-center text-body text-text-secondary">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-brand-primary hover:underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
