# SplitLink — MVP Build Plan
### Affiliate-Native Payment Link Platform for SMEs (EU/US)

---

## 1. Product Vision

SplitLink is a platform where any SME can create a branded payment link for their product, set a commission rate, and let creators/affiliates generate their own tracked version of that link — all powered by automatic Stripe commission splitting at the point of sale. No manual payouts, no spreadsheets, no trust issues. The split fires at payment time.

**The core loop:**
1. Merchant lists a product → sets price + commission %
2. Affiliate discovers product → generates their unique tracked link
3. Buyer clicks affiliate link → lands on branded product checkout page
4. Buyer pays → Stripe splits funds instantly (merchant gets their cut, affiliate gets commission, platform takes fee)
5. Both parties see real-time dashboards

This is not a Gumroad/Lemon Squeezy competitor for digital products. The gap in the market is physical/service product SMEs — local brands, handmade goods, boutique agencies, Shopify-less sellers — who want affiliate-powered sales infrastructure without enterprise tooling or complex integrations.

---

## 2. Market Context & Competitive Gap

### Existing Players and What They Miss

| Platform | Who It Serves | What's Missing |
|---|---|---|
| Gumroad | Digital creators | Physical products, SME merchant tools, commission splitting |
| Lemon Squeezy | SaaS/digital indie devs | Not for physical/service SMEs |
| Tapfiliate | Established brands with dev teams | Too complex for small merchants |
| Refersion | Mid-market e-commerce | Expensive, requires Shopify/WooCommerce |
| Impact.com | Enterprise | Overkill for SMEs, high cost |
| Stripe Payment Links (native) | General | No affiliate layer whatsoever |

**The gap:** No product natively combines payment link generation + automatic commission splitting + open affiliate discovery for merchants who don't have a Shopify store or dev team. SplitLink lives in this white space.

### Market Signals
- The affiliate marketing software market is growing at 16.8% CAGR, projected from $2.1B (2025) to $9.8B by 2035.
- Physical products hold 61.8% of affiliate marketing software market share — yet tools serving this segment are all either too complex or too digital-focused.
- The European affiliate market is valued at $3.4B with 6.5% CAGR, and is especially active in sustainability and niche goods — exactly the SME profile this platform targets.
- Creator-driven affiliate revenue is on track to reach $1.3B by 2026 alone.

---

## 3. Core Architecture Decisions

### 3.1 Stripe Connect Charge Model

The platform uses **Destination Charges** as the primary payment flow.

**Why Destination Charges over Direct Charges:**
- The platform controls the customer relationship and payment experience (your branding, your receipt, your liability surface)
- Funds flow to merchant's connected account automatically with `transfer_data[destination]`
- Platform retains `application_fee_amount` as its revenue cut
- Stripe handles cross-region payouts, currency conversion, and 1099 generation in the US automatically

**The two-split problem (merchant + affiliate):**
Stripe Destination Charges natively support only one destination per charge. To split to both merchant AND affiliate, use **Separate Charges and Transfers**:

1. Platform charges the buyer the full product price
2. Platform transfers (price - commission - platform_fee) to merchant's Stripe Connect account
3. Platform transfers commission amount to affiliate's Stripe Connect account
4. Platform retains its fee

This gives full control over timing and amounts, supports multi-party splits, and handles refund logic cleanly. It is the correct pattern for this use case.

**Resource:** https://docs.stripe.com/connect/separate-charges-and-transfers

### 3.2 Connected Account Type

Use **Express Accounts** for both merchants and affiliates.

**Why Express over Standard or Custom:**
- Stripe hosts the onboarding UI — less compliance burden on the platform
- Users see a Stripe-branded onboarding flow that handles KYC, bank details, tax info
- Platform retains control of the payout schedule and fee logic
- Express is the right balance between control (Custom) and effort (Standard)
- It satisfies Stripe's requirement that platforms KYC their connected accounts without you building that flow from scratch

**Resource:** https://docs.stripe.com/connect/express-accounts

### 3.3 Tracking Architecture

Affiliate attribution is tracked via:
- A unique `ref` parameter appended to every affiliate link (e.g. `splitlink.com/p/vintage-tote?ref=AFFID123`)
- On page load, `ref` is stored in a first-party cookie (30-day expiry) and `localStorage`
- When checkout is initiated, the `ref` value is passed as Stripe Checkout's `client_reference_id` parameter
- Stripe's webhook `checkout.session.completed` fires post-payment and carries `client_reference_id` back to the platform
- Platform reads `client_reference_id`, looks up affiliated account, fires the transfer

This is server-side attribution via Stripe's own infrastructure — not cookie-only — which means it cannot be blocked by ad blockers. It is the most reliable approach.

**Resource:** https://docs.stripe.com/api/checkout/sessions/object#checkout_session_object-client_reference_id

### 3.4 Webhook-Driven Split Execution

All commission logic happens server-side in response to Stripe webhooks, never in client-side code. The flow:

```
checkout.session.completed webhook arrives
→ verify webhook signature (Stripe-Signature header)
→ look up session's client_reference_id
→ look up affiliate by ref code
→ look up merchant by product ID
→ calculate: merchant_payout = price - commission - platform_fee
→ calculate: affiliate_payout = commission
→ execute Transfer to merchant connected account
→ execute Transfer to affiliate connected account
→ record transaction in DB with all amounts, IDs, timestamps
→ update affiliate and merchant dashboards
```

All transfers are idempotent — use the Stripe `PaymentIntent` ID as the idempotency key to prevent double-payouts on webhook retries.

---

## 4. Data Models

### Entities and Relationships

**User** (shared base for merchants and affiliates)
- `id`, `email`, `name`, `role` (merchant | affiliate | both), `createdAt`
- `stripe_account_id` (their Express connected account)
- `stripe_onboarding_complete` (boolean)
- `slug` (for their public profile page)

**Product** (created by merchant)
- `id`, `merchant_id`, `title`, `description`, `price` (in cents), `currency`
- `commission_rate` (percentage, e.g. 15.00)
- `image_url`, `slug` (URL-friendly name, e.g. "handmade-leather-tote")
- `status` (active | paused | archived)
- `created_at`
- `product_page_url` → `/p/{slug}` (the public buyer-facing page)

**AffiliateLink**
- `id`, `product_id`, `affiliate_id`
- `ref_code` (unique 8-char alphanumeric, indexed)
- `custom_label` (optional name the affiliate gives their campaign)
- `created_at`
- Derived URL: `splitlink.com/p/{product_slug}?ref={ref_code}`

**Transaction**
- `id`, `stripe_payment_intent_id` (unique), `stripe_checkout_session_id`
- `product_id`, `merchant_id`, `affiliate_id` (nullable if direct sale)
- `gross_amount`, `platform_fee`, `merchant_payout`, `affiliate_commission`
- `currency`, `status` (pending | paid | refunded | disputed)
- `buyer_email`, `created_at`
- `merchant_transfer_id` (Stripe Transfer ID), `affiliate_transfer_id`

**Catalog** (merchant's storefront)
- Auto-generated from all active products belonging to a merchant
- Public URL: `splitlink.com/store/{merchant_slug}`

---

## 5. Feature Scope — MVP

MVP = everything needed to complete one full working transaction loop. Nothing more.

### 5.1 Merchant Features
- Register and complete Stripe Express onboarding
- Create a product (title, description, price, commission %, image upload)
- View their product dashboard (all products, status, total sales, total paid out)
- View transaction history with per-transaction breakdown
- Pause or archive a product
- Auto-generated catalog page at `/store/{slug}`

### 5.2 Affiliate Features
- Register and complete Stripe Express onboarding
- Browse the product marketplace (all active products, commission rates visible)
- Generate a tracked affiliate link for any product with one click
- View their affiliate dashboard (all links, clicks, conversions, earned commissions)
- View payout history

### 5.3 Buyer-Facing Product Page
- Clean product page at `/p/{product_slug}?ref={ref_code}`
- Shows: product image, title, description, price, merchant name
- Single CTA: "Buy Now" → opens Stripe Checkout
- Mobile-optimized, fast-loading
- No login required for buyers

### 5.4 Payment & Split Execution
- Stripe Checkout session created server-side on "Buy Now" click
- `client_reference_id` set to `ref_code` (or "direct" if no ref)
- On `checkout.session.completed` webhook: execute two transfers as described in section 3.4
- Email confirmation sent to buyer (Stripe handles this natively)

### 5.5 Platform Fee Logic
- Platform takes a flat percentage cut on every transaction (suggested: 2–3% for MVP)
- This is deducted before splits are calculated
- Displayed transparently to merchants during product creation ("buyers pay X, you receive Y after 2% platform fee and 15% commission")

### 5.6 Analytics (MVP-Level)
- Click tracking: every page visit to `/p/{slug}?ref={ref_code}` logged with timestamp
- Conversion rate per affiliate link (clicks ÷ purchases)
- Total revenue, total commissions paid, total platform fees — visible to merchant
- Total earned, total pending, conversion rate — visible to affiliate
- No third-party analytics SDKs in MVP — log to own DB

---

## 6. Features Explicitly Out of Scope for MVP

These are good ideas but will bloat the MVP timeline. Log them as backlog:
- Subscription/recurring products
- Multi-currency support (launch USD + EUR only)
- Custom domain for merchant store pages
- Affiliate tiers / performance bonuses
- Coupon codes
- Public affiliate marketplace with search/filter
- Webhook integrations for merchants (Zapier, etc.)
- Mobile app
- In-app messaging between merchant and affiliate
- AI-generated product descriptions

---

## 7. Tech Stack Recommendation

### Backend
**Node.js + TypeScript with Express or Fastify**
- Stripe's official Node.js SDK is mature and well-documented
- Easy webhook handling
- Fast to prototype, easy to hire for

**Database: PostgreSQL**
- Relational model fits the entities above well
- Use an ORM like Prisma for type-safe queries and migration management
- Hosted on Railway, Supabase (managed Postgres), or Render for MVP

**File Storage: Cloudflare R2 or AWS S3**
- Product image uploads (1 image per product for MVP)
- Pre-signed upload URLs — never pipe file through your server

**Background Jobs / Queue**
- Not needed for MVP — webhook processing can be synchronous
- If Stripe Transfer calls fail, retry logic via Stripe's own idempotency is sufficient

### Frontend
**Next.js (App Router)**
- Single repo handles both the marketing/public pages and the authenticated dashboards
- Server-side rendering for product pages (good for SEO and link previews)
- API routes for server-side Stripe calls (keeps secret keys server-side only)

**Styling: Tailwind CSS**
- Fast to build clean, responsive UI
- Avoid over-designing for MVP — use a component library like shadcn/ui

### Auth
**Clerk or Auth.js (NextAuth)**
- Clerk: fastest to implement, handles email/password + OAuth, has good Next.js integration
- Avoid rolling your own auth in MVP
- After Stripe onboarding, link the Stripe Express `account_id` to the user record

### Email
**Resend or Postmark**
- Transactional emails: welcome, sale notification to merchant, commission earned notification to affiliate
- 3–4 email templates needed for MVP

### Hosting
- **Frontend + API: Vercel** (Next.js native deployment, free tier works for MVP)
- **Database: Supabase or Railway** (managed Postgres, free/cheap tier)
- **Webhooks: Stripe CLI for local dev**, Vercel URL for production

---

## 8. Page & Route Map

### Public Routes (no auth)
- `/` — Landing page (product value prop, merchant CTA, affiliate CTA)
- `/p/[productSlug]` — Buyer-facing product page (ref tracking here)
- `/store/[merchantSlug]` — Merchant's product catalog
- `/sign-up` — Registration (choose: I'm a Merchant / I'm an Affiliate / Both)
- `/sign-in`

### Merchant Routes (authenticated)
- `/dashboard` — Overview (total revenue, recent transactions, active products)
- `/dashboard/products` — Product list
- `/dashboard/products/new` — Create product form
- `/dashboard/products/[id]` — Edit product
- `/dashboard/transactions` — Transaction history with filter/sort
- `/dashboard/settings` — Account settings, Stripe onboarding status

### Affiliate Routes (authenticated)
- `/affiliate` — Overview (total earned, recent conversions, active links)
- `/affiliate/marketplace` — Browse all active products with commission rates
- `/affiliate/links` — All generated links with click + conversion stats
- `/affiliate/payouts` — Payout history
- `/affiliate/settings` — Account settings, Stripe onboarding status

### API Routes (server-side)
- `POST /api/checkout/create-session` — Creates Stripe Checkout session
- `POST /api/webhooks/stripe` — Receives all Stripe events (verify signature first)
- `POST /api/products` — Create product
- `GET /api/products/[id]` — Fetch product data
- `POST /api/affiliate-links` — Generate tracked link
- `GET /api/analytics/[linkId]` — Fetch click/conversion data
- `POST /api/connect/onboard` — Initiate Stripe Express onboarding

---

## 9. Stripe Integration — Step by Step Logic

### Step 1: Merchant Onboarding
- On signup, create a Stripe Express Connected Account via `stripe.accounts.create({ type: 'express' })`
- Generate an Account Link via `stripe.accountLinks.create(...)` and redirect merchant to Stripe's hosted onboarding
- On return, check `charges_enabled` and `payouts_enabled` on the account — only show products as "active" when both are true
- Store `stripe_account_id` on the User record

### Step 2: Affiliate Onboarding
- Same flow as merchant — Express account, Account Link, redirect, verify
- Affiliate needs `payouts_enabled` before they can receive commissions

### Step 3: Checkout Session Creation
When buyer clicks "Buy Now" on `/p/[productSlug]?ref={refCode}`:
- Frontend sends `POST /api/checkout/create-session` with `{ productId, refCode }`
- Server validates product exists and is active
- Server looks up merchant's `stripe_account_id`
- Server creates Stripe Checkout Session with:
  - `line_items` using the product price
  - `payment_intent_data.transfer_group` set to a unique group ID (ties the charge to transfers)
  - `client_reference_id` set to `{refCode}:{productId}` (packed reference)
  - `mode: 'payment'`
  - `success_url` and `cancel_url`
- Server logs the click in DB (associate session ID with refCode)
- Server returns `session.url` — frontend redirects buyer to Stripe Checkout

### Step 4: Webhook — Payment Completed
On `checkout.session.completed`:
1. Verify webhook signature using `stripe.webhooks.constructEvent`
2. Parse `client_reference_id` → extract `refCode` and `productId`
3. Fetch product (price, commission_rate, merchant's `stripe_account_id`)
4. Fetch affiliate by `refCode` → get their `stripe_account_id`
5. Calculate amounts:
   - `gross = session.amount_total`
   - `platform_fee = gross * PLATFORM_FEE_RATE` (e.g. 0.02)
   - `affiliate_commission = gross * product.commission_rate`
   - `merchant_payout = gross - platform_fee - affiliate_commission`
6. Execute Transfers (using `transfer_group` for traceability):
   - `stripe.transfers.create({ amount: merchant_payout, destination: merchant_stripe_id, transfer_group })`
   - `stripe.transfers.create({ amount: affiliate_commission, destination: affiliate_stripe_id, transfer_group })`
7. Write Transaction record to DB with all IDs and amounts
8. Trigger email notifications (merchant: "You made a sale!", affiliate: "Commission earned!")
9. Return 200 to Stripe — never return non-200 unless signature verification fails

### Step 5: Refund Handling
- On `charge.refunded` webhook: reverse both transfers using `stripe.transfers.createReversal`
- Update Transaction status to `refunded`
- If transfer reversal fails (e.g. affiliate has already withdrawn), log for manual resolution (edge case in MVP)

---

## 10. Commission Calculation — Transparency Logic

Every product creation page should show a live fee breakdown simulator:

```
Product price:         $100.00
Platform fee (2%):    - $2.00
Affiliate commission:  - $15.00  (merchant sets this %)
--------------------------
Merchant receives:     $83.00

Buyer pays:            $100.00
Affiliate earns:       $15.00
Platform earns:        $2.00
Stripe fee (est):      ~$3.20 (deducted from gross before transfers)
```

The Stripe processing fee (~2.9% + $0.30) is deducted from the platform's retained amount — the platform absorbs this and prices its own fee accordingly. This simplifies the mental model for merchants.

Clearly display this on:
- Product creation form (live preview as they type)
- Each product card in their dashboard
- Transaction detail view

---

## 11. Affiliate Marketplace Design

The marketplace is where affiliates discover products. For MVP, this is a simple grid/list at `/affiliate/marketplace`.

**Each product card shows:**
- Product image
- Product title + merchant name
- Price
- Commission rate (e.g. "Earn 15% = $15 per sale")
- Commission amount in currency (more motivating than %)
- "Generate My Link" button → instantly creates an `AffiliateLink` record and shows the URL

**Sorting for MVP:** newest first, with a toggle for highest commission rate.

**No approval flow for MVP** — any verified affiliate (Stripe onboarding complete) can generate a link for any active product. This is the permissionless part that works, as discussed.

---

## 12. Product Page (Buyer-Facing) Design Principles

The `/p/[productSlug]` page is the buyer's entire experience. It must:

- Load fast (Server-Side Rendered in Next.js — good for social link previews too)
- Show product image prominently (hero position)
- Show product title, short description, price
- Show merchant name and a subtle trust signal ("Powered by SplitLink")
- Single button: "Buy Now — $X"
- No distractions, no navigation, no upsells in MVP
- Open Graph meta tags populated from product data so link previews look good on Twitter/Instagram/WhatsApp

When the affiliate shares `splitlink.com/p/leather-tote?ref=AFFID123` on Instagram, the preview should show the product image and title cleanly. This is a direct driver of affiliate conversions and requires the SSR approach.

---

## 13. Click Tracking Implementation

Every visit to `/p/[productSlug]?ref={refCode}`:

1. Server-side (in Next.js `getServerSideProps` or route handler): log a `Click` event:
   - `affiliate_link_id`, `timestamp`, `user_agent`, `country` (from Vercel's geo headers)
2. Store `refCode` in a cookie (`splitlink_ref`, 30-day expiry) and pass it to checkout
3. If the buyer visits without a ref (direct link), no affiliate gets credited

**Deduplication for analytics:** count unique clicks by hashing `(affiliate_link_id, IP, day)` — show both raw clicks and unique clicks in the dashboard.

**Important:** Never store IP addresses in the DB for GDPR compliance. Use the hash only for deduplication, discard the raw IP.

---

## 14. Build Sequence (Recommended Order)

Build in this order — each phase produces a usable, testable milestone.

### Phase 1 — Foundation (Days 1–5)
- Project setup: Next.js, TypeScript, Tailwind, Prisma, PostgreSQL
- Auth setup with Clerk (sign-up, sign-in, session)
- DB schema: User, Product, AffiliateLink, Transaction, Click tables
- Basic routing structure (all pages stubbed)
- Environment config (Stripe keys, DB URL, Clerk keys)

### Phase 2 — Stripe Connect (Days 6–10)
- Stripe Express onboarding flow for merchants
- Stripe Express onboarding flow for affiliates
- Onboarding status check and gating (cannot create products until onboarding complete)
- Store `stripe_account_id` on User
- Test in Stripe test mode with test connected accounts

### Phase 3 — Product Creation + Public Pages (Days 11–16)
- Merchant: create product form with image upload to R2/S3
- Merchant: product list dashboard
- Public: `/p/[productSlug]` buyer-facing page with SSR and Open Graph tags
- Public: `/store/[merchantSlug]` catalog page
- Click tracking on product page visit

### Phase 4 — Affiliate Marketplace + Link Generation (Days 17–21)
- Affiliate: marketplace page showing all active products
- Affiliate: one-click link generation (creates AffiliateLink record, shows URL)
- Affiliate: link list dashboard
- Test the full discovery-to-link flow

### Phase 5 — Checkout + Webhook + Split (Days 22–28)
- `POST /api/checkout/create-session` — full implementation
- Stripe Checkout redirect from product page
- `POST /api/webhooks/stripe` — full implementation:
  - Signature verification
  - Session lookup
  - Commission calculation
  - Transfer execution (merchant + affiliate)
  - Transaction record write
- Test end-to-end in Stripe test mode with real test card numbers
- Test refund webhook handling

### Phase 6 — Dashboards + Analytics (Days 29–35)
- Merchant dashboard: revenue totals, product performance, transaction list
- Affiliate dashboard: earned totals, link performance (clicks, conversions, rate), payout history
- Commission breakdown display (transparent fee simulator)
- Email notifications: sale to merchant, commission to affiliate (Resend integration)

### Phase 7 — Polish + Launch Prep (Days 36–42)
- Landing page (/, explains the product for merchants and affiliates)
- Error states and empty states throughout
- Mobile responsiveness audit
- Input validation and error handling hardening
- Switch from Stripe test mode to live mode
- GDPR-compliant privacy policy and cookie notice (required for EU)
- Deploy to Vercel + production database

---

## 15. GDPR & Compliance Considerations (EU Market)

Since you're targeting EU users, these are non-negotiable even at MVP:

**Data minimization:**
- Don't collect buyer data beyond what Stripe needs for checkout
- For click tracking: hash IPs before any persistence; store only country-level geo

**Cookie consent:**
- The `splitlink_ref` cookie is a functional cookie (essential for payment attribution) — it does not require cookie banner consent if documented in privacy policy as functional
- Do not use any third-party tracking or analytics cookies in MVP without consent banner

**Privacy policy:**
- Must disclose: what data is collected, how Stripe processes payments, how affiliate tracking works, data retention period
- Can use a generator like iubenda or termly for MVP

**Stripe Connect compliance:**
- Stripe handles KYC/AML for connected accounts via their Express onboarding
- Your responsibility: keep your platform's ToS clear about what merchants can list (no illegal products, no adult content, etc.)
- Add a checkbox on merchant signup agreeing to acceptable use policy

**VAT:**
- For B2B transactions (merchant to platform) in EU, document your VAT status via SterlingStack OÜ
- You are not the Merchant of Record — the merchant is selling to the buyer directly (you are facilitating) — so buyer VAT is the merchant's responsibility
- Make this explicit in your ToS

---

## 16. Platform Fee Model

**MVP Pricing:**
- Platform fee: **2% per transaction** (deducted from gross before splits)
- No monthly subscription in MVP — purely transaction-based
- This keeps the entry barrier zero for merchants, aligns incentives (platform earns when merchant earns)

**Why 2%:**
- Stripe's processing fee is ~2.9% + $0.30
- A 2% platform fee on top keeps total cost to merchant at ~5% (price + commission aside) — competitive vs. Gumroad (10%) or Lemon Squeezy (5% + $0.50)
- At scale, 2% on $50k GMV/month = $1,000/month in platform revenue — enough to sustain infra costs at early stage

**Future tiers (post-MVP):**
- Free tier: 2% per transaction
- Growth ($29/month): 1% per transaction + analytics exports + custom product page domain
- Pro ($99/month): 0.5% + priority support + API access for merchants

---

## 17. Key Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Affiliate self-referral fraud | Medium | Detect same Stripe account ID on both sides; flag same-session buyer/affiliate |
| Merchant lists fraudulent product | Low-Medium | Stripe Express onboarding provides baseline KYC; add ToS + monitoring |
| Stripe transfer fails after payment | Low | Idempotency keys + retry queue + manual resolution dashboard |
| Affiliate hasn't completed Stripe onboarding | Medium | Check `payouts_enabled` before generating link; prompt to complete onboarding |
| Refund after transfer already made | Low | `stripe.transfers.createReversal` covers this; document edge cases |
| Double webhook delivery | Low | Idempotency on Transaction table using `stripe_payment_intent_id` as unique key |

---

## 18. Key External Resources

**Stripe Documentation:**
- Separate Charges and Transfers: https://docs.stripe.com/connect/separate-charges-and-transfers
- Express Account Onboarding: https://docs.stripe.com/connect/express-accounts
- Webhooks: https://docs.stripe.com/webhooks
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Transfer Reversals: https://docs.stripe.com/api/transfer_reversals
- Testing Connect: https://docs.stripe.com/connect/testing

**Stack Documentation:**
- Prisma ORM: https://www.prisma.io/docs
- Clerk Auth (Next.js): https://clerk.com/docs/quickstarts/nextjs
- Resend Email: https://resend.com/docs/introduction
- Cloudflare R2 (file uploads): https://developers.cloudflare.com/r2/

**Design Reference:**
- Gumroad product page structure (observe, don't copy)
- Lemon Squeezy affiliate dashboard UX (observe commission display patterns)

---

## 19. Success Metrics for MVP

MVP is considered successful and ready for real users when:
- [ ] A merchant can sign up, onboard with Stripe, and list a product in under 10 minutes
- [ ] An affiliate can sign up, onboard with Stripe, and generate a tracked link in under 5 minutes
- [ ] A test buyer can complete a purchase via the product page
- [ ] Both the merchant and affiliate receive the correct split in their Stripe test balances
- [ ] Refunds correctly reverse both transfers
- [ ] Merchant and affiliate dashboards show accurate real-time data
- [ ] Product page link previews render correctly when shared on WhatsApp/Twitter
- [ ] The platform works on mobile (buyer page, affiliate marketplace, both dashboards)

---

*Built for SterlingStack Technologies — SplitLink MVP Plan v1.0*
*Prepared: June 2026*
