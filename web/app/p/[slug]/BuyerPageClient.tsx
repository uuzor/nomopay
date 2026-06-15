'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IconArrow } from '@/lib/icons'
import { apiFetch } from '@/lib/api'

interface Product {
  id: string
  title: string
  description: string
  price: number
  currency: string
  commissionRate: string
  imageUrl: string | null
  slug: string
  merchant: { name: string; slug: string }
}

const PRODUCT_COLORS = ['product-clay', 'product-graphite', 'product-linen']

function colorForSlug(slug: string) {
  const sum = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return PRODUCT_COLORS[sum % PRODUCT_COLORS.length]
}

export default function BuyerPageClient({ product, refCode }: {
  product: Product
  refCode?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const price = `$${(product.price / 100).toFixed(2)}`

  // Record click server-side for analytics
  useEffect(() => {
    if (!refCode) return
    apiFetch('/api/analytics/click', {
      method: 'POST',
      body: JSON.stringify({ refCode }),
    }).catch(() => {})
  }, [refCode])

  async function handleBuyNow() {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, refCode }),
      }) as { url?: string }
      if (result?.url) {
        window.location.href = result.url
      } else {
        throw new Error('Checkout session URL not returned.')
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Unable to start checkout.')
      setLoading(false)
    }
  }

  const color = colorForSlug(product.slug)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--family-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: 'min(100%, 960px)' }}>
        {/* Minimal header */}
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <Link className="brand" href="/" aria-label="SplitLink home">
            <span className="brand-mark" />
            <span>SplitLink</span>
          </Link>
        </header>

        <div className="buyer-showcase" data-testid="buyer-product-page">
          {/* Product visual */}
          <div className="buyer-art-card" data-testid="buyer-product-image">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px' }}
              />
            ) : (
              <div
                className={`product-tile ${color}`}
                style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '24px' }}
                aria-hidden="true"
              />
            )}
            <span data-testid="buyer-product-secure-badge">Secure checkout · Stripe</span>
          </div>

          {/* Product details + buy */}
          <div className="buyer-checkout-card" data-testid="buyer-product-details">
            <span className="verified" data-testid="buyer-product-merchant">
              {product.merchant.name} · Verified Merchant
            </span>
            <h3 data-testid="buyer-product-title">{product.title}</h3>
            <p data-testid="buyer-product-description">{product.description}</p>
            <div className="price-row" data-testid="buyer-product-price-row">
              <strong data-testid="buyer-product-price">{price}</strong>
              <span>Secure checkout powered by Stripe</span>
            </div>

            <button
              className="family-primary-btn wide"
              type="button"
              onClick={handleBuyNow}
              disabled={loading}
              data-testid="buyer-buy-now-button"
            >
              {loading ? 'Loading…' : `Buy Now — ${price}`} <IconArrow />
            </button>

            {error && (
              <div className="inline-error" style={{ marginTop: 12 }} data-testid="buyer-checkout-error">
                {error}
              </div>
            )}

            <p style={{ marginTop: 16, color: 'var(--color-steel)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
              Payments secured by Stripe. No account required.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
