'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import { Suspense, useState } from 'react'
import { IconArrow, IconSpark } from '@/lib/icons'
import { slugify } from '@/lib/api'

function SignupContent() {
  const params = useSearchParams()
  const role = params.get('role') === 'affiliate' ? 'affiliate' : 'merchant'
  const [slug, setSlug] = useState(`alex-${role}`)
  const urlBase = role === 'merchant' ? 'splitlink.com/store/' : 'splitlink.com/a/'

  return (
    <main className="auth-page family-auth-page" data-testid="signup-page">
      <div className="floating-blob blob-orange auth-blob-one" aria-hidden="true"><span /></div>
      <div className="floating-blob blob-green auth-blob-two" aria-hidden="true"><span /></div>
      <div className="floating-coin auth-coin" aria-hidden="true">{role === 'merchant' ? '$' : '%'}</div>
      <Link className="brand auth-brand" href="/" data-testid="signup-brand-home-link">
        <span className="brand-mark" />
        <span>SplitLink</span>
      </Link>
      <section className="auth-card family-auth-card" data-testid="signup-card">
        <div className="auth-copy family-auth-story" data-testid="signup-copy-panel">
          <span className="family-kicker" data-testid="signup-role-eyebrow">
            {role === 'merchant' ? 'Merchant path selected' : 'Affiliate path selected'}
          </span>
          <h1 data-testid="signup-title">
            {role === 'merchant' ? 'Create your merchant storefront.' : 'Create your affiliate identity.'}
          </h1>
          <p data-testid="signup-description">
            Pick your role, claim your public URL, then connect Stripe before your dashboard appears.
          </p>
          <div className="auth-path-preview" data-testid="signup-path-preview-card">
            <span data-testid="signup-path-label">Your public path</span>
            <strong data-testid="signup-path-value">
              {urlBase}<em>{slug}</em>
            </strong>
          </div>
          <div className="mode-switch" data-testid="signup-role-switcher">
            <Link
              href="/signup?role=merchant"
              className={role === 'merchant' ? 'active' : ''}
              data-testid="signup-merchant-role-link"
            >
              Merchant
            </Link>
            <Link
              href="/signup?role=affiliate"
              className={role === 'affiliate' ? 'active' : ''}
              data-testid="signup-affiliate-role-link"
            >
              Affiliate
            </Link>
          </div>
        </div>

        <div className="signup-form family-auth-form" data-testid="signup-form">
          <div className="form-header-note" data-testid="signup-form-header-note">
            <span><IconSpark /></span>
            <strong>Sign up, then connect Stripe to unlock your dashboard.</strong>
          </div>

          {/* Slug preview input — for display only, slug is set on onboarding */}
          <label data-testid="signup-slug-label">
            Your public slug (preview)
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              data-testid="signup-slug-input"
            />
          </label>
          <div className="url-preview" data-testid="signup-url-preview">
            <span data-testid="signup-url-prefix">{urlBase}</span>
            <strong data-testid="signup-url-slug">{slug}</strong>
          </div>
          <div className="availability" data-testid="signup-availability-message">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
            <span>Available</span>
          </div>

          <SignUp
            routing="hash"
            afterSignUpUrl={`/onboarding?role=${role}&slug=${slug}`}
            afterSignInUrl={role === 'affiliate' ? '/affiliate' : '/dashboard'}
            unsafeMetadata={{ role, slug }}
          />

          <p className="fine-print" data-testid="signup-verification-note">
            After email verification, connect your Stripe payout account.
          </p>
        </div>
      </section>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}
