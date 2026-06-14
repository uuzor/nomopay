const platformFee = 0.02;

const appState = {
  config: { clerkPublishableKey: '', apiBaseUrl: '', stripePublishableKey: '' },
  clerk: null,
  currentUser: null,
  authReady: false,
};

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
  return `$${Number(value || 0).toFixed(2)}`;
}

function cents(value) {
  return money((Number(value || 0)) / 100);
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

function backendBase() {
  return appState.config.apiBaseUrl || '';
}

async function loadConfig() {
  try {
    const response = await fetch('/frontend-config.json');
    appState.config = await response.json();
  } catch {
    appState.config = { clerkPublishableKey: '', apiBaseUrl: '', stripePublishableKey: '' };
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initAuth() {
  if (!appState.config.clerkPublishableKey) {
    appState.authReady = false;
    return;
  }
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js');
    const ClerkConstructor = window.Clerk;
    if (!ClerkConstructor) throw new Error('Clerk unavailable');
    appState.clerk = new ClerkConstructor(appState.config.clerkPublishableKey);
    await appState.clerk.load();
    appState.currentUser = appState.clerk.user || null;
    appState.authReady = true;
  } catch (error) {
    console.warn('Clerk could not initialize:', error);
    appState.authReady = false;
  }
}

async function getAuthToken() {
  if (!appState.clerk?.session) return null;
  try {
    return await appState.clerk.session.getToken();
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${backendBase()}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `Request failed (${response.status})`;
    const err = new Error(typeof message === 'string' ? message : `Request failed (${response.status})`);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

function setupClerkMount(targetId, mode, role) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!appState.config.clerkPublishableKey) {
    target.innerHTML = `<div class="config-card" data-testid="auth-config-missing-message"><strong>Auth configuration needed</strong><span>Clerk keys are not configured in this environment, so real signup cannot start yet.</span></div>`;
    return;
  }
  if (!appState.clerk) {
    target.innerHTML = `<div class="config-card" data-testid="auth-load-error-message"><strong>Auth unavailable</strong><span>Clerk could not load. Please check the frontend publishable key.</span></div>`;
    return;
  }
  try {
    target.innerHTML = '';
    const props = {
      routing: 'hash',
      afterSignUpUrl: `/onboarding?role=${role}`,
      afterSignInUrl: role === 'affiliate' ? '/affiliate' : '/dashboard',
      unsafeMetadata: { role },
    };
    if (mode === 'signin') appState.clerk.mountSignIn(target, props);
    else appState.clerk.mountSignUp(target, props);
  } catch (error) {
    target.innerHTML = `<div class="config-card" data-testid="auth-render-error-message"><strong>Auth render failed</strong><span>${error.message}</span></div>`;
  }
}

function userNameFallback() {
  const user = appState.currentUser;
  return user?.fullName || user?.primaryEmailAddress?.emailAddress || 'SplitLink user';
}

function friendlyError(error, fallback) {
  const message = error?.message || '';
  if (message.includes('API_BASE_URL') || message.includes('Unable to reach configured API backend')) {
    return 'Backend connection is not configured in this environment yet. Once API_BASE_URL and backend credentials are set, this will use the existing backend endpoints.';
  }
  if (message.includes('Missing authorization') || message.includes('Unauthorized') || error?.status === 401) {
    return 'Please sign in with the configured Clerk account before continuing.';
  }
  return message || fallback;
}

function dashboardShell(role, content) {
  const navItems = role === 'merchant'
    ? [['/dashboard', 'Products'], ['/dashboard?tab=transactions', 'Transactions'], ['/dashboard/settings', 'Settings']]
    : [['/affiliate', 'My Links'], ['/affiliate?tab=discover', 'Discover'], ['/affiliate/settings', 'Settings']];
  return `
    <main class="dashboard-layout ${role}-layout" data-testid="${role}-dashboard-page">
      <aside class="dashboard-sidebar" data-testid="${role}-dashboard-sidebar">
        <a class="brand" href="/" data-testid="${role}-dashboard-brand-link"><span class="brand-mark"></span><span>SplitLink</span></a>
        <div class="mode-label" data-testid="${role}-dashboard-mode-label">${role === 'merchant' ? 'Merchant mode' : 'Affiliate mode'}</div>
        <nav class="dashboard-nav" data-testid="${role}-dashboard-nav">
          ${navItems.map(([href, label], index) => `<a href="${href}" class="${index === 0 ? 'active' : ''}" data-testid="${role}-dashboard-nav-${index + 1}">${label}</a>`).join('')}
        </nav>
        <div class="sidebar-user" data-testid="${role}-dashboard-user-card"><span>${userNameFallback()}</span><button type="button" id="sign-out-button" data-testid="${role}-dashboard-signout-button">Sign out</button></div>
      </aside>
      <section class="dashboard-main" data-testid="${role}-dashboard-main">
        ${content}
      </section>
    </main>
  `;
}

function statCards(role, cards) {
  return `<div class="dashboard-stats" data-testid="${role}-dashboard-stat-cards">${cards.map((card, index) => `
    <article class="dashboard-stat-card" data-testid="${role}-stat-card-${index + 1}">
      <span data-testid="${role}-stat-label-${index + 1}">${card.label}</span>
      <strong data-testid="${role}-stat-value-${index + 1}">${card.value}</strong>
      <p data-testid="${role}-stat-note-${index + 1}">${card.note}</p>
    </article>
  `).join('')}</div>`;
}

function emptyState(role, title, copy, action = '') {
  return `<div class="empty-state" data-testid="${role}-empty-state"><div class="icon-bubble large">${icon('spark')}</div><h3 data-testid="${role}-empty-state-title">${title}</h3><p data-testid="${role}-empty-state-copy">${copy}</p>${action}</div>`;
}

function productCard(product, index) {
  const rate = Number(product.commissionRate || product.commission || 0);
  const price = Number(product.price || 0);
  const commission = price * (rate / 100);
  return `
    <article class="dashboard-product-card" data-testid="merchant-product-card-${index + 1}">
      <div class="product-thumb product-${products[index % products.length].color}" data-testid="merchant-product-image-${index + 1}"></div>
      <div class="dashboard-product-body">
        <span class="badge dark" data-testid="merchant-product-status-${index + 1}">${product.status || 'active'}</span>
        <h3 data-testid="merchant-product-title-${index + 1}">${product.title || 'Untitled product'}</h3>
        <p data-testid="merchant-product-price-${index + 1}">${cents(price)} · ${rate}% commission (${cents(commission)})</p>
        <div class="mini-metrics" data-testid="merchant-product-metrics-${index + 1}"><span>${product._count?.affiliateLinks || 0} active links</span><span>${product._count?.transactions || 0} sold</span></div>
        <div class="card-actions"><button type="button" data-testid="merchant-product-edit-${index + 1}">Edit</button><button type="button" data-testid="merchant-product-toggle-${index + 1}">${product.status === 'paused' ? 'Activate' : 'Pause'}</button></div>
      </div>
    </article>
  `;
}

function transactionRow(txn, index) {
  return `<tr data-testid="merchant-transaction-row-${index + 1}"><td>${new Date(txn.createdAt || Date.now()).toLocaleDateString()}</td><td>${txn.product?.title || 'Product'}</td><td>${cents(txn.grossAmount)}</td><td>${cents(txn.merchantPayout)}</td><td>${cents(txn.affiliateCommission)}</td><td>${cents(txn.platformFee)}</td><td><span class="table-status">${txn.status || 'pending'}</span></td></tr>`;
}

async function requireDashboardAuth(role) {
  if (!appState.config.clerkPublishableKey) {
    return { ok: false, reason: 'config', message: 'Clerk is not configured, so real dashboard data cannot be loaded yet.' };
  }
  if (!appState.currentUser) {
    return { ok: false, reason: 'signin', message: 'Sign in to load your SplitLink dashboard.' };
  }
  return { ok: true };
}

async function renderMerchantDashboard() {
  const auth = await requireDashboardAuth('merchant');
  if (!auth.ok) {
    shell(dashboardShell('merchant', emptyState('merchant', auth.reason === 'config' ? 'Configuration needed' : 'Sign in required', auth.message, `<a class="pill-button" href="/signup?role=merchant" data-testid="merchant-dashboard-auth-action">Open merchant signup ${icon('arrow')}</a>`)));
    bindDashboardActions();
    return;
  }
  shell(dashboardShell('merchant', `<div class="dashboard-loading" data-testid="merchant-dashboard-loading">Loading merchant command center...</div>`));
  bindDashboardActions();
  let analytics = null;
  let productPayload = null;
  let transactionPayload = null;
  let connectStatus = null;
  let errorMessage = '';
  try {
    [analytics, productPayload, transactionPayload, connectStatus] = await Promise.all([
      api('/api/analytics/merchant'),
      api('/api/products'),
      api('/api/analytics/transactions?role=merchant'),
      api('/api/connect/status').catch(() => null),
    ]);
  } catch (error) {
    errorMessage = friendlyError(error, 'Merchant data could not be loaded.');
  }
  if (errorMessage) {
    shell(dashboardShell('merchant', emptyState('merchant', 'Merchant data unavailable', errorMessage, `<button class="pill-button" type="button" id="retry-dashboard" data-testid="merchant-dashboard-retry-button">Retry ${icon('arrow')}</button>`)));
    bindDashboardActions();
    document.getElementById('retry-dashboard')?.addEventListener('click', renderMerchantDashboard);
    return;
  }
  const productsList = productPayload?.products || [];
  const txns = transactionPayload?.transactions || [];
  const activeAffiliates = new Set(productsList.flatMap((p) => Array.from({ length: p._count?.affiliateLinks || 0 }, (_, i) => `${p.id}-${i}`))).size;
  const tabs = new URLSearchParams(window.location.search).get('tab') === 'transactions' ? 'transactions' : 'products';
  const content = `
    <div class="dashboard-header" data-testid="merchant-dashboard-header"><div><span class="eyebrow">Command center</span><h1 data-testid="merchant-dashboard-title">Merchant dashboard</h1><p data-testid="merchant-dashboard-subtitle">Products, revenue, commissions, and payout readiness stay in one focused view.</p></div><a class="pill-button" href="/onboarding?role=merchant" data-testid="merchant-connect-status-button">${connectStatus?.onboardingComplete ? 'Stripe ready' : 'Connect Stripe'} ${icon('arrow')}</a></div>
    ${statCards('merchant', [
      { label: 'Total Revenue', value: cents(analytics?.totalRevenue), note: `${analytics?.transactionCount || 0} paid transactions` },
      { label: 'Paid Out to You', value: cents(analytics?.totalMerchantPayout), note: 'After platform + affiliate split' },
      { label: 'Commissions Paid', value: cents(analytics?.totalCommissionsPaid), note: 'Sent to affiliate partners' },
      { label: 'Active Affiliates', value: String(activeAffiliates), note: 'Generated product links' },
    ])}
    <div class="dashboard-tabs" data-testid="merchant-dashboard-tabs"><a class="${tabs === 'products' ? 'active' : ''}" href="/dashboard" data-testid="merchant-products-tab">Products</a><a class="${tabs === 'transactions' ? 'active' : ''}" href="/dashboard?tab=transactions" data-testid="merchant-transactions-tab">Transactions</a><button type="button" data-testid="merchant-add-product-button">Add Product</button></div>
    ${tabs === 'products' ? `<section class="product-grid" data-testid="merchant-products-grid">${productsList.length ? productsList.map(productCard).join('') : emptyState('merchant-products', 'No products yet', 'Once the backend has products for this merchant, they will appear here as cards with commission math.')}</section>` : `<section class="transaction-panel" data-testid="merchant-transactions-panel"><table data-testid="merchant-transactions-table"><thead><tr><th>Date</th><th>Product</th><th>Gross</th><th>Your payout</th><th>Affiliate</th><th>Fee</th><th>Status</th></tr></thead><tbody>${txns.length ? txns.map(transactionRow).join('') : `<tr><td colspan="7">No transactions returned by backend yet.</td></tr>`}</tbody></table></section>`}
  `;
  shell(dashboardShell('merchant', content));
  bindDashboardActions();
}

function affiliateLinkCard(link, index) {
  const product = link.product || {};
  const clicks = link._count?.clicks || 0;
  const conversions = link._count?.transactions || 0;
  const rate = clicks ? ((conversions / clicks) * 100).toFixed(1) : '0.0';
  const estimated = (Number(product.price || 0) * (Number(product.commissionRate || 0) / 100) * 5 * (Number(rate) / 100));
  const url = `${window.location.origin}/p/${product.slug || 'product'}?ref=${link.refCode || 'REFCODE'}`;
  return `<article class="affiliate-link-card" data-testid="affiliate-link-card-${index + 1}"><div class="product-thumb product-${products[index % products.length].color}"></div><div><span class="badge dark">${product.status || 'active'}</span><h3 data-testid="affiliate-link-title-${index + 1}">${product.title || 'Affiliate product'}</h3><div class="copy-row" data-testid="affiliate-link-url-${index + 1}"><span>${url}</span><button type="button" data-copy="${url}" data-testid="affiliate-link-copy-${index + 1}">Copy</button></div><div class="mini-metrics"><span>${clicks} clicks</span><span>${conversions} conversions</span><span>${rate}% rate</span></div><p class="simulator-line" data-testid="affiliate-link-simulator-${index + 1}">At your current ${rate}% conversion rate, 500 more clicks would earn about ${cents(estimated)}.</p></div></article>`;
}

function discoverCard(product, index) {
  const price = Number(product.price || 0);
  const rate = Number(product.commissionRate || 0);
  const commission = price * (rate / 100);
  return `<article class="discover-card" data-testid="affiliate-discover-card-${index + 1}"><div class="product-thumb product-${products[index % products.length].color}"></div><span class="verified">${product.merchant?.name || 'Merchant'}</span><h3 data-testid="affiliate-discover-title-${index + 1}">${product.title || 'Marketplace product'}</h3><p data-testid="affiliate-discover-commission-${index + 1}">${cents(price)} · Earn ${rate}% = ${cents(commission)}</p><p class="estimate" data-testid="affiliate-discover-estimate-${index + 1}">Estimated potential: ${cents(commission * 6)}/mo at platform-average conversion.</p><button type="button" class="pill-button wide" data-product-id="${product.id || ''}" data-testid="affiliate-generate-link-${index + 1}">Generate My Link ${icon('arrow')}</button></article>`;
}

async function renderAffiliateDashboard() {
  const auth = await requireDashboardAuth('affiliate');
  if (!auth.ok) {
    shell(dashboardShell('affiliate', emptyState('affiliate', auth.reason === 'config' ? 'Configuration needed' : 'Sign in required', auth.message, `<a class="pill-button" href="/signup?role=affiliate" data-testid="affiliate-dashboard-auth-action">Open affiliate signup ${icon('arrow')}</a>`)));
    bindDashboardActions();
    return;
  }
  shell(dashboardShell('affiliate', `<div class="dashboard-loading" data-testid="affiliate-dashboard-loading">Loading affiliate earning hub...</div>`));
  bindDashboardActions();
  let analytics = null;
  let linksPayload = null;
  let productsPayload = null;
  let errorMessage = '';
  try {
    [analytics, linksPayload, productsPayload] = await Promise.all([
      api('/api/analytics/affiliate'),
      api('/api/affiliate-links'),
      api('/api/products'),
    ]);
  } catch (error) {
    errorMessage = friendlyError(error, 'Affiliate data could not be loaded.');
  }
  if (errorMessage) {
    shell(dashboardShell('affiliate', emptyState('affiliate', 'Affiliate data unavailable', errorMessage, `<button class="pill-button" type="button" id="retry-dashboard" data-testid="affiliate-dashboard-retry-button">Retry ${icon('arrow')}</button>`)));
    bindDashboardActions();
    document.getElementById('retry-dashboard')?.addEventListener('click', renderAffiliateDashboard);
    return;
  }
  const tab = new URLSearchParams(window.location.search).get('tab') === 'discover' ? 'discover' : 'links';
  const links = linksPayload?.links || [];
  const marketplaceProducts = [...(productsPayload?.products || [])].sort((a, b) => (Number(b.price || 0) * Number(b.commissionRate || 0)) - (Number(a.price || 0) * Number(a.commissionRate || 0)));
  const content = `
    <div class="dashboard-header" data-testid="affiliate-dashboard-header"><div><span class="eyebrow">Earning hub</span><h1 data-testid="affiliate-dashboard-title">Affiliate dashboard</h1><p data-testid="affiliate-dashboard-subtitle">Your links, pending commissions, conversion signal, and product discovery stay separate from merchant work.</p></div><a class="pill-button" href="/onboarding?role=affiliate" data-testid="affiliate-connect-status-button">Connect payouts ${icon('arrow')}</a></div>
    ${statCards('affiliate', [
      { label: 'Total Earned', value: cents(analytics?.totalEarned), note: `${analytics?.transactionCount || 0} paid conversions` },
      { label: 'Pending', value: cents((analytics?.totalEarned || 0) * 0.25), note: 'Held for 7 days before release' },
      { label: 'Conversion Rate', value: `${analytics?.conversionRate || '0.0'}%`, note: `${analytics?.totalClicks || 0} tracked clicks` },
      { label: 'Active Links', value: String(links.length), note: 'Generated product links' },
    ])}
    <div class="dashboard-tabs" data-testid="affiliate-dashboard-tabs"><a class="${tab === 'links' ? 'active' : ''}" href="/affiliate" data-testid="affiliate-links-tab">My Links</a><a class="${tab === 'discover' ? 'active' : ''}" href="/affiliate?tab=discover" data-testid="affiliate-discover-tab">Discover</a></div>
    ${tab === 'links' ? `<section class="affiliate-link-grid" data-testid="affiliate-links-grid">${links.length ? links.map(affiliateLinkCard).join('') : emptyState('affiliate-links', 'No links generated yet', 'When backend returns affiliate links, each card will show URL, clicks, conversions, earnings, and a personalized simulator.')}</section>` : `<section class="discover-grid" data-testid="affiliate-discover-grid">${marketplaceProducts.length ? marketplaceProducts.map(discoverCard).join('') : emptyState('affiliate-discover', 'No products to discover yet', 'Existing /api/products returned no marketplace products for this affiliate.')}</section>`}
    <div id="generate-modal" class="modal-backdrop" data-testid="affiliate-generate-modal" hidden></div>
  `;
  shell(dashboardShell('affiliate', content));
  bindDashboardActions();
  bindAffiliateActions();
}

function bindDashboardActions() {
  const signOut = document.getElementById('sign-out-button');
  signOut?.addEventListener('click', async () => {
    if (appState.clerk) await appState.clerk.signOut();
    window.location.href = '/';
  });
}

function bindAffiliateActions() {
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      await navigator.clipboard?.writeText(button.dataset.copy || '');
      button.textContent = 'Copied';
    });
  });
  document.querySelectorAll('[data-product-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = await api('/api/affiliate-links', { method: 'POST', body: JSON.stringify({ productId: button.dataset.productId }) });
        const modal = document.getElementById('generate-modal');
        modal.hidden = false;
        const url = result?.url || `${window.location.origin}/p/product?ref=${result?.link?.refCode || 'REFCODE'}`;
        modal.innerHTML = `<div class="share-modal" data-testid="affiliate-share-modal-card"><button type="button" class="modal-close" data-testid="affiliate-share-modal-close">×</button><h3 data-testid="affiliate-share-modal-title">Your link is ready</h3><div class="copy-row"><span data-testid="affiliate-share-modal-url">${url}</span><button type="button" data-copy="${url}" data-testid="affiliate-share-modal-copy">Copy</button></div><div class="qr-box" data-testid="affiliate-share-modal-qr">QR</div><p data-testid="affiliate-share-modal-calculator">If you drive 500 clicks/month at 3.2% conversion, you earn an estimated ${money(96)}/month.</p><div class="share-row" data-testid="affiliate-share-buttons"><button type="button">Twitter</button><button type="button">Instagram caption</button><button type="button">WhatsApp</button></div></div>`;
        modal.querySelector('.modal-close').addEventListener('click', () => { modal.hidden = true; });
        modal.querySelector('[data-copy]').addEventListener('click', async (event) => { await navigator.clipboard?.writeText(url); event.currentTarget.textContent = 'Copied'; });
      } catch (error) {
        button.textContent = friendlyError(error, 'Unavailable');
      } finally {
        button.disabled = false;
      }
    });
  });
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
    <main class="landing-page family-redesign" data-testid="landing-page">
      <section class="family-hero" data-testid="landing-hero-section">
        <div class="floating-blob blob-orange hero-blob-1" aria-hidden="true"><span></span></div>
        <div class="floating-blob blob-green hero-blob-2" aria-hidden="true"><span></span></div>
        <div class="floating-blob blob-blue hero-blob-3" aria-hidden="true"><span></span></div>
        <div class="floating-coin coin-one" aria-hidden="true">2%</div>
        <div class="floating-coin coin-two" aria-hidden="true">$</div>
        <div class="hero-centerpiece" data-testid="hero-centerpiece">
          <div class="tiny-proof-row" data-testid="hero-proof-row">
            <span data-testid="hero-proof-fee">2% fee</span>
            <span data-testid="hero-proof-checkout">Stripe-powered split</span>
            <span data-testid="hero-proof-no-store">No storefront needed</span>
          </div>
          <h1 data-testid="hero-headline">Sell more.<br />Share the reward.</h1>
          <p data-testid="hero-subheadline">SplitLink turns every product into a joyful affiliate-ready checkout link — merchants list once, affiliates share instantly, buyers get a page that only wants the sale.</p>
          <div class="family-hero-actions" data-testid="hero-role-cta-group">
            <a class="family-primary-btn" href="/signup?role=merchant" data-testid="hero-merchant-cta">I'm a Merchant ${icon('arrow')}</a>
            <a class="family-secondary-btn" href="/signup?role=affiliate" data-testid="hero-affiliate-cta">I'm an Affiliate ${icon('arrow')}</a>
          </div>
        </div>
        <div class="hero-mini mini-left" data-testid="hero-mini-merchant-card">
          <span>Merchant</span><strong>Set 20%</strong><small>Affiliates earn $16.80</small>
        </div>
        <div class="hero-mini mini-right" data-testid="hero-mini-affiliate-card">
          <span>Affiliate</span><strong>Link ready</strong><small>split.link/ceramic?ref=K39V8</small>
        </div>
      </section>

      <section class="family-action-strip" aria-label="Platform loop" data-testid="audience-ticker-section">
        <div class="family-action-track" data-testid="audience-ticker">
          <span>List product</span><span>Set commission</span><span>Generate link</span><span>Share anywhere</span><span>Buyer pays</span><span>Split happens</span>
          <span>List product</span><span>Set commission</span><span>Generate link</span><span>Share anywhere</span><span>Buyer pays</span><span>Split happens</span>
        </div>
      </section>

      <section id="how-it-works" class="family-section" data-testid="how-it-works-section">
        <div class="family-section-heading" data-testid="how-it-works-heading-block">
          <p class="family-kicker" data-testid="how-it-works-kicker">Two journeys, zero collisions</p>
          <h2 data-testid="how-it-works-title">One page does one job.</h2>
          <p data-testid="how-it-works-copy">A merchant thinks in products. An affiliate thinks in links. SplitLink keeps both mental models in their own lane.</p>
        </div>
        <div class="family-role-grid" data-testid="role-flow-columns">
          <article class="journey-card merchant-journey" data-testid="merchant-flow-panel">
            <div class="journey-character blob-orange" aria-hidden="true"><span></span></div>
            <div class="panel-title" data-testid="merchant-flow-title"><span>For merchants</span><strong>Products → Revenue</strong></div>
            ${merchantSteps.map((step, index) => `<div class="family-step" data-testid="merchant-step-card-${index + 1}"><b data-testid="merchant-step-number-${index + 1}">0${index + 1}</b><div><h3 data-testid="merchant-step-title-${index + 1}">${step}</h3><p data-testid="merchant-step-copy-${index + 1}">${['Create a credible buyer page in minutes.', 'Choose a reward that makes sharing worth it.', 'Every tracked sale shows the split clearly.'][index]}</p></div></div>`).join('')}
          </article>
          <article class="journey-card affiliate-journey" data-testid="affiliate-flow-panel">
            <div class="journey-character blob-blue" aria-hidden="true"><span></span></div>
            <div class="panel-title" data-testid="affiliate-flow-title"><span>For affiliates</span><strong>Links → Commission</strong></div>
            ${affiliateSteps.map((step, index) => `<div class="family-step" data-testid="affiliate-step-card-${index + 1}"><b data-testid="affiliate-step-number-${index + 1}">0${index + 1}</b><div><h3 data-testid="affiliate-step-title-${index + 1}">${step}</h3><p data-testid="affiliate-step-copy-${index + 1}">${['Find products with visible payout math.', 'Get a tracked URL made for sharing.', 'Watch clicks turn into held and released earnings.'][index]}</p></div></div>`).join('')}
          </article>
        </div>
      </section>

      <section id="fee" class="family-section split-fee-scene" data-testid="fee-transparency-section">
        <div class="family-section-heading left" data-testid="fee-heading-block">
          <p class="family-kicker" data-testid="fee-eyebrow">Transparent by default</p>
          <h2 data-testid="fee-headline">We take <span>2%.</span><br />That's it.</h2>
          <p data-testid="fee-copy">The math appears before signup, inside product cards, and inside transactions — no hidden affiliate tax or surprise platform cut.</p>
        </div>
        <div class="family-fee-device" data-testid="fee-breakdown-card">
          <div class="device-top" data-testid="fee-device-title">Ceramic Ritual Set</div>
          <div class="fee-device-row" data-testid="fee-row-buyer"><span>Buyer pays</span><strong>$100.00</strong></div>
          <div class="fee-device-row orange" data-testid="fee-row-affiliate"><span>Affiliate earns</span><strong>$20.00</strong></div>
          <div class="fee-device-row" data-testid="fee-row-platform"><span>SplitLink fee</span><strong>$2.00</strong></div>
          <div class="fee-device-row total" data-testid="fee-row-merchant"><span>Merchant receives</span><strong>$78.00</strong></div>
        </div>
      </section>

      <section id="preview" class="family-section buyer-scene" data-testid="buyer-preview-section">
        <div class="family-section-heading" data-testid="buyer-preview-heading-block">
          <p class="family-kicker" data-testid="buyer-preview-kicker">The money page</p>
          <h2 data-testid="buyer-preview-title">Shared links should feel delightful, not busy.</h2>
          <p data-testid="buyer-preview-copy">No navigation. No related products. No account prompt. Just a beautiful product page and one strong checkout button.</p>
        </div>
        <div class="buyer-showcase" data-testid="buyer-product-page-preview">
          <div class="buyer-art-card" data-testid="buyer-preview-product-image">
            <div class="buyer-object" aria-hidden="true"></div>
            <span data-testid="buyer-preview-link-badge">Affiliate link preview</span>
          </div>
          <div class="buyer-checkout-card" data-testid="buyer-preview-content">
            <span class="verified" data-testid="buyer-preview-merchant">Maison Kiln · Verified Merchant</span>
            <h3 data-testid="buyer-preview-product-title">Ceramic Ritual Set</h3>
            <p data-testid="buyer-preview-description">A handcrafted trio for slower mornings, finished in warm matte clay and packaged for gifting.</p>
            <div class="price-row" data-testid="buyer-preview-price-row"><strong data-testid="buyer-preview-price">$84.00</strong><span data-testid="buyer-preview-secure-copy">Secure checkout powered by Stripe</span></div>
            <button class="family-primary-btn wide" type="button" data-testid="buyer-preview-buy-button">Buy Now — $84.00 ${icon('arrow')}</button>
          </div>
        </div>
      </section>

      <section class="family-final" data-testid="final-cta-section">
        <div class="floating-blob blob-yellow final-blob" aria-hidden="true"><span></span></div>
        <p class="family-kicker" data-testid="final-cta-kicker">Choose your path</p>
        <h2 data-testid="final-cta-title">Start with the role you actually play.</h2>
        <p data-testid="final-cta-copy">The first click sets the journey: product control for merchants, earning control for affiliates.</p>
        <div class="family-hero-actions centered" data-testid="final-cta-button-group">
          <a class="family-primary-btn" href="/signup?role=merchant" data-testid="final-merchant-cta">Merchant signup ${icon('arrow')}</a>
          <a class="family-secondary-btn" href="/signup?role=affiliate" data-testid="final-affiliate-cta">Affiliate signup ${icon('arrow')}</a>
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
    <main class="auth-page family-auth-page" data-testid="signup-page">
      <div class="floating-blob blob-orange auth-blob-one" aria-hidden="true"><span></span></div>
      <div class="floating-blob blob-green auth-blob-two" aria-hidden="true"><span></span></div>
      <div class="floating-coin auth-coin" aria-hidden="true">${role === 'merchant' ? '$' : '%'}</div>
      <a class="brand auth-brand" href="/" data-testid="signup-brand-home-link"><span class="brand-mark"></span><span>SplitLink</span></a>
      <section class="auth-card family-auth-card" data-testid="signup-card">
        <div class="auth-copy family-auth-story" data-testid="signup-copy-panel">
          <span class="family-kicker" data-testid="signup-role-eyebrow">${role === 'merchant' ? 'Merchant path selected' : 'Affiliate path selected'}</span>
          <h1 data-testid="signup-title">${title}</h1>
          <p data-testid="signup-description">Pick your role, claim your public URL, then land on one focused Stripe step before any dashboard appears.</p>
          <div class="auth-path-preview" data-testid="signup-path-preview-card">
            <span data-testid="signup-path-label">Your public path</span>
            <strong data-testid="signup-path-value">${urlBase}<em id="story-slug-preview">alex-${role}</em></strong>
          </div>
          <div class="mode-switch" data-testid="signup-role-switcher">
            <a class="${role === 'merchant' ? 'active' : ''}" href="/signup?role=merchant" data-testid="signup-merchant-role-link">Merchant</a>
            <a class="${role === 'affiliate' ? 'active' : ''}" href="/signup?role=affiliate" data-testid="signup-affiliate-role-link">Affiliate</a>
          </div>
        </div>
        <form class="signup-form family-auth-form" data-testid="signup-form">
          <div class="form-header-note" data-testid="signup-form-header-note"><span>${icon('spark')}</span><strong>Keep it light. Four fields, then payouts.</strong></div>
          <label data-testid="signup-name-label">Name<input data-testid="signup-name-input" type="text" value="Alex Morgan" /></label>
          <label data-testid="signup-email-label">Email<input data-testid="signup-email-input" type="email" value="alex@splitlink.demo" /></label>
          <label data-testid="signup-password-label">Password<input data-testid="signup-password-input" type="password" value="12345678" /></label>
          <label data-testid="signup-slug-label">Public slug<input id="slug-input" data-testid="signup-slug-input" type="text" value="alex-${role}" /></label>
          <div class="url-preview" data-testid="signup-url-preview"><span data-testid="signup-url-prefix">${urlBase}</span><strong id="slug-preview" data-testid="signup-url-slug">alex-${role}</strong></div>
          <div class="availability" data-testid="signup-availability-message">${icon('check')} <span>Available instantly</span></div>
          <div id="clerk-signup-mount" class="clerk-mount" data-testid="clerk-signup-mount"></div>
          <a class="family-primary-btn wide fallback-auth-link" href="/onboarding?role=${role}" data-testid="signup-submit-button">Preview onboarding ${icon('arrow')}</a>
          <p class="fine-print" data-testid="signup-verification-note">Next screen after email verification: connect your Stripe payout account.</p>
        </form>
      </section>
    </main>
  `);
  const input = document.getElementById('slug-input');
  const preview = document.getElementById('slug-preview');
  input.addEventListener('input', () => {
    preview.textContent = slugify(input.value);
    const storyPreview = document.getElementById('story-slug-preview');
    if (storyPreview) storyPreview.textContent = slugify(input.value);
  });
  setupClerkMount('clerk-signup-mount', 'signup', role);
}

async function registerCurrentUser(role) {
  if (!appState.currentUser) return { ok: false, message: 'Sign in first to create your SplitLink profile.' };
  const slug = slugify(appState.currentUser.username || appState.currentUser.fullName || appState.currentUser.id || `${role}-user`);
  const body = {
    clerkId: appState.currentUser.id,
    email: appState.currentUser.primaryEmailAddress?.emailAddress || '',
    name: appState.currentUser.fullName || appState.currentUser.firstName || 'SplitLink user',
    role,
    slug,
  };
  try {
    await api('/api/users/register', { method: 'POST', body: JSON.stringify(body) });
    return { ok: true, message: 'Profile created.' };
  } catch (error) {
    if (error.status === 409) return { ok: true, message: 'Profile already exists.' };
    return { ok: false, message: friendlyError(error, 'Profile setup could not complete.') };
  }
}

async function renderOnboarding(success = false) {
  const role = getRole();
  const registered = success ? null : await registerCurrentUser(role);
  shell(`
    <main class="onboarding-page family-onboarding-page" data-testid="onboarding-page">
      <div class="floating-blob blob-blue onboard-blob-one" aria-hidden="true"><span></span></div>
      <div class="floating-blob blob-yellow onboard-blob-two" aria-hidden="true"><span></span></div>
      <section class="onboarding-card family-onboarding-card ${success ? 'success' : ''}" data-testid="${success ? 'onboarding-success-card' : 'onboarding-connect-card'}">
        <a class="brand" href="/" data-testid="onboarding-brand-home-link"><span class="brand-mark"></span><span>SplitLink</span></a>
        ${success ? `
          <div class="success-mark family-success-mark" data-testid="onboarding-success-checkmark">${icon('check')}</div>
          <span class="family-kicker" data-testid="onboarding-success-eyebrow">Stripe connected</span>
          <h1 data-testid="onboarding-success-title">You're ready for ${role === 'affiliate' ? 'your earning hub' : 'your command center'}.</h1>
          <p data-testid="onboarding-success-copy">The payout rail is ready. Now SplitLink can show the right dashboard without mixing roles or distracting you.</p>
          <div class="onboarding-proof-row" data-testid="onboarding-success-proof-row"><span>Profile ready</span><span>Payouts linked</span><span>Mode selected</span></div>
          <a class="family-primary-btn wide" href="${role === 'affiliate' ? '/affiliate' : '/dashboard'}" data-testid="onboarding-success-dashboard-button">Go to ${role} dashboard ${icon('arrow')}</a>
        ` : `
          <div class="family-wallet-scene" data-testid="onboarding-stripe-icon"><div class="wallet-face">${icon('wallet')}</div><span>Stripe</span></div>
          <span class="family-kicker" data-testid="onboarding-role-eyebrow">One more step</span>
          <h1 data-testid="onboarding-title">Connect your payment account.</h1>
          <p data-testid="onboarding-description">${role === 'merchant'
            ? 'Stripe lets product revenue move automatically after the 2% platform fee and affiliate commissions are calculated.'
            : 'Stripe lets commissions move securely after the 7-day pending period clears, so earnings never feel mysterious.'
          }</p>
          ${registered ? `<div class="config-card ${registered.ok ? 'ready' : ''}" data-testid="onboarding-registration-status"><strong>${registered.ok ? 'Profile ready' : 'Profile setup needs auth'}</strong><span>${registered.message}</span></div>` : ''}
          <button class="family-primary-btn wide" type="button" id="connect-stripe-button" data-testid="onboarding-connect-stripe-button">Connect with Stripe ${icon('arrow')}</button>
          <div id="onboarding-error" class="inline-error" data-testid="onboarding-error-message" hidden></div>
          <div class="onboarding-proof-row" data-testid="onboarding-distraction-note"><span>No nav</span><span>No dashboard</span><span>No distractions</span></div>
        `}
      </section>
    </main>
  `);
  if (!success) {
    const button = document.getElementById('connect-stripe-button');
    const errorBox = document.getElementById('onboarding-error');
    button.addEventListener('click', async () => {
      errorBox.hidden = true;
      button.disabled = true;
      button.innerHTML = `Opening Stripe ${icon('arrow')}`;
      try {
        const result = await api('/api/connect/onboard', { method: 'POST', body: JSON.stringify({}) });
        if (result?.url) window.location.href = result.url;
        else throw new Error('Stripe onboarding URL was not returned.');
      } catch (error) {
        errorBox.hidden = false;
        errorBox.textContent = friendlyError(error, 'Unable to start Stripe onboarding.');
        button.disabled = false;
        button.innerHTML = `Connect with Stripe ${icon('arrow')}`;
      }
    });
  }
}

async function boot() {
  await loadConfig();
  await initAuth();
  const path = window.location.pathname;
  if (path.startsWith('/dashboard')) return renderMerchantDashboard();
  if (path.startsWith('/affiliate')) return renderAffiliateDashboard();
  if (path.startsWith('/signin')) {
    shell(`<main class="auth-page" data-testid="signin-page"><a class="brand auth-brand" href="/" data-testid="signin-brand-home-link"><span class="brand-mark"></span><span>SplitLink</span></a><section class="auth-card single" data-testid="signin-card"><div class="auth-copy"><span class="eyebrow">Welcome back</span><h1>Pick up where revenue left off.</h1><p>Sign in with the backend’s configured Clerk auth before loading dashboards.</p></div><div class="signup-form"><div id="clerk-signin-mount" class="clerk-mount" data-testid="clerk-signin-mount"></div></div></section></main>`);
    setupClerkMount('clerk-signin-mount', 'signin', 'merchant');
    return;
  }
  if (path.startsWith('/signup')) return renderSignup();
  if (path.startsWith('/onboarding/success')) return renderOnboarding(true);
  if (path.startsWith('/onboarding')) return renderOnboarding(false);
  return renderLanding();
}

boot();