'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { IconArrow, IconCheck } from '@/lib/icons'

function SuccessContent() {
  const params = useSearchParams()
  const role = params.get('role') === 'affiliate' ? 'affiliate' : 'merchant'

  return (
    <main className="onboarding-page family-onboarding-page" data-testid="onboarding-page">
      <div className="floating-blob blob-blue onboard-blob-one" aria-hidden="true"><span /></div>
      <div className="floating-blob blob-yellow onboard-blob-two" aria-hidden="true"><span /></div>
      <section className="onboarding-card family-onboarding-card success" data-testid="onboarding-success-card">
        <Link className="brand" href="/" data-testid="onboarding-brand-home-link">
          <span className="brand-mark" />
          <span>SplitLink</span>
        </Link>

        <div className="success-mark family-success-mark" data-testid="onboarding-success-checkmark">
          <IconCheck />
        </div>

        <span className="family-kicker" data-testid="onboarding-success-eyebrow">Stripe connected</span>
        <h1 data-testid="onboarding-success-title">
          You&apos;re ready for {role === 'affiliate' ? 'your earning hub' : 'your command center'}.
        </h1>
        <p data-testid="onboarding-success-copy">
          The payout rail is ready. Now SplitLink can show the right dashboard without mixing roles or distracting you.
        </p>

        <div className="onboarding-proof-row" data-testid="onboarding-success-proof-row">
          <span>Profile ready</span>
          <span>Payouts linked</span>
          <span>Mode selected</span>
        </div>

        <Link
          className="family-primary-btn wide"
          href={role === 'affiliate' ? '/affiliate' : '/dashboard'}
          data-testid="onboarding-success-dashboard-button"
        >
          Go to {role} dashboard <IconArrow />
        </Link>
      </section>
    </main>
  )
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
