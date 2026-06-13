const platformFee = 0.02;

const products = [
  { title: 'Ceramic Ritual Set', merchant: 'Maison Kiln', price: 84, commission: 0.22, color: 'clay', links: 148 },
  { title: 'Founder Sprint Kit', merchant: 'Northstar Lab', price: 149, commission: 0.18, color: 'graphite', links: 96 },
  { title: 'Linen Weekender Bag', merchant: 'Sundown Goods', price: 126, commission: 0.2, color: 'linen', links: 212 },
];

const merchantSteps = ['List your product', 'Set your commission', 'Watch affiliates promote it'];
const affiliateSteps = ['Browse products', 'Generate your link', 'Earn on every sale'];

const icon = (name) => {
  const icons = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 2.9 8.4 7 10 4.1-1.6 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4z"/><path d="M16 12h4v4h-4z"/><path d="M4 7l12-3 2 3"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"/></svg>',
  };
  return icons[name] || icons.arrow;
};

function money(value) {
  return `$${value.toFixed(2)}`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'your-slug';
}

function getRole() {
  const params = new URLSearchParams(window.location.search);
  return params.get('role') === 'affiliate' ? 'affiliate' : 'merchant';
}

function shell(content) {
  document.getElementById('app').innerHTML = content;
}

function nav() {
  return `
    <header class="site-nav" data-testid="landing-navigation">
      <a class="brand" href="/" data-testid="brand-home-link" aria-label="SplitLink home">
        <span class="brand-mark" data-testid="brand-logo-mark"></span>
        <span data-testid="brand-name">SplitLink</span>
      </a>
      <nav class="nav-links" aria-label="Primary navigation" data-testid="primary-nav-links">
        <a href="#how-it-works" data-testid="nav-how-it-works-link">How it works</a>
        <a href="#fee" data-testid="nav-fee-link">2% fee</a>
        <a href="#preview" data-testid="nav-preview-link">Preview</a>
      </nav>
      <a class="pill-button small" href="/signup?role=merchant" data-testid="nav-merchant-signup-button">Start selling ${icon('arrow')}</a>
    </header>
  `;
}

function productVisual(product, index) {
  return `
    <article class="product-tile product-${product.color}" data-testid="product-showcase-card-${index}">
      <div class="tile-glass" data-testid="product-showcase-card-content-${index}">
        <span class="badge ghost" data-testid="product-showcase-merchant-${index}">${product.merchant}</span>
        <h3 data-testid="product-showcase-title-${index}">${product.title}</h3>
        <p data-testid="product-showcase-commission-${index}">${Math.round(product.commission * 100)}% commission · ${money(product.price * product.commission)} per sale</p>
      </div>
    </article>
  `;
}

function stepCard(step, index, role) {
  return `
    <article class="step-card" data-testid="${role}-step-card-${index + 1}">
      <div class="step-number" data-testid="${role}-step-number-${index + 1}">0${index + 1}</div>
      <h3 data-testid="${role}-step-title-${index + 1}">${step}</h3>
      <p data-testid="${role}-step-copy-${index + 1}">${role === 'merchant'
        ? ['Create a sharp checkout page without a storefront.', 'Choose a reward that makes creators want to share.', 'Every tracked sale splits cleanly at payment time.'][index]
        : ['Find products worth recommending to your audience.', 'Copy a clean URL, QR code, and share-ready caption.', 'See pending and released commissions without spreadsheets.'][index]
      }</p>
    </article>
  `;
}

function renderLanding() {
  shell(`
    ${nav()}
    <main class="landing-page" data-testid="landing-page">
      <section class="hero-section" data-testid="landing-hero-section">
        <div class="announcement" data-testid="landing-announcement-banner">
          <span data-testid="announcement-copy">Affiliate-native payment links for merchants, creators, and buyers</span>
          <a href="#fee" data-testid="announcement-fee-link">See the 2% model</a>
        </div>
        <div class="hero-grid">
          <div class="hero-copy">
            <span class="eyebrow" data-testid="hero-eyebrow">One link. Three winners.</span>
            <h1 data-testid="hero-headline">Sell more. <span>Share</span> the reward.</h1>
            <p data-testid="hero-subheadline">SplitLink gives merchants polished product links, gives affiliates instant tracked commissions, and gives buyers a fast checkout page with no platform noise.</p>
            <div class="hero-actions" data-testid="hero-role-cta-group">
              <a class="pill-button" href="/signup?role=merchant" data-testid="hero-merchant-cta">I'm a Merchant ${icon('arrow')}</a>
              <a class="outline-button" href="/signup?role=affiliate" data-testid="hero-affiliate-cta">I'm an Affiliate ${icon('arrow')}</a>
            </div>
            <div class="hero-stats" data-testid="hero-trust-stats">
              <div data-testid="hero-stat-platform-fee"><strong>2%</strong><span>platform fee</span></div>
              <div data-testid="hero-stat-payouts"><strong>Stripe</strong><span>powered splits</span></div>
              <div data-testid="hero-stat-links"><strong>0</strong><span>monthly lock-in</span></div>
            </div>
          </div>
          <div class="hero-board" data-testid="hero-marketplace-preview">
            <div class="board-top" data-testid="hero-board-header">
              <span class="badge dark" data-testid="hero-board-badge">Live marketplace</span>
              <span data-testid="hero-board-revenue">$18,420 routed</span>
            </div>
            <div class="floating-link-card" data-testid="hero-affiliate-link-card">
              <div class="icon-bubble">${icon('link')}</div>
              <div><span data-testid="hero-link-label">Affiliate link generated</span><strong data-testid="hero-link-url">splitlink.com/p/ritual-set?ref=K39V8</strong></div>
            </div>
            <div class="visual-stack" data-testid="hero-product-stack">
              ${products.map(productVisual).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="ticker-section" aria-label="Audience strip" data-testid="audience-ticker-section">
        <div class="ticker" data-testid="audience-ticker">
          <span>Merchants list</span><span>Affiliates share</span><span>Buyers checkout</span><span>Stripe splits</span><span>Everyone sees the math</span>
          <span>Merchants list</span><span>Affiliates share</span><span>Buyers checkout</span><span>Stripe splits</span><span>Everyone sees the math</span>
        </div>
      </section>

      <section id="how-it-works" class="section" data-testid="how-it-works-section">
        <div class="section-heading split" data-testid="how-it-works-heading-block">
          <h2 data-testid="how-it-works-title">Two paths. One clean marketplace.</h2>
          <p data-testid="how-it-works-copy">Merchants and affiliates never fight the same dashboard. Each flow has one job and one next step.</p>
        </div>
        <div class="role-columns" data-testid="role-flow-columns">
          <div class="role-panel" data-testid="merchant-flow-panel">
            <div class="panel-title" data-testid="merchant-flow-title"><span>For merchants</span><strong>Products → Revenue</strong></div>
            ${merchantSteps.map((step, index) => stepCard(step, index, 'merchant')).join('')}
          </div>
          <div class="role-panel dark-panel" data-testid="affiliate-flow-panel">
            <div class="panel-title" data-testid="affiliate-flow-title"><span>For affiliates</span><strong>Links → Commission</strong></div>
            ${affiliateSteps.map((step, index) => stepCard(step, index, 'affiliate')).join('')}
          </div>
        </div>
      </section>

      <section id="fee" class="fee-section" data-testid="fee-transparency-section">
        <div class="fee-card" data-testid="fee-breakdown-card">
          <div>
            <span class="eyebrow light" data-testid="fee-eyebrow">Trust signal</span>
            <h2 data-testid="fee-headline">We take 2%. That's it.</h2>
            <p data-testid="fee-copy">No monthly subscription, no hidden affiliate tax, no dashboard upsells. The reward is visible before signup and every product shows the split.</p>
          </div>
          <div class="fee-math" data-testid="fee-math-example">
            <div data-testid="fee-row-buyer"><span>Buyer pays</span><strong>$100.00</strong></div>
            <div data-testid="fee-row-affiliate"><span>Affiliate earns</span><strong>$20.00</strong></div>
            <div data-testid="fee-row-platform"><span>SplitLink fee</span><strong>$2.00</strong></div>
            <div class="total" data-testid="fee-row-merchant"><span>Merchant receives</span><strong>$78.00</strong></div>
          </div>
        </div>
      </section>

      <section id="preview" class="section preview-section" data-testid="buyer-preview-section">
        <div class="section-heading" data-testid="buyer-preview-heading-block">
          <h2 data-testid="buyer-preview-title">The page affiliates actually share.</h2>
          <p data-testid="buyer-preview-copy">A buyer link should feel focused, credible, and fast. No app chrome. No distractions. Just the product and the purchase button.</p>
        </div>
        <div class="buyer-preview" data-testid="buyer-product-page-preview">
          <div class="buyer-image product-clay" data-testid="buyer-preview-product-image">
            <div class="preview-badge" data-testid="buyer-preview-link-badge">Shared via affiliate link</div>
          </div>
          <div class="buyer-content" data-testid="buyer-preview-content">
            <span class="verified" data-testid="buyer-preview-merchant">Maison Kiln · Verified Merchant</span>
            <h3 data-testid="buyer-preview-product-title">Ceramic Ritual Set</h3>
            <p data-testid="buyer-preview-description">A handcrafted trio for slower mornings: cup, pourer, and tray finished in warm matte clay.</p>
            <div class="price-row" data-testid="buyer-preview-price-row"><strong data-testid="buyer-preview-price">$84.00</strong><span data-testid="buyer-preview-secure-copy">Secure checkout powered by Stripe</span></div>
            <button class="pill-button wide" type="button" data-testid="buyer-preview-buy-button">Buy Now — $84.00 ${icon('arrow')}</button>
          </div>
        </div>
      </section>

      <section class="cta-section" data-testid="final-cta-section">
        <h2 data-testid="final-cta-title">Start with the role you actually play.</h2>
        <p data-testid="final-cta-copy">The first click sets the journey: product control for merchants, earning control for affiliates.</p>
        <div class="hero-actions centered" data-testid="final-cta-button-group">
          <a class="pill-button" href="/signup?role=merchant" data-testid="final-merchant-cta">Merchant signup ${icon('arrow')}</a>
          <a class="outline-button" href="/signup?role=affiliate" data-testid="final-affiliate-cta">Affiliate signup ${icon('arrow')}</a>
        </div>
      </section>
    </main>
  `);
}

function renderSignup() {
  const role = getRole();
  const title = role === 'merchant' ? 'Create your merchant storefront.' : 'Create your affiliate identity.';
  const urlBase = role === 'merchant' ? 'splitlink.com/store/' : 'splitlink.com/a/';
  shell(`
    <main class="auth-page" data-testid="signup-page">
      <a class="brand auth-brand" href="/" data-testid="signup-brand-home-link"><span class="brand-mark"></span><span>SplitLink</span></a>
      <section class="auth-card" data-testid="signup-card">
        <div class="auth-copy" data-testid="signup-copy-panel">
          <span class="eyebrow" data-testid="signup-role-eyebrow">${role === 'merchant' ? 'Merchant path selected' : 'Affiliate path selected'}</span>
          <h1 data-testid="signup-title">${title}</h1>
          <p data-testid="signup-description">Minimal setup, clear public URL, and a Stripe connection step after email verification.</p>
          <div class="mode-switch" data-testid="signup-role-switcher">
            <a class="${role === 'merchant' ? 'active' : ''}" href="/signup?role=merchant" data-testid="signup-merchant-role-link">Merchant</a>
            <a class="${role === 'affiliate' ? 'active' : ''}" href="/signup?role=affiliate" data-testid="signup-affiliate-role-link">Affiliate</a>
          </div>
        </div>
        <form class="signup-form" data-testid="signup-form">
          <label data-testid="signup-name-label">Name<input data-testid="signup-name-input" type="text" value="Alex Morgan" /></label>
          <label data-testid="signup-email-label">Email<input data-testid="signup-email-input" type="email" value="alex@splitlink.demo" /></label>
          <label data-testid="signup-password-label">Password<input data-testid="signup-password-input" type="password" value="12345678" /></label>
          <label data-testid="signup-slug-label">Public slug<input id="slug-input" data-testid="signup-slug-input" type="text" value="alex-${role}" /></label>
          <div class="url-preview" data-testid="signup-url-preview"><span data-testid="signup-url-prefix">${urlBase}</span><strong id="slug-preview" data-testid="signup-url-slug">alex-${role}</strong></div>
          <div class="availability" data-testid="signup-availability-message">${icon('check')} <span>Available instantly</span></div>
          <a class="pill-button wide" href="/onboarding?role=${role}" data-testid="signup-submit-button">Create account ${icon('arrow')}</a>
          <p class="fine-print" data-testid="signup-verification-note">Next screen after email verification: connect your Stripe payout account.</p>
        </form>
      </section>
    </main>
  `);
  const input = document.getElementById('slug-input');
  const preview = document.getElementById('slug-preview');
  input.addEventListener('input', () => {
    preview.textContent = slugify(input.value);
  });
}

function renderOnboarding(success = false) {
  const role = getRole();
  shell(`
    <main class="onboarding-page" data-testid="onboarding-page">
      <section class="onboarding-card ${success ? 'success' : ''}" data-testid="${success ? 'onboarding-success-card' : 'onboarding-connect-card'}">
        <a class="brand" href="/" data-testid="onboarding-brand-home-link"><span class="brand-mark"></span><span>SplitLink</span></a>
        ${success ? `
          <div class="success-mark" data-testid="onboarding-success-checkmark">${icon('check')}</div>
          <span class="eyebrow" data-testid="onboarding-success-eyebrow">Stripe connected</span>
          <h1 data-testid="onboarding-success-title">You're ready to enter your ${role} dashboard.</h1>
          <p data-testid="onboarding-success-copy">Your payment account is connected, so revenue and commissions can move automatically when sales happen.</p>
          <a class="pill-button wide" href="/" data-testid="onboarding-success-dashboard-button">Go to ${role} dashboard ${icon('arrow')}</a>
        ` : `
          <div class="icon-bubble large" data-testid="onboarding-stripe-icon">${icon('wallet')}</div>
          <span class="eyebrow" data-testid="onboarding-role-eyebrow">One more step</span>
          <h1 data-testid="onboarding-title">Connect your payment account.</h1>
          <p data-testid="onboarding-description">${role === 'merchant'
            ? 'Stripe lets you receive product revenue automatically after platform fees and affiliate commissions are calculated.'
            : 'Stripe lets you receive commissions securely after the 7-day pending period clears.'
          }</p>
          <a class="pill-button wide" href="/onboarding/success?role=${role}" data-testid="onboarding-connect-stripe-button">Connect with Stripe ${icon('arrow')}</a>
          <p class="fine-print" data-testid="onboarding-distraction-note">No navigation, no dashboard, no distractions until this is complete.</p>
        `}
      </section>
    </main>
  `);
}

function boot() {
  const path = window.location.pathname;
  if (path.startsWith('/signup')) return renderSignup();
  if (path.startsWith('/onboarding/success')) return renderOnboarding(true);
  if (path.startsWith('/onboarding')) return renderOnboarding(false);
  return renderLanding();
}

boot();