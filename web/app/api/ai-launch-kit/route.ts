import { NextRequest, NextResponse } from 'next/server'
import { ai, AI_MODEL } from '@/lib/ai'

interface LaunchKit {
  tiktok: string[]
  instagram: string[]
  email: string
}

export async function POST(req: NextRequest) {
  try {
    const { productTitle, productDescription, price, commissionRate, affiliateUrl } =
      await req.json() as {
        productTitle: string
        productDescription: string
        price: number
        commissionRate: number
        affiliateUrl: string
      }

    if (!productTitle) {
      return NextResponse.json({ error: 'productTitle is required' }, { status: 400 })
    }

    const commission = ((price * commissionRate) / 100).toFixed(2)

    const message = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You're a social media copywriter creating affiliate marketing content.

Product: "${productTitle}"
Description: ${productDescription || productTitle}
Price: $${price.toFixed(2)}
Affiliate earns: $${commission} per sale (${commissionRate}% commission)
Affiliate link: ${affiliateUrl}

Write marketing copy in this EXACT JSON format (no markdown, no explanation):
{
  "tiktok": [
    "Hook 1 (15-25 words, punchy, scroll-stopping, include link in bio CTA)",
    "Hook 2 (different angle)",
    "Hook 3 (different angle)"
  ],
  "instagram": [
    "Caption 1 (2-3 sentences, conversational, include link in bio CTA)",
    "Caption 2 (different angle)",
    "Caption 3 (different angle)"
  ],
  "email": "Subject: [subject here]\\n\\n[2-3 paragraph email body, professional but warm, clear CTA]"
}`,
      }],
    })

    const raw = (message.content[0] as { text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Content generation failed. Try again.' }, { status: 500 })
    }

    const kit = JSON.parse(jsonMatch[0]) as LaunchKit
    return NextResponse.json({ kit })
  } catch (err) {
    console.error('[ai-launch-kit]', err)
    return NextResponse.json({ error: 'Generation failed. Try again.' }, { status: 500 })
  }
}
