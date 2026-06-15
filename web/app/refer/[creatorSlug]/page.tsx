import { Metadata } from 'next'
import ReferralClient from './ReferralClient'

interface Creator {
  name: string
  slug: string
  role: string
}

async function getCreator(slug: string): Promise<Creator | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/by-slug/${slug}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json() as { user?: Creator }
    return data.user || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ creatorSlug: string }> }): Promise<Metadata> {
  const { creatorSlug } = await params
  const creator = await getCreator(creatorSlug)
  const name = creator?.name || creatorSlug
  return {
    title: `Join SplitLink via ${name}'s referral`,
    description: `${name} invited you to sell on SplitLink. Set up your affiliate program and start earning today.`,
  }
}

export default async function ReferralPage({ params }: { params: Promise<{ creatorSlug: string }> }) {
  const { creatorSlug } = await params
  const creator = await getCreator(creatorSlug)
  return <ReferralClient creator={creator} creatorSlug={creatorSlug} />
}
