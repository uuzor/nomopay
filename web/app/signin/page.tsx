import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="auth-page family-auth-page" data-testid="signin-page">
      <Link className="brand auth-brand" href="/" data-testid="signin-brand-home-link">
        <span className="brand-mark" />
        <span>SplitLink</span>
      </Link>
      <section className="auth-card family-auth-card" data-testid="signin-card">
        <div className="auth-copy family-auth-story" data-testid="signin-copy-panel">
          <span className="family-kicker">Welcome back</span>
          <h1 data-testid="signin-title">Pick up where revenue left off.</h1>
          <p>Sign in to access your merchant or affiliate dashboard.</p>
        </div>
        <div className="signup-form family-auth-form" data-testid="signin-form">
          <SignIn
            routing="hash"
            afterSignInUrl="/dashboard"
          />
        </div>
      </section>
    </main>
  )
}
