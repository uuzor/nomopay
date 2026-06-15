'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { IconArrow } from '@/lib/icons'

interface DashboardShellProps {
  role: 'merchant' | 'affiliate'
  children: React.ReactNode
}

const merchantNav = [
  { href: '/dashboard', label: 'Products' },
  { href: '/dashboard?tab=transactions', label: 'Transactions' },
  { href: '/dashboard/settings', label: 'Settings' },
]

const affiliateNav = [
  { href: '/affiliate', label: 'My Links' },
  { href: '/affiliate?tab=discover', label: 'Discover' },
  { href: '/affiliate/settings', label: 'Settings' },
]

export function DashboardShell({ role, children }: DashboardShellProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()
  const navItems = role === 'merchant' ? merchantNav : affiliateNav
  const displayName = user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User'

  return (
    <main className="dashboard-layout" data-testid={`${role}-dashboard-page`}>
      <aside className="dashboard-sidebar" data-testid={`${role}-dashboard-sidebar`}>
        <Link className="brand" href="/" data-testid={`${role}-dashboard-brand-link`}>
          <span className="brand-mark" />
          <span>SplitLink</span>
        </Link>
        <div className="mode-label" data-testid={`${role}-dashboard-mode-label`}>
          {role === 'merchant' ? 'Merchant mode' : 'Affiliate mode'}
        </div>
        <nav className="dashboard-nav" data-testid={`${role}-dashboard-nav`}>
          {navItems.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || (i === 0 && pathname.startsWith(href.split('?')[0]) && !href.includes('?')) ? 'active' : ''}
              data-testid={`${role}-dashboard-nav-${i + 1}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-user" data-testid={`${role}-dashboard-user-card`}>
          <span>{displayName}</span>
          <button
            type="button"
            data-testid={`${role}-dashboard-signout-button`}
            onClick={() => signOut({ redirectUrl: '/' })}
          >
            Sign out
          </button>
        </div>
      </aside>
      <section className="dashboard-main" data-testid={`${role}-dashboard-main`}>
        {children}
      </section>
    </main>
  )
}

export function StatCards({ role, cards }: {
  role: string
  cards: { label: string; value: string; note: string }[]
}) {
  return (
    <div className="dashboard-stats" data-testid={`${role}-dashboard-stat-cards`}>
      {cards.map((card, i) => (
        <article className="dashboard-stat-card" key={i} data-testid={`${role}-stat-card-${i + 1}`}>
          <span data-testid={`${role}-stat-label-${i + 1}`}>{card.label}</span>
          <strong data-testid={`${role}-stat-value-${i + 1}`}>{card.value}</strong>
          <p data-testid={`${role}-stat-note-${i + 1}`}>{card.note}</p>
        </article>
      ))}
    </div>
  )
}

export function EmptyState({ role, title, copy, action }: {
  role: string
  title: string
  copy: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty-state" data-testid={`${role}-empty-state`}>
      <div className="icon-bubble large">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" />
        </svg>
      </div>
      <h3 data-testid={`${role}-empty-state-title`}>{title}</h3>
      <p data-testid={`${role}-empty-state-copy`}>{copy}</p>
      {action}
    </div>
  )
}

export function DashboardTabs({ tabs }: {
  tabs: { label: string; href: string; active: boolean; testId?: string }[]
}) {
  return (
    <div className="dashboard-tabs">
      {tabs.map(({ label, href, active, testId }) => (
        <Link key={href} href={href} className={active ? 'active' : ''} data-testid={testId}>
          {label}
        </Link>
      ))}
    </div>
  )
}
