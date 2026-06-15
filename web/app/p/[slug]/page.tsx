import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BuyerPageClient from './BuyerPageClient'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

interface Product {
  id: string
  title: string
  description: string
  price: number
  currency: string
  commissionRate: string
  imageUrl: string | null
  slug: string
  status: string
  merchant: { name: string; slug: string }
}

async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json() as { product: Product }
    return data.product
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchProduct(slug)
  if (!product) return { title: 'Product not found' }

  const price = `$${(product.price / 100).toFixed(2)}`
  const description = `${product.description.slice(0, 150)} — ${price} · Secure checkout powered by Stripe`

  return {
    title: `${product.title} — SplitLink`,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  }
}

export default async function BuyerPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { slug } = await params
  const { ref } = await searchParams
  const product = await fetchProduct(slug)

  if (!product) notFound()

  return <BuyerPageClient product={product} refCode={ref} />
}
