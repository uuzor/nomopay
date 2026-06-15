'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { IconArrow } from '@/lib/icons'

interface Creator {
  name: string
  slug: string
  role: string
}

const BENEFITS = [
  'Zero transaction fees on the first $1,000 of sales',
  'Affiliate program live in under 5 minutes',
  'Stripe-powered automatic splits — no manual payouts',
]

export default function ReferralClient({ creator, creatorSlug }: { creator: Creator | null; creatorSlug: string }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('splitlink_referrer', creatorSlug)
    }
  }, [creatorSlug])

  const displayName = creator?.name || creatorSlug
  const signupUrl = `/signup?role=merchant&referrer=${encodeURIComponent(creatorSlug)}`

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--family-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      data-testid="referral-page"
    >
      <div style={{ width: 'min(100%, 520px)', textAlign: 'center' }}>
        <div className="floating-blob blob-blue" style={{ top: '10%', left: '5%', opacity: 0.4 }} aria-hidden="true"><span /></div>
        <div className="floating-blob blob-yellow" style={{ bottom: '15%', right: '8%', opacity: 0.35 }} aria-hidden="true"><span /></div>

        <Link className="brand" href="/" style={{ justifyContent: 'center', marginBottom: 32, display: 'flex' }}>
          <span className="brand-mark" />
          <span>SplitLink</span>
        </Link>

        <div
          style={{
            background: 'var(--color-snow)',
            borderRadius: 32,
            padding: '40px 36px',
            boxShadow: 'rgb(228,228,231) 0 1px 0 0 inset, rgba(0,0,0,0.06) 0 8px 32px',
          }}
          data-testid="referral-card"
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>

          <span className="eyebrow" data-testid="referral-eyebrow">Personal invite</span>
          <h1 style={{ fontSize: 28, margin: '8px 0 12px', lineHeight: 1.2 }} data-testid="referral-title">
            {displayName} invited you to SplitLink
          </h1>
          <p style={{ color: 'var(--color-steel)', fontWeight: 700, margin: '0 0 28px' }} data-testid="referral-description">
            {creator
              ? `${displayName} is an affiliate creator on SplitLink. Set up your merchant account through their link and they'll earn a small override on every sale you make — forever.`
              : `You've been invited to join SplitLink — the affiliate-native payment platform for modern merchants.`}
          </p>

          <div style={{ textAlign: 'left', marginBottom: 28 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <span style={{ color: 'var(--family-orange)', fontWeight: 900, fontSize: 16, lineHeight: '20px' }}>✓</span>
                <span style={{ color: 'var(--color-graphite)', fontWeight: 700, fontSize: 14 }}>{b}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--color-fog)', borderRadius: 16, padding: '14px 18px', marginBottom: 24 }}>
            <p style={{ margin: 0, color: 'var(--color-steel)', fontSize: 12, fontWeight: 850 }}>HOW THE OVERRIDE WORKS</p>
            <p style={{ margin: '6px 0 0', color: 'var(--color-graphite)', fontWeight: 700, fontSize: 13 }}>
              {displayName} earns a <strong>0.1% override</strong> on every sale you make — paid from the 2% platform fee, at no extra cost to you.
            </p>
          </div>

          <Link
            className="family-primary-btn wide"
            href={signupUrl}
            data-testid="referral-cta"
          >
            Start selling for free <IconArrow />
          </Link>
          <p style={{ margin: '12px 0 0', color: 'var(--color-ash)', fontSize: 12, fontWeight: 700 }}>
            No credit card required · Takes 5 minutes
          </p>
        </div>

        <p style={{ marginTop: 20, color: 'var(--color-steel)', fontSize: 12, fontWeight: 700 }}>
          Already have an account?{' '}
          <Link href="/signin" style={{ color: 'var(--color-obsidian)', textDecoration: 'underline' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
