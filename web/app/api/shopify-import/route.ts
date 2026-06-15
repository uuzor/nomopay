import { NextRequest, NextResponse } from 'next/server'
import { ai, AI_MODEL } from '@/lib/ai'

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  vendor: string
  product_type: string
  variants: Array<{ price: string }>
  images: Array<{ src: string }>
  handle: string
}

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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)
}

function domainToApiUrl(input: string): string {
  let domain = input.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!domain.includes('.')) domain = `${domain}.myshopify.com`
  return `https://${domain}/products.json?limit=50`
}

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json() as { domain?: string }
    if (!domain?.trim()) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const apiUrl = domainToApiUrl(domain)
    let shopifyRes: Response
    try {
      shopifyRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'SplitLink-Import/1.0' },
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      return NextResponse.json({ error: 'Could not reach that Shopify store. Check the domain and try again.' }, { status: 422 })
    }

    if (!shopifyRes.ok) {
      return NextResponse.json({ error: 'Store not accessible or not a Shopify store.' }, { status: 422 })
    }

    const data = await shopifyRes.json() as { products?: ShopifyProduct[] }
    const products = (data.products || []).slice(0, 20)

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found in this store.' }, { status: 422 })
    }

    const productList = products.map((p, i) => {
      const price = parseFloat(p.variants[0]?.price || '0')
      const desc = stripHtml(p.body_html || '')
      return `${i + 1}. "${p.title}" | $${price.toFixed(2)} | ${desc || 'No description'}`
    }).join('\n')

    const message = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are an affiliate marketing strategist. Analyze these Shopify products and select the top 8 most suitable for affiliate marketing. For each, recommend a commission rate (5-40%) based on margin potential and affiliate appeal.

Products:
${productList}

Return ONLY a JSON array with exactly this shape for each selected product (no markdown, no explanation):
[{"index":1,"commissionRate":20,"suitabilityScore":85,"reason":"High-margin niche item with strong social proof appeal"}]

Rank by suitability descending. index is the product number from the list.`,
      }],
    })

    const raw = (message.content[0] as { text: string }).text.trim()
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI analysis failed. Try again.' }, { status: 500 })
    }

    interface AIRanking { index: number; commissionRate: number; suitabilityScore: number; reason: string }
    const rankings = JSON.parse(jsonMatch[0]) as AIRanking[]

    const result: RankedProduct[] = rankings
      .filter((r) => r.index >= 1 && r.index <= products.length)
      .map((r) => {
        const p = products[r.index - 1]
        const price = Math.round(parseFloat(p.variants[0]?.price || '0') * 100)
        return {
          title: p.title,
          description: stripHtml(p.body_html || '') || p.title,
          price,
          commissionRate: Math.min(80, Math.max(5, r.commissionRate)),
          imageUrl: p.images[0]?.src || '',
          slug: p.handle,
          affiliateSuitability: r.suitabilityScore,
          reason: r.reason,
        }
      })

    return NextResponse.json({ products: result })
  } catch (err) {
    console.error('[shopify-import]', err)
    return NextResponse.json({ error: 'Import failed. Try again.' }, { status: 500 })
  }
}
