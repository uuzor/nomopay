import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SplitLink — Sell more. Share the reward.',
  description:
    'SplitLink turns every product into an affiliate-ready checkout link — merchants list once, affiliates share instantly, Stripe splits automatically.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${plusJakarta.variable} ${fraunces.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
