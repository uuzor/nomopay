import Link from 'next/link'

export default function ProductNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-mist)' }}>
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <Link className="brand" href="/" style={{ justifyContent: 'center', marginBottom: 32, display: 'flex' }}>
          <span className="brand-mark" />
          <span>SplitLink</span>
        </Link>
        <h1 style={{ fontSize: 48, letterSpacing: '-0.05em', marginBottom: 16 }}>Product not found</h1>
        <p style={{ color: 'var(--color-steel)', marginBottom: 28, fontWeight: 600 }}>
          This product may have been paused or removed by the merchant.
        </p>
        <Link className="pill-button" href="/">Back to SplitLink</Link>
      </div>
    </div>
  )
}
