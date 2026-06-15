'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { DashboardShell } from '@/components/DashboardShell'
import { IconArrow, IconSpark } from '@/lib/icons'
import { apiFetch, cents } from '@/lib/api'

interface RankedProduct {
  title: string
  description: string
  price: number
  commissionRate: number
  imageUrl: string
  slug: string
  affiliateSuitability: number
  reason: string
}

const COLORS = ['product-clay', 'product-graphite', 'product-linen']

export default function ShopifyImportPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [domain, setDomain] = useState('')
  const [step, setStep] = useState<'input' | 'analyzing' | 'review' | 'importing' | 'done'>('input')
  const [products, setProducts] = useState<RankedProduct[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [commissions, setCommissions] = useState<Record<number, number>>({})
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!domain.trim()) return
    setStep('analyzing')
    setError('')
    try {
      const res = await fetch('/api/shopify-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      })
      const data = await res.json() as { products?: RankedProduct[]; error?: string }
      if (!res.ok || !data.products) throw new Error(data.error || 'Analysis failed')
      setProducts(data.products)
      const initSelected = new Set(data.products.map((_, i) => i))
      setSelected(initSelected)
      const initCommissions: Record<number, number> = {}
      data.products.forEach((p, i) => { initCommissions[i] = p.commissionRate })
      setCommissions(initCommissions)
      setStep('review')
    } catch (err: unknown) {
      setError((err as Error).message || 'Analysis failed. Check the domain and try again.')
      setStep('input')
    }
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  async function handleImport() {
    const toImport = [...selected].map(i => ({
      ...products[i],
      commissionRate: commissions[i] ?? products[i].commissionRate,
    }))
    if (toImport.length === 0) return
    setStep('importing')
    setError('')
    const token = await getToken()
    let count = 0
    for (const p of toImport) {
      try {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify({
            title: p.title,
            description: p.description,
            price: p.price,
            currency: 'usd',
            commissionRate: p.commissionRate,
            imageUrl: p.imageUrl || undefined,
            slug: p.slug,
          }),
          token: token || undefined,
        })
        count++
      } catch { /* skip duplicates */ }
    }
    setImportedCount(count)
    setStep('done')
  }

  return (
    <DashboardShell role="merchant">
      <div className="dashboard-header" data-testid="import-header">
        <div>
          <span className="eyebrow" style={{ color: 'var(--family-orange)' }}>
            <span style={{ display: 'inline-flex', width: 14, height: 14, marginRight: 4, verticalAlign: 'middle' }}><IconSpark /></span> AI-powered
          </span>
          <h1 data-testid="import-title">Shopify Import Wizard</h1>
          <p data-testid="import-subtitle">
            Paste your store URL — AI ranks your catalog by affiliate appeal and suggests commissions.
          </p>
        </div>
        <Link className="pill-button" href="/dashboard" data-testid="import-back">
          Back to dashboard
        </Link>
      </div>

      {step === 'input' && (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <form
            onSubmit={handleAnalyze}
            className="signup-form family-auth-form"
            style={{ background: 'var(--color-snow)', borderRadius: 28, padding: 32, boxShadow: 'rgb(228,228,231) 0 1px 0 0 inset' }}
            data-testid="import-form"
          >
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
              <p style={{ color: 'var(--color-steel)', fontWeight: 700, fontSize: 14 }}>
                Works with any public Shopify store
              </p>
            </div>

            <label data-testid="import-domain-label">
              Shopify store URL
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="yourstore.myshopify.com"
                required
                data-testid="import-domain-input"
              />
            </label>
            <p style={{ margin: '-8px 0 16px', color: 'var(--color-steel)', fontSize: 12, fontWeight: 700 }}>
              Also works with custom domains like yourstore.com
            </p>

            {error && <div className="inline-error" data-testid="import-error">{error}</div>}

            <button className="family-primary-btn wide" type="submit" data-testid="import-analyze-button">
              Analyze with AI <IconArrow />
            </button>
          </form>
        </div>
      )}

      {step === 'analyzing' && (
        <div style={{ textAlign: 'center', padding: '80px 0' }} data-testid="import-analyzing">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h2 style={{ margin: '0 0 8px' }}>Analyzing your catalog…</h2>
          <p style={{ color: 'var(--color-steel)', fontWeight: 700 }}>
            Claude is ranking products by affiliate appeal and suggesting commissions
          </p>
        </div>
      )}

      {step === 'review' && products.length > 0 && (
        <div data-testid="import-review">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ margin: 0, color: 'var(--color-steel)', fontWeight: 800, fontSize: 14 }}>
              {products.length} PRODUCTS RANKED BY AFFILIATE SUITABILITY · {selected.size} SELECTED
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="pill-button small"
                onClick={() => setSelected(new Set(products.map((_, i) => i)))}
                data-testid="import-select-all"
              >
                Select all
              </button>
              <button
                type="button"
                className="family-primary-btn"
                onClick={handleImport}
                disabled={selected.size === 0}
                data-testid="import-confirm-button"
              >
                Import {selected.size} product{selected.size !== 1 ? 's' : ''} <IconArrow />
              </button>
            </div>
          </div>

          <div className="product-grid" data-testid="import-product-grid">
            {products.map((p, i) => (
              <article
                key={i}
                className={`dashboard-product-card ${selected.has(i) ? '' : 'opacity-50'}`}
                style={{ opacity: selected.has(i) ? 1 : 0.45, cursor: 'pointer' }}
                onClick={() => toggleSelect(i)}
                data-testid={`import-product-card-${i + 1}`}
              >
                <div className={`product-thumb ${COLORS[i % COLORS.length]}`}>
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                  )}
                </div>
                <div className="dashboard-product-body">
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span className="badge dark" data-testid={`import-suitability-${i + 1}`}>
                      {p.affiliateSuitability}% match
                    </span>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                      onClick={e => e.stopPropagation()}
                      style={{ marginLeft: 'auto' }}
                      data-testid={`import-checkbox-${i + 1}`}
                    />
                  </div>
                  <h3 data-testid={`import-product-title-${i + 1}`}>{p.title}</h3>
                  <p style={{ color: 'var(--color-steel)', fontSize: 13 }}>{p.reason}</p>
                  <p data-testid={`import-product-price-${i + 1}`} style={{ fontWeight: 800 }}>
                    {cents(p.price)}
                  </p>
                  <label
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'block', color: 'var(--color-steel)', fontSize: 12, fontWeight: 800, marginTop: 8 }}
                    data-testid={`import-commission-label-${i + 1}`}
                  >
                    Commission: {commissions[i] ?? p.commissionRate}%
                    <input
                      type="range"
                      min={5}
                      max={80}
                      value={commissions[i] ?? p.commissionRate}
                      onChange={e => setCommissions(prev => ({ ...prev, [i]: Number(e.target.value) }))}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', marginTop: 4 }}
                      data-testid={`import-commission-slider-${i + 1}`}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>

          {error && <div className="inline-error" style={{ marginTop: 16 }}>{error}</div>}
        </div>
      )}

      {step === 'importing' && (
        <div style={{ textAlign: 'center', padding: '80px 0' }} data-testid="import-importing">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ margin: '0 0 8px' }}>Importing products…</h2>
          <p style={{ color: 'var(--color-steel)', fontWeight: 700 }}>Creating your product listings</p>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '80px 0' }} data-testid="import-done">
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: '0 0 8px' }} data-testid="import-done-count">
            {importedCount} product{importedCount !== 1 ? 's' : ''} imported!
          </h2>
          <p style={{ color: 'var(--color-steel)', fontWeight: 700, marginBottom: 24 }}>
            Affiliates can now generate links for your new products.
          </p>
          <button
            className="family-primary-btn"
            type="button"
            onClick={() => router.push('/dashboard')}
            data-testid="import-go-dashboard"
          >
            Go to dashboard <IconArrow />
          </button>
        </div>
      )}
    </DashboardShell>
  )
}
