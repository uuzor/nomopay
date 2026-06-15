'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { DashboardShell } from '@/components/DashboardShell'
import { IconArrow } from '@/lib/icons'
import { apiFetch, slugify } from '@/lib/api'

const PLATFORM_FEE = 0.02

function LiveFeeBreakdown({ price, commission }: { price: number; commission: number }) {
  const gross = price
  const platformFee = gross * PLATFORM_FEE
  const affiliateEarns = gross * (commission / 100)
  const merchantReceives = gross - platformFee - affiliateEarns

  return (
    <div className="family-fee-device" style={{ transform: 'none' }} data-testid="fee-breakdown-preview">
      <div className="device-top" style={{ fontSize: 13 }}>Live fee breakdown</div>
      <div className="fee-device-row">
        <span>Buyer pays</span>
        <strong>${gross.toFixed(2)}</strong>
      </div>
      <div className="fee-device-row orange">
        <span>Affiliate earns ({commission}%)</span>
        <strong>${affiliateEarns.toFixed(2)}</strong>
      </div>
      <div className="fee-device-row">
        <span>Platform fee (2%)</span>
        <strong>${platformFee.toFixed(2)}</strong>
      </div>
      <div className="fee-device-row total">
        <span>You receive</span>
        <strong>${merchantReceives.toFixed(2)}</strong>
      </div>
    </div>
  )
}

export default function NewProductPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [commission, setCommission] = useState(15)
  const [imageUrl, setImageUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const priceNum = parseFloat(price) || 0
  const autoSlug = slug || slugify(title)

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slug) {
      // slug will be auto-generated from title
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !price || priceNum <= 0) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const token = await getToken()
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Math.round(priceNum * 100), // cents
          currency,
          commissionRate: commission,
          imageUrl: imageUrl.trim() || undefined,
          slug: autoSlug,
        }),
        token: token || undefined,
      })
      router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create product.')
      setSaving(false)
    }
  }

  return (
    <DashboardShell role="merchant">
      <div className="dashboard-header" data-testid="new-product-header">
        <div>
          <span className="eyebrow">New product</span>
          <h1 data-testid="new-product-title">Create a product</h1>
          <p>Set the price, commission, and slug — affiliates can generate links as soon as it goes live.</p>
        </div>
        <Link className="pill-button" href="/dashboard" data-testid="new-product-back">
          Back to dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,380px)', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="signup-form family-auth-form" style={{ background: 'var(--color-snow)', borderRadius: 28, padding: 28, boxShadow: 'rgb(228,228,231) 0 1px 0 0 inset' }} data-testid="create-product-form">
          <label data-testid="product-title-label">
            Product title *
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Ceramic Ritual Set"
              required
              data-testid="product-title-input"
            />
          </label>

          <label data-testid="product-description-label">
            Description *
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What makes this product worth sharing…"
              rows={4}
              required
              style={{ width: '100%', border: 0, outline: 0, borderRadius: 14, padding: '14px 16px', background: 'var(--color-fog)', color: 'var(--color-obsidian)', fontWeight: 700, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
              data-testid="product-description-input"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label data-testid="product-price-label">
              Price ({currency.toUpperCase()}) *
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="84.00"
                min="1"
                step="0.01"
                required
                data-testid="product-price-input"
              />
            </label>
            <label data-testid="product-currency-label">
              Currency
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as 'usd' | 'eur')}
                style={{ width: '100%', border: 0, outline: 0, borderRadius: 14, padding: '14px 16px', background: 'var(--color-fog)', color: 'var(--color-obsidian)', fontWeight: 700, fontFamily: 'inherit', fontSize: 14 }}
                data-testid="product-currency-select"
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
              </select>
            </label>
          </div>

          <label data-testid="product-commission-label">
            Affiliate commission — {commission}%
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={commission}
              onChange={e => setCommission(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8 }}
              data-testid="product-commission-slider"
            />
          </label>
          <p style={{ margin: 0, color: 'var(--color-steel)', fontSize: 12, fontWeight: 700 }}>
            Affiliates earn ${(priceNum * commission / 100).toFixed(2)} per sale at {commission}%
          </p>

          <label data-testid="product-slug-label">
            Product slug (URL)
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              placeholder={slugify(title) || 'product-slug'}
              data-testid="product-slug-input"
            />
          </label>
          <div className="url-preview" data-testid="product-url-preview">
            <span style={{ color: 'var(--color-ash)' }}>splitlink.com/p/</span>
            <strong>{autoSlug || 'your-slug'}</strong>
          </div>

          <label data-testid="product-image-label">
            Product image URL (optional)
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://…"
              data-testid="product-image-input"
            />
          </label>

          {error && <div className="inline-error" data-testid="create-product-error">{error}</div>}

          <button
            className="family-primary-btn wide"
            type="submit"
            disabled={saving}
            data-testid="create-product-submit"
          >
            {saving ? 'Publishing…' : 'Publish Product'} <IconArrow />
          </button>
        </form>

        {/* Live fee breakdown */}
        <div data-testid="fee-breakdown-sidebar">
          <p style={{ margin: '0 0 14px', color: 'var(--color-steel)', fontSize: 13, fontWeight: 800 }}>
            LIVE FEE BREAKDOWN
          </p>
          <LiveFeeBreakdown price={priceNum} commission={commission} />
          <p style={{ margin: '12px 0 0', color: 'var(--color-steel)', fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
            Commission motivates affiliates to promote. At {commission}% on ${priceNum.toFixed(2)}, creators earn ${(priceNum * commission / 100).toFixed(2)} — enough to share actively.
          </p>
        </div>
      </div>
    </DashboardShell>
  )
}
