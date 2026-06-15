'use client'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export function cents(value: number): string {
  return `$${(Number(value || 0) / 100).toFixed(2)}`
}

export function money(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'your-slug'
  )
}

export function computeFee(priceInDollars: number, commissionRate: number) {
  const gross = priceInDollars
  const platformFee = gross * 0.02
  const affiliateCommission = gross * (commissionRate / 100)
  const merchantPayout = gross - platformFee - affiliateCommission
  return { gross, platformFee, affiliateCommission, merchantPayout }
}

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const { token, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers || {}),
    },
  })

  const text = await res.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  if (!res.ok) {
    const p = payload as Record<string, unknown>
    const msg =
      (p?.error as string) ||
      `Request failed (${res.status})`
    const err = new Error(msg) as Error & { status: number; payload: unknown }
    err.status = res.status
    err.payload = payload
    throw err
  }
  return payload
}
