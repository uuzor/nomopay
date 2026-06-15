import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { IconArrow, IconCheck } from '@/lib/icons'

const MERCHANT_STEPS = [
  { title: 'List your product', copy: 'Create a credible buyer page in minutes.' },
  { title: 'Set your commission', copy: 'Choose a reward that makes sharing worth it.' },
  { title: 'Watch affiliates promote it', copy: 'Every tracked sale shows the split clearly.' },
]

const AFFILIATE_STEPS = [
  { title: 'Browse products', copy: 'Find products with visible payout math.' },
  { title: 'Generate your link', copy: 'Get a tracked URL made for sharing.' },
  { title: 'Earn on every sale', copy: 'Watch clicks turn into held and released earnings.' },
]

const TICKER = ['List product', 'Set commission', 'Generate link', 'Share anywhere', 'Buyer pays', 'Split happens']

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main className="landing-page family-redesign" data-testid="landing-page">

        {/* Hero */}
        <section className="family-hero" data-testid="landing-hero-section">
          <div className="floating-blob blob-orange hero-blob-1" aria-hidden="true"><span /></div>
          <div className="floating-blob blob-green hero-blob-2" aria-hidden="true"><span /></div>
          <div className="floating-blob blob-blue hero-blob-3" aria-hidden="true"><span /></div>
          <div className="floating-coin coin-one" aria-hidden="true">2%</div>
          <div className="floating-coin coin-two" aria-hidden="true">$</div>

          <div className="hero-centerpiece" data-testid="hero-centerpiece">
            <div className="tiny-proof-row" data-testid="hero-proof-row">
              <span data-testid="hero-proof-fee">2% fee</span>
              <span data-testid="hero-proof-checkout">Stripe-powered split</span>
              <span data-testid="hero-proof-no-store">No storefront needed</span>
            </div>
            <h1 data-testid="hero-headline">Sell more.<br />Share the reward.</h1>
            <p data-testid="hero-subheadline">
              SplitLink turns every product into a joyful affiliate-ready checkout link — merchants list once,
              affiliates share instantly, buyers get a page that only wants the sale.
            </p>
            <div className="family-hero-actions" data-testid="hero-role-cta-group">
              <Link className="family-primary-btn" href="/signup?role=merchant" data-testid="hero-merchant-cta">
                I&apos;m a Merchant <IconArrow />
              </Link>
              <Link className="family-secondary-btn" href="/signup?role=affiliate" data-testid="hero-affiliate-cta">
                I&apos;m an Affiliate <IconArrow />
              </Link>
            </div>
          </div>

          <div className="hero-mini mini-left" data-testid="hero-mini-merchant-card">
            <span>Merchant</span>
            <strong>Set 20%</strong>
            <small>Affiliates earn $16.80</small>
          </div>
          <div className="hero-mini mini-right" data-testid="hero-mini-affiliate-card">
            <span>Affiliate</span>
            <strong>Link ready</strong>
            <small>split.link/ceramic?ref=K39V8</small>
          </div>
        </section>

        {/* Ticker */}
        <section className="family-action-strip" aria-label="Platform loop" data-testid="audience-ticker-section">
          <div className="family-action-track" data-testid="audience-ticker">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="family-section" data-testid="how-it-works-section">
          <div className="family-section-heading" data-testid="how-it-works-heading-block">
            <p className="family-kicker" data-testid="how-it-works-kicker">Two journeys, zero collisions</p>
            <h2 data-testid="how-it-works-title">One page does one job.</h2>
            <p data-testid="how-it-works-copy">
              A merchant thinks in products. An affiliate thinks in links. SplitLink keeps both mental models in their own lane.
            </p>
          </div>
          <div className="family-role-grid" data-testid="role-flow-columns">
            <article className="journey-card merchant-journey" data-testid="merchant-flow-panel">
              <div className="journey-character blob-orange" aria-hidden="true"><span /></div>
              <div className="panel-title" data-testid="merchant-flow-title">
                <span>For merchants</span>
                <strong>Products → Revenue</strong>
              </div>
              {MERCHANT_STEPS.map((step, i) => (
                <div className="family-step" key={i} data-testid={`merchant-step-card-${i + 1}`}>
                  <b data-testid={`merchant-step-number-${i + 1}`}>0{i + 1}</b>
                  <div>
                    <h3 data-testid={`merchant-step-title-${i + 1}`}>{step.title}</h3>
                    <p data-testid={`merchant-step-copy-${i + 1}`}>{step.copy}</p>
                  </div>
                </div>
              ))}
            </article>
            <article className="journey-card affiliate-journey" data-testid="affiliate-flow-panel">
              <div className="journey-character blob-blue" aria-hidden="true"><span /></div>
              <div className="panel-title" data-testid="affiliate-flow-title">
                <span>For affiliates</span>
                <strong>Links → Commission</strong>
              </div>
              {AFFILIATE_STEPS.map((step, i) => (
                <div className="family-step" key={i} data-testid={`affiliate-step-card-${i + 1}`}>
                  <b data-testid={`affiliate-step-number-${i + 1}`}>0{i + 1}</b>
                  <div>
                    <h3 data-testid={`affiliate-step-title-${i + 1}`}>{step.title}</h3>
                    <p data-testid={`affiliate-step-copy-${i + 1}`}>{step.copy}</p>
                  </div>
                </div>
              ))}
            </article>
          </div>
        </section>

        {/* Fee transparency */}
        <section id="fee" className="family-section split-fee-scene" data-testid="fee-transparency-section">
          <div className="family-section-heading left" data-testid="fee-heading-block">
            <p className="family-kicker" data-testid="fee-eyebrow">Transparent by default</p>
            <h2 data-testid="fee-headline">We take <span>2%.</span><br />That&apos;s it.</h2>
            <p data-testid="fee-copy">
              The math appears before signup, inside product cards, and inside transactions — no hidden affiliate tax or surprise platform cut.
            </p>
          </div>
          <div className="family-fee-device" data-testid="fee-breakdown-card">
            <div className="device-top" data-testid="fee-device-title">Ceramic Ritual Set</div>
            <div className="fee-device-row" data-testid="fee-row-buyer">
              <span>Buyer pays</span><strong>$100.00</strong>
            </div>
            <div className="fee-device-row orange" data-testid="fee-row-affiliate">
              <span>Affiliate earns</span><strong>$20.00</strong>
            </div>
            <div className="fee-device-row" data-testid="fee-row-platform">
              <span>SplitLink fee</span><strong>$2.00</strong>
            </div>
            <div className="fee-device-row total" data-testid="fee-row-merchant">
              <span>Merchant receives</span><strong>$78.00</strong>
            </div>
          </div>
        </section>

        {/* Buyer page preview */}
        <section id="preview" className="family-section" data-testid="buyer-preview-section">
          <div className="family-section-heading" data-testid="buyer-preview-heading-block">
            <p className="family-kicker" data-testid="buyer-preview-kicker">The money page</p>
            <h2 data-testid="buyer-preview-title">Shared links should feel delightful, not busy.</h2>
            <p data-testid="buyer-preview-copy">
              No navigation. No related products. No account prompt. Just a beautiful product page and one strong checkout button.
            </p>
          </div>
          <div className="buyer-showcase" data-testid="buyer-product-page-preview">
            <div className="buyer-art-card" data-testid="buyer-preview-product-image">
              <div className="buyer-object" aria-hidden="true" />
              <span data-testid="buyer-preview-link-badge">Affiliate link preview</span>
            </div>
            <div className="buyer-checkout-card" data-testid="buyer-preview-content">
              <span className="verified" data-testid="buyer-preview-merchant">Maison Kiln · Verified Merchant</span>
              <h3 data-testid="buyer-preview-product-title">Ceramic Ritual Set</h3>
              <p data-testid="buyer-preview-description">
                A handcrafted trio for slower mornings, finished in warm matte clay and packaged for gifting.
              </p>
              <div className="price-row" data-testid="buyer-preview-price-row">
                <strong data-testid="buyer-preview-price">$84.00</strong>
                <span data-testid="buyer-preview-secure-copy">Secure checkout powered by Stripe</span>
              </div>
              <button className="family-primary-btn wide" type="button" data-testid="buyer-preview-buy-button">
                Buy Now — $84.00 <IconArrow />
              </button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="family-final" data-testid="final-cta-section">
          <div className="floating-blob blob-yellow final-blob" aria-hidden="true"><span /></div>
          <p className="family-kicker" data-testid="final-cta-kicker">Choose your path</p>
          <h2 data-testid="final-cta-title">Start with the role you actually play.</h2>
          <p data-testid="final-cta-copy">
            The first click sets the journey: product control for merchants, earning control for affiliates.
          </p>
          <div className="family-hero-actions centered" data-testid="final-cta-button-group">
            <Link className="family-primary-btn" href="/signup?role=merchant" data-testid="final-merchant-cta">
              Merchant signup <IconArrow />
            </Link>
            <Link className="family-secondary-btn" href="/signup?role=affiliate" data-testid="final-affiliate-cta">
              Affiliate signup <IconArrow />
            </Link>
          </div>
        </section>

      </main>
    </>
  )
}
