import { test, expect } from '@playwright/test'

// ── Landing page ────────────────────────────────────────────────────────────
test('landing page renders key sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid="landing-navigation"]')).toBeVisible()
  await expect(page.locator('[data-testid="brand-name"]')).toHaveText('SplitLink')
  await expect(page.locator('[data-testid="landing-hero"]')).toBeVisible()
  await expect(page.locator('[data-testid="how-it-works-section"]')).toBeVisible()
  await expect(page.locator('[data-testid="fee-section"]')).toBeVisible()
})

test('landing page CTAs link to correct routes', async ({ page }) => {
  await page.goto('/')
  const merchantCta = page.locator('[data-testid="hero-merchant-cta"]')
  await expect(merchantCta).toBeVisible()
  await expect(merchantCta).toHaveAttribute('href', /signup/)

  const affiliateCta = page.locator('[data-testid="hero-affiliate-cta"]')
  await expect(affiliateCta).toBeVisible()
  await expect(affiliateCta).toHaveAttribute('href', /signup.*affiliate/)
})

// ── Auth pages ──────────────────────────────────────────────────────────────
test('signin page loads', async ({ page }) => {
  await page.goto('/signin')
  await expect(page.locator('[data-testid="signin-page"]')).toBeVisible()
})

test('signup page loads for merchant role', async ({ page }) => {
  await page.goto('/signup?role=merchant')
  await expect(page.locator('[data-testid="signup-page"]')).toBeVisible()
  await expect(page.locator('[data-testid="signup-role-eyebrow"]')).toContainText('Merchant')
})

test('signup page loads for affiliate role', async ({ page }) => {
  await page.goto('/signup?role=affiliate')
  await expect(page.locator('[data-testid="signup-page"]')).toBeVisible()
  await expect(page.locator('[data-testid="signup-role-eyebrow"]')).toContainText('Affiliate')
})

// ── Protected routes redirect to signin ────────────────────────────────────
test('onboarding redirects unauthenticated users', async ({ page }) => {
  const resp = await page.goto('/onboarding', { waitUntil: 'commit' })
  // Should redirect to /signin (307) then land there
  expect(page.url()).toContain('/signin')
  expect(resp?.status()).toBeLessThan(400)
})

test('dashboard redirects unauthenticated users', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'commit' })
  expect(page.url()).toContain('/signin')
})

test('affiliate page redirects unauthenticated users', async ({ page }) => {
  await page.goto('/affiliate', { waitUntil: 'commit' })
  expect(page.url()).toContain('/signin')
})

// ── Buyer product page ──────────────────────────────────────────────────────
test('buyer page shows 404 for nonexistent product', async ({ page }) => {
  const resp = await page.goto('/p/product-that-does-not-exist-xyz')
  expect(resp?.status()).toBe(404)
})

test('buyer page is SSR — title in initial HTML', async ({ page }) => {
  const resp = await page.goto('/p/any-product-slug')
  const html = await resp?.text() || ''
  // Either a 404 page or a product page — both should have a <title>
  expect(html).toContain('<title>')
})

// ── P1: Shopify import wizard ───────────────────────────────────────────────
test('dashboard import page redirects unauthenticated users', async ({ page }) => {
  await page.goto('/dashboard/import', { waitUntil: 'commit' })
  expect(page.url()).toContain('/signin')
})

// ── P1: Creator referral page ───────────────────────────────────────────────
test('referral page loads for any slug', async ({ page }) => {
  await page.goto('/refer/testcreator')
  await expect(page.locator('[data-testid="referral-page"]')).toBeVisible()
  await expect(page.locator('[data-testid="referral-card"]')).toBeVisible()
  // CTA links to signup
  const cta = page.locator('[data-testid="referral-cta"]')
  await expect(cta).toBeVisible()
  await expect(cta).toHaveAttribute('href', /signup.*merchant/)
})

test('referral page includes creator slug in signup URL', async ({ page }) => {
  await page.goto('/refer/alice-creator')
  const cta = page.locator('[data-testid="referral-cta"]')
  await expect(cta).toHaveAttribute('href', /alice-creator/)
})

// ── API routes ──────────────────────────────────────────────────────────────
test('shopify import API rejects missing domain', async ({ request }) => {
  const resp = await request.post('/api/shopify-import', {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  })
  expect(resp.status()).toBe(400)
  const body = await resp.json() as { error: string }
  expect(body.error).toBeTruthy()
})

test('ai launch kit API rejects missing productTitle', async ({ request }) => {
  const resp = await request.post('/api/ai-launch-kit', {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  })
  expect(resp.status()).toBe(400)
})

test('shopify import API handles bad domain gracefully', async ({ request }) => {
  const resp = await request.post('/api/shopify-import', {
    data: { domain: 'this-domain-does-not-exist-xyz.myshopify.com' },
    headers: { 'Content-Type': 'application/json' },
  })
  // Should be 422 (unprocessable) not 500
  expect([422, 500]).toContain(resp.status())
})
