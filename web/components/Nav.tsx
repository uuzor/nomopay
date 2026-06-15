import Link from 'next/link'
import { IconArrow } from '@/lib/icons'

export function Nav() {
  return (
    <header className="site-nav" data-testid="landing-navigation">
      <Link className="brand" href="/" data-testid="brand-home-link" aria-label="SplitLink home">
        <span className="brand-mark" data-testid="brand-logo-mark" />
        <span data-testid="brand-name">SplitLink</span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation" data-testid="primary-nav-links">
        <a href="#how-it-works" data-testid="nav-how-it-works-link">How it works</a>
        <a href="#fee" data-testid="nav-fee-link">2% fee</a>
        <a href="#preview" data-testid="nav-preview-link">Preview</a>
      </nav>
      <Link className="pill-button small" href="/signup?role=merchant" data-testid="nav-merchant-signup-button">
        Start selling <IconArrow />
      </Link>
    </header>
  )
}
