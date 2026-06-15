'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Suspense, useEffect, useState } from 'react'
import { DashboardShell, StatCards, EmptyState } from '@/components/DashboardShell'
import { IconArrow } from '@/lib/icons'
import { apiFetch, cents } from '@/lib/api'

const COLORS = ['product-clay', 'product-graphite', 'product-linen']

interface MerchantAnalytics {
  totalRevenue: number
  totalMerchantPayout: number
  totalCommissionsPaid: number
  transactionCount: number
}

interface Product {
  id: string
  title: string
  price: number
  commissionRate: string
  status: string
  _count: { affiliateLinks: number; transactions: number }
}

interface Transaction {
  id: string
  createdAt: string
  grossAmount: number
  merchantPayout: number
  affiliateCommission: number
  platformFee: number
  status: string
  product: { title: string }
}

interface ConnectStatus {
  onboardingComplete: boolean
}

function MerchantDashboardContent() {
  const params = useSearchParams()
  const tab = params.get('tab') === 'transactions' ? 'transactions' : 'products'
  const { getToken } = useAuth()

  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const token = await getToken()
      try {
        const [analytics, productData, txnData, status] = await Promise.all([
          apiFetch('/api/analytics/merchant', { token: token || undefined }) as Promise<MerchantAnalytics>,
          apiFetch('/api/products', { token: token || undefined }) as Promise<{ products: Product[] }>,
          apiFetch('/api/analytics/transactions?role=merchant', { token: token || undefined }) as Promise<{ transactions: Transaction[] }>,
          apiFetch('/api/connect/status', { token: token || undefined }).catch(() => null) as Promise<ConnectStatus | null>,
        ])
        setAnalytics(analytics)
        setProducts(productData.products || [])
        setTransactions(txnData.transactions || [])
        setConnectStatus(status)
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken])

  async function toggleProduct(product: Product) {
    const token = await getToken()
    const newStatus = product.status === 'active' ? 'paused' : 'active'
    try {
      await apiFetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
        token: token || undefined,
      })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p))
    } catch (err: unknown) {
      alert((err as Error).message)
    }
  }

  const activeAffiliates = products.reduce((s, p) => s + (p._count?.affiliateLinks || 0), 0)

  return (
    <DashboardShell role="merchant">
      <div className="dashboard-header" data-testid="merchant-dashboard-header">
        <div>
          <span className="eyebrow">Command center</span>
          <h1 data-testid="merchant-dashboard-title">Merchant dashboard</h1>
          <p data-testid="merchant-dashboard-subtitle">
            Products, revenue, commissions, and payout readiness stay in one focused view.
          </p>
        </div>
        <Link
          className="pill-button"
          href="/onboarding"
          data-testid="merchant-connect-status-button"
        >
          {connectStatus?.onboardingComplete ? 'Stripe ready' : 'Connect Stripe'} <IconArrow />
        </Link>
      </div>

      <StatCards
        role="merchant"
        cards={[
          { label: 'Total Revenue', value: cents(analytics?.totalRevenue || 0), note: `${analytics?.transactionCount || 0} paid transactions` },
          { label: 'Paid Out to You', value: cents(analytics?.totalMerchantPayout || 0), note: 'After platform + affiliate split' },
          { label: 'Commissions Paid', value: cents(analytics?.totalCommissionsPaid || 0), note: 'Sent to affiliate partners' },
          { label: 'Active Affiliates', value: String(activeAffiliates), note: 'Generated product links' },
        ]}
      />

      <div className="dashboard-tabs" data-testid="merchant-dashboard-tabs">
        <Link
          href="/dashboard"
          className={tab === 'products' ? 'active' : ''}
          data-testid="merchant-products-tab"
        >Products</Link>
        <Link
          href="/dashboard?tab=transactions"
          className={tab === 'transactions' ? 'active' : ''}
          data-testid="merchant-transactions-tab"
        >Transactions</Link>
        <Link className="pill-button small" href="/dashboard/products/new" data-testid="merchant-add-product-button">
          + Add Product
        </Link>
        <Link className="pill-button small" href="/dashboard/import" data-testid="merchant-import-button" style={{ background: 'var(--color-obsidian)', color: '#fff' }}>
          🛍️ AI Import
        </Link>
      </div>

      {loading && <div className="dashboard-loading" data-testid="merchant-dashboard-loading">Loading…</div>}

      {error && <div className="inline-error" data-testid="merchant-dashboard-error">{error}</div>}

      {!loading && tab === 'products' && (
        <section className="product-grid" data-testid="merchant-products-grid">
          {products.length === 0 ? (
            <EmptyState
              role="merchant-products"
              title="No products yet"
              copy="Create your first product to start building your affiliate program."
              action={
                <Link className="pill-button" href="/dashboard/products/new" data-testid="merchant-add-first-product">
                  Create product <IconArrow />
                </Link>
              }
            />
          ) : products.map((product, i) => {
            const rate = Number(product.commissionRate || 0)
            const commission = (product.price * (rate / 100)) / 100
            return (
              <article className="dashboard-product-card" key={product.id} data-testid={`merchant-product-card-${i + 1}`}>
                <div className={`product-thumb ${COLORS[i % COLORS.length]}`} data-testid={`merchant-product-image-${i + 1}`} />
                <div className="dashboard-product-body">
                  <span className="badge dark" data-testid={`merchant-product-status-${i + 1}`}>{product.status}</span>
                  <h3 data-testid={`merchant-product-title-${i + 1}`}>{product.title}</h3>
                  <p data-testid={`merchant-product-price-${i + 1}`}>
                    {cents(product.price)} · {rate}% commission ({`$${commission.toFixed(2)}`})
                  </p>
                  <div className="mini-metrics" data-testid={`merchant-product-metrics-${i + 1}`}>
                    <span>{product._count?.affiliateLinks || 0} links</span>
                    <span>{product._count?.transactions || 0} sold</span>
                  </div>
                  <div className="card-actions">
                    <button type="button" data-testid={`merchant-product-edit-${i + 1}`}>Edit</button>
                    <button
                      type="button"
                      onClick={() => toggleProduct(product)}
                      data-testid={`merchant-product-toggle-${i + 1}`}
                    >
                      {product.status === 'paused' ? 'Activate' : 'Pause'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {!loading && tab === 'transactions' && (
        <section className="transaction-panel" data-testid="merchant-transactions-panel">
          <table data-testid="merchant-transactions-table">
            <thead>
              <tr>
                <th>Date</th><th>Product</th><th>Gross</th>
                <th>Your payout</th><th>Affiliate</th><th>Fee</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={7}>No transactions yet.</td></tr>
              ) : transactions.map((txn, i) => (
                <tr key={txn.id} data-testid={`merchant-transaction-row-${i + 1}`}>
                  <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                  <td>{txn.product?.title}</td>
                  <td>{cents(txn.grossAmount)}</td>
                  <td>{cents(txn.merchantPayout)}</td>
                  <td>{cents(txn.affiliateCommission)}</td>
                  <td>{cents(txn.platformFee)}</td>
                  <td><span className="table-status">{txn.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </DashboardShell>
  )
}

export default function MerchantDashboard() {
  return (
    <Suspense>
      <MerchantDashboardContent />
    </Suspense>
  )
}
