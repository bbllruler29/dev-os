import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { Card } from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Sign Up — ContractIQ',
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas-subtle px-lg py-3xl">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-lg block text-center text-h4 font-semibold text-text-primary">
          ContractIQ
        </Link>
        <Card>
          <h1 className="mb-lg text-center text-h3 text-text-primary">Get Started Free</h1>
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </Card>
      </div>
    </main>
  )
}
