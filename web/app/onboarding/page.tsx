'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { Suspense, useEffect, useState } from 'react'
import { IconArrow, IconWallet } from '@/lib/icons'
import { apiFetch, slugify } from '@/lib/api'

function OnboardingContent() {
  const params = useSearchParams()
  const router = useRouter()
  const role = params.get('role') === 'affiliate' ? 'affiliate' : 'merchant'
  const slugParam = params.get('slug') || ''
  const referrer = params.get('referrer') || (typeof window !== 'undefined' ? localStorage.getItem('splitlink_referrer') || '' : '')
  const { getToken } = useAuth()
  const { user } = useUser()
  const [status, setStatus] = useState<'registering' | 'ready' | 'error'>('registering')
  const [regMsg, setRegMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    async function register() {
      const token = await getToken()
      const slug = slugParam
        ? slugify(slugParam)
        : slugify(user!.username || user!.fullName || user!.id || `${role}-user`)

      try {
        await apiFetch('/api/users/register', {
          method: 'POST',
          body: JSON.stringify({
            clerkId: user!.id,
            email: user!.emailAddresses[0]?.emailAddress || '',
            name: user!.fullName || user!.firstName || 'SplitLink user',
            role,
            slug,
            referredBySlug: referrer || undefined,
          }),
          token: token || undefined,
        })
        if (referrer && typeof window !== 'undefined') localStorage.removeItem('splitlink_referrer')
        setStatus('ready')
        setRegMsg('Profile ready')
      } catch (err: unknown) {
        if ((err as { status?: number }).status === 409) {
          setStatus('ready')
          setRegMsg('Profile already exists')
        } else {
          setStatus('error')
          setRegMsg((err as Error).message || 'Registration failed')
        }
      }
    }

    register()
  }, [user, getToken, role, slugParam, referrer])

  async function handleConnectStripe() {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const result = await apiFetch('/api/connect/onboard', {
        method: 'POST',
        body: JSON.stringify({}),
        token: token || undefined,
      }) as { url?: string }
      if (result?.url) {
        window.location.href = result.url
      } else {
        throw new Error('Stripe onboarding URL was not returned.')
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Unable to start Stripe onboarding.')
      setLoading(false)
    }
  }

  return (
    <main className="onboarding-page family-onboarding-page" data-testid="onboarding-page">
      <div className="floating-blob blob-blue onboard-blob-one" aria-hidden="true"><span /></div>
      <div className="floating-blob blob-yellow onboard-blob-two" aria-hidden="true"><span /></div>
      <section className="onboarding-card family-onboarding-card" data-testid="onboarding-connect-card">
        <Link className="brand" href="/" data-testid="onboarding-brand-home-link">
          <span className="brand-mark" />
          <span>SplitLink</span>
        </Link>

        <div className="family-wallet-scene" data-testid="onboarding-stripe-icon">
          <div className="wallet-face"><IconWallet /></div>
          <span>Stripe</span>
        </div>

        {referrer && (
          <div style={{ background: 'var(--color-fog)', borderRadius: 12, padding: '8px 14px', marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--color-graphite)' }} data-testid="onboarding-referral-badge">
            Referred by <strong>{referrer}</strong> · They earn 0.1% on your sales
          </div>
        )}
        <span className="family-kicker" data-testid="onboarding-role-eyebrow">One more step</span>
        <h1 data-testid="onboarding-title">Connect your payment account.</h1>
        <p data-testid="onboarding-description">
          {role === 'merchant'
            ? 'Stripe lets product revenue move automatically after the 2% platform fee and affiliate commissions are calculated.'
            : 'Stripe lets commissions move securely after the 7-day pending period clears, so earnings never feel mysterious.'}
        </p>

        {status !== 'registering' && (
          <div
            className={`config-card${status === 'ready' ? ' ready' : ''}`}
            data-testid="onboarding-registration-status"
          >
            <strong>{status === 'ready' ? 'Profile ready' : 'Profile setup issue'}</strong>
            <span>{regMsg}</span>
          </div>
        )}

        <button
          className="family-primary-btn wide"
          type="button"
          onClick={handleConnectStripe}
          disabled={loading || status === 'registering'}
          data-testid="onboarding-connect-stripe-button"
        >
          {loading ? 'Opening Stripe…' : 'Connect with Stripe'} <IconArrow />
        </button>

        {error && (
          <div className="inline-error" data-testid="onboarding-error-message">{error}</div>
        )}

        <div className="onboarding-proof-row" data-testid="onboarding-distraction-note">
          <span>No nav</span>
          <span>No dashboard</span>
          <span>No distractions</span>
        </div>
      </section>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}
