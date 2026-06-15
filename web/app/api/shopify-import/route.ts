import { NextRequest, NextResponse } from 'next/server'
import { ai, AI_MODEL } from '@/lib/ai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NormalizedProduct {
  title: string
  description: string
  priceUSD: number
  imageUrl: string
  handle: string
}

interface RankedProduct {
  title: string
  description: string
  price: number        // cents
  commissionRate: number
  imageUrl: string
  slug: string
  affiliateSuitability: number
  reason: string
}

// ---------------------------------------------------------------------------
// Domain normalisation
// ---------------------------------------------------------------------------

function normalizeDomain(input: string): string {
  let domain = input.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
  if (!domain.includes('.')) domain = `${domain}.myshopify.com`
  return domain
}

// ---------------------------------------------------------------------------
// Shopify Storefront MCP — tries the official UCP catalog endpoint first.
// POST https://{shop}/api/ucp/mcp  (JSON-RPC 2.0, no auth required)
// Falls back to the public REST endpoint /products.json if MCP is unavailable.
// ---------------------------------------------------------------------------

const UCP_AGENT_PROFILE =
  'https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json'

async function fetchViaMCP(domain: string): Promise<NormalizedProduct[] | null> {
  const endpoint = `https://${domain}/api/ucp/mcp`

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 1,
        params: {
          name: 'search_catalog',
          arguments: {
            meta: { 'ucp-agent': { profile: UCP_AGENT_PROFILE } },
            catalog: { query: '*', first: 20 },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  try {
    // MCP response wraps content as text in result.content[].text (JSON string)
    const rpc = await res.json() as {
      result?: {
        content?: Array<{ type: string; text: string }>
        isError?: boolean
      }
    }

    if (rpc.result?.isError || !rpc.result?.content?.length) return null

    const raw = rpc.result.content.find(c => c.type === 'text')?.text
    if (!raw) return null

    const payload = JSON.parse(raw) as {
      products?: Array<{
        title?: string
        descriptionHtml?: string
        description?: string
        handle?: string
        priceRange?: { minVariantPrice?: { amount?: string } }
        featuredImage?: { url?: string }
        images?: { edges?: Array<{ node?: { url?: string } }> }
      }>
    }

    if (!payload.products?.length) return null

    return payload.products.map(p => ({
      title: p.title ?? '',
      description: stripHtml(p.descriptionHtml ?? p.description ?? ''),
      priceUSD: parseFloat(p.priceRange?.minVariantPrice?.amount ?? '0'),
      imageUrl:
        p.featuredImage?.url ??
        p.images?.edges?.[0]?.node?.url ??
        '',
      handle: p.handle ?? slugify(p.title ?? ''),
    }))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Fallback: public REST endpoint (works on almost all Shopify stores)
// ---------------------------------------------------------------------------

async function fetchViaREST(domain: string): Promise<NormalizedProduct[] | null> {
  let res: Response
  try {
    res = await fetch(`https://${domain}/products.json?limit=50`, {
      headers: { 'User-Agent': 'SplitLink-Importer/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  try {
    const data = await res.json() as {
      products?: Array<{
        title?: string
        body_html?: string
        handle?: string
        variants?: Array<{ price?: string }>
        images?: Array<{ src?: string }>
      }>
    }

    if (!data.products?.length) return null

    return data.products.slice(0, 20).map(p => ({
      title: p.title ?? '',
      description: stripHtml(p.body_html ?? ''),
      priceUSD: parseFloat(p.variants?.[0]?.price ?? '0'),
      imageUrl: p.images?.[0]?.src ?? '',
      handle: p.handle ?? slugify(p.title ?? ''),
    }))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { domain?: string }
    const raw = body?.domain?.trim()
    if (!raw) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const domain = normalizeDomain(raw)

    // Try Shopify Storefront MCP first, fall back to REST
    let products = await fetchViaMCP(domain)
    const source = products ? 'mcp' : 'rest'
    if (!products) products = await fetchViaREST(domain)

    if (!products) {
      return NextResponse.json(
        { error: 'Could not reach that Shopify store. Check the domain and try again.' },
        { status: 422 },
      )
    }

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found in this store.' }, { status: 422 })
    }

    console.log(`[shopify-import] fetched ${products.length} products via ${source} from ${domain}`)

    // Claude ranks and recommends commissions
    const productList = products
      .map((p, i) => `${i + 1}. "${p.title}" | $${p.priceUSD.toFixed(2)} | ${p.description || 'No description'}`)
      .join('\n')

    const message = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are an affiliate marketing strategist. Analyze these Shopify products and select the top 8 most suitable for affiliate marketing. For each, recommend a commission rate (5-40%) based on margin potential and affiliate appeal.

Products:
${productList}

Return ONLY a JSON array with exactly this shape for each selected product (no markdown, no explanation):
[{"index":1,"commissionRate":20,"suitabilityScore":85,"reason":"High-margin niche item with strong social proof appeal"}]

Rank by suitability descending. index is the product number from the list.`,
        },
      ],
    })

    const text = (message.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI analysis failed. Try again.' }, { status: 500 })
    }

    interface AIRanking {
      index: number
      commissionRate: number
      suitabilityScore: number
      reason: string
    }

    const rankings = JSON.parse(jsonMatch[0]) as AIRanking[]

    const result: RankedProduct[] = rankings
      .filter(r => r.index >= 1 && r.index <= products!.length)
      .map(r => {
        const p = products![r.index - 1]
        return {
          title: p.title,
          description: p.description || p.title,
          price: Math.round(p.priceUSD * 100),
          commissionRate: Math.min(80, Math.max(5, r.commissionRate)),
          imageUrl: p.imageUrl,
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
