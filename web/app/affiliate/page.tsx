'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Suspense, useEffect, useState } from 'react'
import { DashboardShell, StatCards, EmptyState } from '@/components/DashboardShell'
import { IconArrow, IconX } from '@/lib/icons'
import { apiFetch, cents, money } from '@/lib/api'

const COLORS = ['product-clay', 'product-graphite', 'product-linen']

interface AffiliateLink {
  id: string
  refCode: string
  customLabel: string | null
  product: {
    id: string
    title: string
    price: number
    commissionRate: string
    slug: string
    status: string
    merchant: { name: string }
  }
  _count: { clicks: number; transactions: number }
}

interface MarketplaceProduct {
  id: string
  title: string
  price: number
  commissionRate: string
  slug: string
  merchant: { name: string; slug: string }
  _count: { affiliateLinks: number; transactions: number }
}

interface AffiliateAnalytics {
  totalEarned: number
  totalClicks: number
  conversionRate: string
  transactionCount: number
}

interface GeneratedLink {
  url: string
  refCode: string
  productTitle: string
  productDescription?: string
  price: number
  commissionRate: number
}

interface LaunchKit {
  tiktok: string[]
  instagram: string[]
  email: string
}

function GenerateModal({ link, onClose }: { link: GeneratedLink; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [clicks, setClicks] = useState(500)
  const [tab, setTab] = useState<'link' | 'kit'>('link')
  const [kit, setKit] = useState<LaunchKit | null>(null)
  const [kitLoading, setKitLoading] = useState(false)
  const [kitError, setKitError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null)
  const conversion = 3.2
  const monthlyEarning = (clicks * (conversion / 100) * link.price * (link.commissionRate / 100))

  async function copy() {
    await navigator.clipboard?.writeText(link.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard?.writeText(text)
    setCopiedIdx(key)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  async function openKitTab() {
    setTab('kit')
    if (kit || kitLoading) return
    setKitLoading(true)
    setKitError('')
    try {
      const res = await fetch('/api/ai-launch-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productTitle: link.productTitle,
          productDescription: link.productDescription || link.productTitle,
          price: link.price,
          commissionRate: link.commissionRate,
          affiliateUrl: link.url,
        }),
      })
      const data = await res.json() as { kit?: LaunchKit; error?: string }
      if (!res.ok || !data.kit) throw new Error(data.error || 'Generation failed')
      setKit(data.kit)
    } catch (err: unknown) {
      setKitError((err as Error).message || 'Content generation failed')
    } finally {
      setKitLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" data-testid="affiliate-generate-modal" onClick={onClose}>
      <div className="share-modal" data-testid="affiliate-share-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <button type="button" className="modal-close" onClick={onClose} data-testid="affiliate-share-modal-close">
          <IconX />
        </button>

        <div className="dashboard-tabs" style={{ marginBottom: 16 }}>
          <button type="button" className={tab === 'link' ? 'active' : ''} onClick={() => setTab('link')} data-testid="modal-tab-link">
            Your link
          </button>
          <button type="button" className={tab === 'kit' ? 'active' : ''} onClick={openKitTab} data-testid="modal-tab-kit">
            ✨ AI Launch Kit
          </button>
        </div>

        {tab === 'link' && (
          <>
            <h3 data-testid="affiliate-share-modal-title">Your link is ready</h3>
            <p style={{ color: 'var(--color-steel)', fontSize: 13, fontWeight: 700, margin: '8px 0 14px' }}>
              {link.productTitle} · Earn {link.commissionRate}% per sale
            </p>
            <div className="copy-row" data-testid="affiliate-share-modal-url-row">
              <span data-testid="affiliate-share-modal-url">{link.url}</span>
              <button type="button" onClick={copy} data-testid="affiliate-share-modal-copy">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ marginTop: 18, padding: 14, borderRadius: 18, background: 'var(--color-fog)' }}>
              <p style={{ margin: '0 0 10px', color: 'var(--color-steel)', fontSize: 12, fontWeight: 850 }}>EARNINGS CALCULATOR</p>
              <label style={{ color: 'var(--color-graphite)', fontSize: 13, fontWeight: 800, display: 'block' }}>
                Monthly clicks: {clicks}
                <input
                  type="range"
                  min={10}
                  max={5000}
                  step={10}
                  value={clicks}
                  onChange={e => setClicks(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </label>
              <p style={{ margin: '10px 0 0', color: 'var(--color-graphite)', fontWeight: 800, fontSize: 14 }}>
                At {conversion}% conversion → <strong style={{ fontSize: 18 }}>{money(monthlyEarning)}/mo</strong>
              </p>
            </div>
            <div className="share-row" style={{ marginTop: 14 }} data-testid="affiliate-share-buttons">
              <button type="button" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check this out: ${link.url}`)}`)} >Twitter/X</button>
              <button type="button" onClick={copy}>Instagram caption</button>
              <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(link.url)}`)}>WhatsApp</button>
            </div>
          </>
        )}

        {tab === 'kit' && (
          <div data-testid="affiliate-launch-kit">
            {kitLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }} data-testid="kit-loading">
                <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
                <p style={{ fontWeight: 700, color: 'var(--color-steel)' }}>Claude is writing your content…</p>
              </div>
            )}
            {kitError && <div className="inline-error" data-testid="kit-error">{kitError}</div>}
            {kit && !kitLoading && (
              <>
                <h3 style={{ marginBottom: 16 }}>AI Launch Kit</h3>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', color: 'var(--color-steel)', fontSize: 12, fontWeight: 850 }}>🎵 TIKTOK HOOKS</p>
                  {kit.tiktok.map((t, i) => (
                    <div key={i} className="copy-row" style={{ marginBottom: 8 }} data-testid={`kit-tiktok-${i + 1}`}>
                      <span style={{ fontSize: 13 }}>{t}</span>
                      <button type="button" onClick={() => copyText(t, `tiktok-${i}`)}>{copiedIdx === `tiktok-${i}` ? '✓' : 'Copy'}</button>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', color: 'var(--color-steel)', fontSize: 12, fontWeight: 850 }}>📸 INSTAGRAM CAPTIONS</p>
                  {kit.instagram.map((t, i) => (
                    <div key={i} className="copy-row" style={{ marginBottom: 8 }} data-testid={`kit-instagram-${i + 1}`}>
                      <span style={{ fontSize: 13 }}>{t}</span>
                      <button type="button" onClick={() => copyText(t, `instagram-${i}`)}>{copiedIdx === `instagram-${i}` ? '✓' : 'Copy'}</button>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ margin: '0 0 8px', color: 'var(--color-steel)', fontSize: 12, fontWeight: 850 }}>✉️ EMAIL BLURB</p>
                  <div style={{ background: 'var(--color-fog)', borderRadius: 14, padding: 12, fontSize: 13, whiteSpace: 'pre-line' }} data-testid="kit-email">
                    {kit.email}
                  </div>
                  <button type="button" onClick={() => copyText(kit.email, 'email')} style={{ marginTop: 8, fontSize: 12 }} className="pill-button small" data-testid="kit-email-copy">
                    {copiedIdx === 'email' ? 'Copied!' : 'Copy email'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AffiliateDashboardContent() {
  const params = useSearchParams()
  const tab = params.get('tab') === 'discover' ? 'discover' : 'links'
  const { getToken } = useAuth()

  const [analytics, setAnalytics] = useState<AffiliateAnalytics | null>(null)
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [marketplace, setMarketplace] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<GeneratedLink | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const token = await getToken()
      try {
        const [analyticsData, linksData, productsData] = await Promise.all([
          apiFetch('/api/analytics/affiliate', { token: token || undefined }) as Promise<AffiliateAnalytics>,
          apiFetch('/api/affiliate-links', { token: token || undefined }) as Promise<{ links: AffiliateLink[] }>,
          apiFetch('/api/products', { token: token || undefined }) as Promise<{ products: MarketplaceProduct[] }>,
        ])
        setAnalytics(analyticsData)
        setLinks(linksData.links || [])
        const sorted = [...(productsData.products || [])].sort(
          (a, b) => (Number(b.price) * Number(b.commissionRate)) - (Number(a.price) * Number(a.commissionRate))
        )
        setMarketplace(sorted)
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to load affiliate data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken])

  async function generateLink(productId: string, product: MarketplaceProduct) {
    setGenerating(productId)
    try {
      const token = await getToken()
      const result = await apiFetch('/api/affiliate-links', {
        method: 'POST',
        body: JSON.stringify({ productId }),
        token: token || undefined,
      }) as { link?: { refCode: string }; url?: string }

      const refCode = result?.link?.refCode || 'REFCODE'
      const url = result?.url || `${window.location.origin}/p/${product.slug}?ref=${refCode}`
      setModal({
        url,
        refCode,
        productTitle: product.title,
        price: product.price / 100,
        commissionRate: Number(product.commissionRate),
      })
    } catch (err: unknown) {
      alert((err as Error).message || 'Could not generate link.')
    } finally {
      setGenerating(null)
    }
  }

  const pending = (analytics?.totalEarned || 0) * 0.25 // approximate 7-day hold

  return (
    <DashboardShell role="affiliate">
      {modal && <GenerateModal link={modal} onClose={() => setModal(null)} />}

      <div className="dashboard-header" data-testid="affiliate-dashboard-header">
        <div>
          <span className="eyebrow">Earning hub</span>
          <h1 data-testid="affiliate-dashboard-title">Affiliate dashboard</h1>
          <p data-testid="affiliate-dashboard-subtitle">
            Your links, pending commissions, conversion signal, and product discovery.
          </p>
        </div>
        <Link className="pill-button" href="/onboarding?role=affiliate" data-testid="affiliate-connect-status-button">
          Connect payouts <IconArrow />
        </Link>
      </div>

      <StatCards
        role="affiliate"
        cards={[
          { label: 'Total Earned', value: cents(analytics?.totalEarned || 0), note: `${analytics?.transactionCount || 0} paid conversions` },
          { label: 'Pending', value: cents(pending), note: 'Held 7 days before release' },
          { label: 'Conversion Rate', value: `${analytics?.conversionRate || '0.0'}%`, note: `${analytics?.totalClicks || 0} tracked clicks` },
          { label: 'Active Links', value: String(links.length), note: 'Generated product links' },
        ]}
      />

      <div className="dashboard-tabs" data-testid="affiliate-dashboard-tabs">
        <Link href="/affiliate" className={tab === 'links' ? 'active' : ''} data-testid="affiliate-links-tab">
          My Links
        </Link>
        <Link href="/affiliate?tab=discover" className={tab === 'discover' ? 'active' : ''} data-testid="affiliate-discover-tab">
          Discover
        </Link>
      </div>

      {loading && <div className="dashboard-loading" data-testid="affiliate-dashboard-loading">Loading…</div>}
      {error && <div className="inline-error" data-testid="affiliate-dashboard-error">{error}</div>}

      {!loading && tab === 'links' && (
        <section className="affiliate-link-grid" data-testid="affiliate-links-grid">
          {links.length === 0 ? (
            <EmptyState
              role="affiliate-links"
              title="No links yet"
              copy="Browse the Discover tab to find products and generate your first tracked link."
              action={
                <Link className="pill-button" href="/affiliate?tab=discover">
                  Discover products <IconArrow />
                </Link>
              }
            />
          ) : links.map((link, i) => {
            const product = link.product
            const clicks = link._count?.clicks || 0
            const conversions = link._count?.transactions || 0
            const rate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0'
            const commission = Number(product.commissionRate || 0)
            const estMonthly = (500 * (3.2 / 100) * (product.price / 100) * (commission / 100))
            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${product.slug}?ref=${link.refCode}`

            return (
              <article className="affiliate-link-card" key={link.id} data-testid={`affiliate-link-card-${i + 1}`}>
                <div className={`product-thumb ${COLORS[i % COLORS.length]}`} />
                <div>
                  <span className={`badge dark`}>{product.status}</span>
                  <h3 data-testid={`affiliate-link-title-${i + 1}`}>{product.title}</h3>
                  <div className="copy-row" data-testid={`affiliate-link-url-${i + 1}`}>
                    <span>{url}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(url)}
                      data-testid={`affiliate-link-copy-${i + 1}`}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mini-metrics">
                    <span>{clicks} clicks</span>
                    <span>{conversions} conversions</span>
                    <span>{rate}% rate</span>
                  </div>
                  <p className="simulator-line" data-testid={`affiliate-link-simulator-${i + 1}`}>
                    At your {rate}% rate, 500 more clicks ≈ {money(estMonthly)}/mo
                  </p>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {!loading && tab === 'discover' && (
        <section className="discover-grid" data-testid="affiliate-discover-grid">
          {marketplace.length === 0 ? (
            <EmptyState
              role="affiliate-discover"
              title="No products yet"
              copy="Products will appear here once merchants publish them."
            />
          ) : marketplace.map((product, i) => {
            const price = product.price / 100
            const rate = Number(product.commissionRate || 0)
            const commission = price * (rate / 100)

            return (
              <article className="discover-card" key={product.id} data-testid={`affiliate-discover-card-${i + 1}`}>
                <div className={`product-thumb ${COLORS[i % COLORS.length]}`} />
                <span className="verified">{product.merchant?.name}</span>
                <h3 data-testid={`affiliate-discover-title-${i + 1}`}>{product.title}</h3>
                <p data-testid={`affiliate-discover-commission-${i + 1}`}>
                  ${price.toFixed(2)} · Earn {rate}% = ${commission.toFixed(2)}/sale
                </p>
                <p className="estimate" data-testid={`affiliate-discover-estimate-${i + 1}`}>
                  Drive 10 sales → ${(commission * 10).toFixed(2)} earned
                </p>
                <button
                  type="button"
                  className="pill-button wide"
                  disabled={generating === product.id}
                  onClick={() => generateLink(product.id, product)}
                  data-testid={`affiliate-generate-link-${i + 1}`}
                >
                  {generating === product.id ? 'Generating…' : 'Generate My Link'} <IconArrow />
                </button>
              </article>
            )
          })}
        </section>
      )}
    </DashboardShell>
  )
}

export default function AffiliateDashboard() {
  return (
    <Suspense>
      <AffiliateDashboardContent />
    </Suspense>
  )
}
