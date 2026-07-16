import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen bg-canvas-subtle">
      <Sidebar userEmail={user?.email ?? null} />
      <main className="flex-1 overflow-y-auto px-xl py-xl">{children}</main>
    </div>
  )
}
