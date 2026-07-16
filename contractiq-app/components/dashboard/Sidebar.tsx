'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, LayoutDashboard, LogOut, Upload } from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts/upload', label: 'Upload Contract', icon: Upload },
]

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col bg-brand-primary px-md py-lg text-white">
      <div className="mb-2xl flex items-center gap-sm px-sm">
        <FileText size={18} strokeWidth={1.5} />
        <span className="text-h4 font-semibold">ContractIQ</span>
      </div>

      <nav className="flex flex-1 flex-col gap-xs">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-sm rounded-input px-sm py-sm text-body transition-colors ${
                isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-xs border-t border-white/10 pt-md">
        {userEmail && <p className="truncate px-sm text-small text-white/60">{userEmail}</p>}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-sm rounded-input px-sm py-sm text-left text-body text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
