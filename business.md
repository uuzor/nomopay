<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I am thinking of a product for web2 where businesses can generate payment link for their product with commission splitting automatically for affiliate content creators who promote and bring in buyers, if we can do this we can add layers of good analytics, good payment link names and webpage with product description and image for buyers and even catalog for business, this can be a good startup idea for SME

Jun 12
This is a solid idea — affiliate commerce infrastructure for SMEs, but natively built around payment links rather than bolted on. Let me break down why it's interesting and where the real value is.
The core insight is right. Most SMEs using tools like Paystack, Flutterwave, or Stripe have zero native affiliate infrastructure. They cobble together WhatsApp broadcasts, manual tracking, and hope. A product that makes commission splitting automatic and frictionless at the payment link level solves a real pain.
The layers you're describing stack well:
Payment link generation → affiliate tracking → automatic split → analytics → branded product pages → catalog. Each layer adds retention and switching cost. The catalog piece especially turns this from a "feature" into a full storefront product.
What makes this defensible:
The real moat isn't the link generator — it's the trust layer between merchant and affiliate. If you own the payment flow, you own the source of truth for conversions. Affiliates trust the numbers because they can see the data themselves. That transparency is what Paystack/Stripe don't offer at the SME tier.
Where I'd think carefully:
Payment splitting is the hardest part technically and legally. You have two routes — either you're a marketplace (you collect and disburse, which means you're holding funds and need licensing in NG/most markets) or you do split at the processor level (Paystack does support this via their Split API, Stripe Connect exists). The processor-native route is faster to launch and avoids regulatory exposure early.
The Africa/NG angle is particularly strong because:
Influencer/creator affiliate culture is huge on Instagram and TikTok for commerce
Most SMEs sell via DM or WhatsApp — a clean payment link with a product page is already an upgrade
Paystack Split + Flutterwave SubAccounts give you the rails
A sharp MVP scope would be:
Merchant creates product → sets commission % → gets shareable link
Affiliate gets unique tracked link → drives buyer to branded product page
Payment processes → split fires automatically via Paystack Split API
Both merchant and affiliate see real-time dashboard
That's launchable in 4-6 weeks solo and immediately useful. What's your instinct on the primary market — Nigeria-first, or are you thinking broader West Africa or even pan-African from day one?
Yeah I'll use stripe because I am focused on EU and us , also if I just make a dashboard for merchants can list their payment link and any one can come register and append their own account to generate a new payment link that does the automatic splitting and use it to run their own campaign even if I make it permissionless I don't think there can be any missue
Jun 12
The EU/US + Stripe angle is smart — Stripe Connect is genuinely the best infrastructure for this.
On the permissionless concern though — I'd push back a bit.
The misuse risk is real:
Someone creates a fake "product" listing, generates affiliate links, drives fake traffic to collect splits on fraudulent transactions (self-referral loops, card testing)
Bad actors list counterfeit or non-existent products, take buyer payments, never fulfill
Since you're the platform facilitating the payment flow, Stripe holds you accountable for what merchants list — not just the merchant
Stripe's ToS explicitly requires platforms using Connect to perform KYC on connected accounts and take responsibility for their merchants' activity
You can't fully escape the trust layer — Stripe will require it of you regardless.
But you can make it lightweight, not heavy:
Rather than full manual review, a practical middle ground is:
Stripe Identity or basic business verification on merchant onboarding (Stripe handles most of this via Connect onboarding flows automatically)
Affiliates are lower risk — they receive splits, they don't collect payments, so lighter verification is fine
Flag anomalies algorithmically — unusually high refund rates, same-IP buyer/affiliate pairs, velocity spikes
The permissionless part that does work is the affiliate side. Any creator should be able to discover listed products and generate their tracked link with zero friction — that's where you want zero gates.
The merchant side needs at least Stripe's standard Connect onboarding, which honestly isn't that bad UX-wise — Stripe handles the heavy lifting.
What's your current thinking on the tech stack for this?
Alright now make research deeply on this product and write a plan.md for build the good MVP that is fully working don't write code in it just instructions, descriptions, resource and logic and reasoning
Jun 12
Searched the web, viewed a file
Searched the web, viewed a file
Good, I have enough research. Let me now write the comprehensive plan.
Created a file, read a file
Created a file, read a file
The plan is comprehensive — here's what it covers:
19 sections across the full MVP:
The most important decisions documented are the Stripe architecture ones. The key insight is that Separate Charges and Transfers (not Destination Charges) is the right pattern here because you need to split to two parties (merchant + affiliate) from a single payment. Stripe's Destination Charges only support one destination natively.
The build is sequenced as 7 phases over ~42 days:
Foundation → Stripe Connect onboarding → Product + public pages → Affiliate marketplace → Checkout + webhook + split logic → Dashboards → Launch polish
Three things worth calling out specifically:
The client_reference_id trick on Stripe Checkout is the cleanest way to carry affiliate attribution all the way through the payment without building custom session logic — Stripe hands it back to you in the webhook.
The GDPR section matters for EU launch — the splitlink_ref tracking cookie is classified as functional (not marketing), which means it doesn't need a cookie consent banner. That simplifies the UX.
The platform fee model starts at 2% transaction-only (no monthly fee) which keeps onboarding frictionless and aligns your earnings with merchant success — important for early traction.
Plan
Document · MD 
uuzor/nomopay
main
GITHUB
i want to know what we should priotize right now ----- this is from an ai ---- This is a genuinely strong hackathon entry if you frame it right. Let me brainstorm across every dimension:Here's a comprehensive feature and strategic expansion map:Here's the full breakdown across each domain:
---
Crypto payouts via USDC are worth framing carefully. Don't build a crypto checkout — that's complex and legally tricky. Instead, offer USDC as a *payout option* for affiliates who prefer it over bank transfers. Affiliates connect a wallet address instead of a bank account. This sidesteps most of the compliance complexity since you're only moving funds you already hold, not processing crypto payments from buyers. For the hackathon, this is a great talking point: an affiliate in a country with poor banking infrastructure can receive their commission in USDC to a MetaMask wallet with zero friction.
PayPal and Wise round it out for the EU and freelancer market you're already targeting.
---
## Smart onboarding for existing merchants

This is the single biggest retention lever for merchants. The friction of re-entering product data they already have is a real reason to abandon. Three approaches:
Shopify integration — Shopify has a public Products REST API. A merchant pastes their Shopify store URL and grants read access, and you pull all their products, images, prices, and descriptions in one API call. Populate your product table automatically. This is maybe 2 days of work and completely removes the "I have to retype everything" objection.
WooCommerce plugin — a simple WordPress plugin that adds a "Sync to SplitLink" button in the product admin. It calls your API with the product data. This is the hardest of the three to build but has a massive addressable market since WooCommerce powers about 27% of all e-commerce.
Open REST API — for merchants on custom platforms (Squarespace, Webflow, custom-built stores). Document a simple POST /api/products/bulk endpoint that accepts an array of product objects. Any developer can wire this up in an afternoon. Publish a Postman collection and a simple sync script.
Embeddable buy button is the flip side: instead of a merchant redirecting buyers to your product page, they paste a <script> tag on their existing site and a "Buy with SplitLink" button appears, already tracking the affiliate ref from the URL. This means merchants keep their own site but gain the affiliate infrastructure — a very compelling pitch to existing stores.
---
## Affiliate toolkit for retention

Affiliates churn when they can't see what they're earning *before* they commit to promoting. Fix this upfront:
Earnings simulator — on each product card in the marketplace, show a simple calculator: "If I drive 100 clicks at X% conversion, I earn \$Y." Let them tweak the inputs. This makes the commission rate tangible. It's a 30-line React component but psychologically very powerful.
Affiliate link-in-bio page — give every affiliate a public page at splitlink.com/a/{slug} that shows a curated grid of the products they're promoting, each with their tracked link embedded. They paste one URL in their Instagram bio instead of managing multiple links. This competes directly with Linktree/Beacons for the creator audience.
QR code generator — one-click QR code for any affiliate link. This opens up offline channels: market stalls, pop-up shops, printed flyers, business cards. Very underserved in the current affiliate tool market. Affiliate-product matching — when a new affiliate signs up, instead of showing a flat product list, analyze their profile (if they describe themselves) or browsing behavior and surface the products most likely to convert for their audience. "Based on your interests, these 3 products have the highest commission potential for you."
Fraud signal analysis — use Gemini to analyze patterns that simple rules miss: an affiliate's click behavior that looks organic but has suspicious timing patterns, or a merchant's product description that looks like a policy violation.
Commission negotiation assistant — let affiliates propose a custom commission rate to merchants with an AI-drafted message explaining their audience and why they'd be a good fit. This introduces negotiated commissions as a feature without requiring you to build a full negotiation system.
---
## Prioritized build order for the hackathon

Given you're under a deadline, here's what to add first alongside fixing the existing bugs:

1. Shopify product import — highest merchant onboarding impact, ~2 days
2. Earnings simulator on the affiliate marketplace — highest affiliate retention impact, ~4 hours
3. Link-in-bio page for affiliates — creates a viral loop, ~1 day
AI product description generator using Gemini — direct hackathon scoring criterion
USDC payout option — talking point, even if the implementation is simplified for demo
Real-time dashboard with WebSocket click counter — visual wow factor for judges
Verified merchant badge — trust signal, 2-hour implementation The narrative for the judges: *"We built the affiliate infrastructure layer that didn't exist for emerging market SMEs — merchants who have products but no Shopify, affiliates who have audiences but no reliable way to monetize them, and a payment layer that works whether you're paid in dollars, euros, naira, or USDC."*
Show more
Jun 13
Looking at the code you've shared, the backend is already substantially built. That changes the prioritization question significantly — you're not starting from zero, you're at maybe 60-70% of a working MVP backend.
Here's what I'd prioritize right now, in order:
First: Make what exists actually work end-to-end before adding anything.
The backend code has a structural issue you need to resolve before any feature additions make sense. The users.ts route for /me doesn't apply requireAuth middleware — it checks authReq.user but nothing populates it. The requireAuth middleware needs to be applied to that route explicitly. Small thing, but it'll break the whole auth flow.
Also, setup-test-accounts.ts constructs a webhook signature using t=timestamp,v1=signature but your test in test-split.ts also does this manually — run the test suite first and confirm all 6 test groups pass before building anything new.
Second: Build the frontend.
The backend is ahead of the frontend. The most urgent gap is the buyer-facing product page (/p/[slug]?ref=...) because without it you can't demo the core loop to anyone. That page, the affiliate marketplace, and the two dashboards are what makes this feel real. The AI suggestions about Shopify imports and USDC payouts are genuinely good — but irrelevant until there's a UI someone can actually use.
Third: Of the AI's suggestions, only one is truly worth doing now.
The earnings simulator on the affiliate marketplace. It's 30-50 lines of React, takes half a day, and transforms how affiliates perceive the product. Instead of seeing "15% commission," they see "If I drive 50 sales/month, I earn \$750/month." That reframe is the difference between someone generating a link and someone actually promoting. Everything else on that list — Shopify import, link-in-bio, USDC payouts — is post-MVP.
What to ignore entirely right now:
USDC payouts are a talking point, not a build. The WebSocket real-time dashboard is a demo trick that adds zero real user value. WooCommerce plugin is weeks of work. Gemini AI descriptions are nice but not core.
Your actual priority stack this week:
Confirm backend tests all pass as-is
Next.js frontend scaffold — auth, routing, basic layout
Buyer product page (SSR, Open Graph, Buy Now button)
Affiliate marketplace with earnings simulator
Merchant create-product form
Both dashboards (minimal but functional)
That's a shippable, demonstrable product. Everything the AI suggested can layer on top once the loop closes.
uuzor/nomopay
main
GITHUB
All 10/10 checks passed. Here's what was verified:
| Check | Result |
|---|---|
| API keys valid (test mode) | ✅ |
| Stripe Connect enabled | ✅ |
| Merchant Express account created | ✅ |
| Affiliate Express account created | ✅ |
| \$100 test payment succeeded | ✅ |
| Merchant transfer (\$83) executed | ✅ |
| Affiliate transfer (\$15) executed | ✅ |
| Idempotency (no duplicate payouts) | ✅ |
| Transfer reversal (refund path) | ✅ |
| Webhook signature verification | ✅ | All 10/10 checks passed. Here's what was verified:
| Check | Result |
|---|---|
| API keys valid (test mode) | ✅ |
| Stripe Connect enabled | ✅ |
| Merchant Express account created | ✅ |
| Affiliate Express account created | ✅ |
| \$100 test payment succeeded | ✅ |
| Merchant transfer (\$83) executed | ✅ |
| Affiliate transfer (\$15) executed | ✅ |
| Idempotency (no duplicate payouts) | ✅ |
| Transfer reversal (refund path) | ✅ |
| Webhook signature verification | ✅ |
A few things worth noting for when you build:
A new webhook endpoint is registered at [https://splitlink.vercel.app/api/webhooks/stripe](https://splitlink.vercel.app/api/webhooks/stripe) with secret whsec_lypdQpqhCh0C9H8WG25rN7DXvm3LUIDa — update STRIPE_WEBHOOK_SECRET in your env to this value
In test mode, use tok_bypassPending for test charges so the platform has available balance for transfers immediately
The stripe_test.py file can stay in the project as a reference for integration patternsIssue-by-Issue Verdict
role: 'both' — role === 'affiliate' check [VALID, FIX IN DESIGN] Real problem. If you write role === 'affiliate' anywhere instead of role === 'affiliate' || role === 'both', users with role: 'both' silently break. Since we're writing the backend from scratch, the fix costs nothing: establish the convention now that access checks always use:
const canAffiliate = ['affiliate', 'both'].includes(user.role)
const canMerchant  = ['merchant', 'both'].includes(user.role)
and never use === role comparisons in route guards. Zero rework cost if done upfront.
---
2. No merchant product verification step [SKIP FOR MVP]
Your own plan explicitly scoped this out. Express onboarding IS the verification gate — Stripe's KYC is more rigorous than anything you'd build. Adding an admin review queue now means building an admin panel before launch, which would delay you significantly. Defer. A post-MVP is_verified flag + admin queue is a 2-day addition; an unbuilt frontend delays everyone.
---
3. role: 'both' — broader underimplementation [SAME AS \#1, SAME FIX]
Same root cause as \#1. Addressed by the includes() convention above. Not a separate problem.
---
4. No rate limiting [DEFER, PRE-LAUNCH TASK]
Valid concern but not a frontend blocker. express-rate-limit is a one-line middleware addition. Add it to your launch checklist alongside the live-mode switch. Doing it now adds nothing to the frontend build.
---
5. Marketplace sorting [NOT AN ISSUE]
One Prisma orderBy clause. Add it when you write the marketplace query. Not worth discussing.
---
6. No account.updated webhook handler [VALID, WORTH A STUB]
This one is genuinely risky in production. If Stripe restricts a merchant mid-flight — account blocked for suspicious activity, failed verification — your DB still shows stripeOnboardingComplete: true and you'd try to transfer to them. The fix isn't complex: handle the account.updated event in your webhook router and sync charges_enabled / payouts_enabled to the DB. Since you're building the webhook handler anyway (for checkout.session.completed), adding a second case costs almost nothing. Worth doing alongside the checkout webhook.
---
7. Missing frontend [NOT AN ISSUE — THAT'S THE PLAN]
This is the work.
---
Summary: What to Actually Do Before Building Frontend


| Item | Action |
| :-- | :-- |
| role: 'both' checks | Establish includes() convention — no cost upfront |
| Merchant verification | Skip for MVP, add to backlog |
| Rate limiting | Add to pre-launch checklist |
| Marketplace sorting | One line, add when writing the query |
| account.updated webhook | Stub it out alongside checkout webhook |
| Frontend | Build it |

Nothing here should delay you. The only two worth touching in the backend design are the role check convention (\#1) and the account.updated webhook stub (\#6). Both are architectural habits, not features.
Ready to scaffold the Next.js app?
Show more
Jun 13
The Stripe foundation is solid — 10/10 with real money movement verified. That's the hardest part done.
Yes, let's scaffold the Next.js frontend. Before writing a line of code, a few quick questions to make sure we build the right thing:
dont write code for me , just analyse and tell me what to do next, i am thinking for compilance should we hold affiliate money for some days incase of reversal for products by merchants, also some small features for frontend like product sorting, etc
Jun 13
Good thinking on both fronts. Let me address each directly.
On holding affiliate commissions — yes, you should, and here's exactly how.
The risk you're identifying is real. A buyer purchases, your webhook fires, affiliate gets \$15 instantly, then the buyer refunds 3 days later. You try to reverse the affiliate transfer but they've already withdrawn. You're now covering that \$15 from your platform balance. At low volume this is annoying; at scale it's a serious liability.
Stripe has a native solution for this: payout schedules on connected accounts. When you create an Express account for an affiliate, you can set their payout schedule to manual or to a delay. The funds sit in their Stripe balance — they can see them accumulating — but they don't hit their bank until you release them.
The standard hold period for physical goods is 7 days. Digital goods can be shorter (2-3 days) since dispute windows are tighter. Since SplitLink is merchant-agnostic, default to 7 days and let merchants request shorter holds later as a trust tier feature.
The implementation is simple: when creating the affiliate's Express account, set settings.payouts.schedule to { interval: 'manual' }. Then run a daily cron job that finds all affiliate transfers older than 7 days with no associated refund, and calls stripe.accounts.update to release that payout. This keeps you in control of the timing without holding funds in your own account — the money is already in the affiliate's Stripe balance, just not yet in their bank.
One important nuance: communicate this clearly to affiliates during onboarding. "Commissions are held for 7 days to protect against refunds" is completely reasonable and every creator economy platform does some version of this. Hidden holds destroy trust; disclosed holds are expected.
On frontend features — here's what's worth building vs. what to skip.
Product sorting in the marketplace is a one-line Prisma orderBy change on the backend and a dropdown on the frontend. Worth doing. The options that actually matter for affiliates are: highest commission amount (not rate — show them the dollar figure), newest products, and most converted (once you have transaction data). Highest commission dollar amount should be the default, not newest, because it immediately surfaces what's most worth promoting.
A few other small frontend features worth the effort:
Commission preview on the product card. Don't just show "15%." Show "Earn \$15 per sale." Then under it, "Drive 10 sales = \$150." Affiliates are motivated by numbers they can feel. This is pure frontend math, no API change needed.
Onboarding progress indicator. Both merchants and affiliates have a multi-step flow (register → Stripe onboarding → create product or generate link). A simple step indicator at the top of the screen showing where they are reduces drop-off dramatically. The biggest churn point in any platform with Stripe Connect onboarding is people getting confused after returning from Stripe's flow.
Product status badge on the marketplace. When a merchant pauses a product, affiliates who already generated a link for it should see a "paused" badge in their link dashboard. Right now your schema supports this but the UI won't surface it. Affiliates need to know before they publish content promoting something that's no longer available.
Empty state pages that actually help. When a new merchant has no products, the empty dashboard should say "Create your first product" with a button, not just a blank table. Same for affiliates with no links. These are 20-minute additions that make the product feel finished.
What to skip for now: search on the marketplace (too few products at launch to matter), custom product page domains (significant complexity), any kind of messaging between merchant and affiliate (that's a different product).
One thing the AI suggestion list got wrong: the earnings simulator it described is good but it placed it on the marketplace browsing page. The higher-value placement is actually on the link generation confirmation screen — after an affiliate clicks "Generate My Link," show them the calculator right there while the link is fresh and they're deciding whether to actually promote it. That's the moment of highest intent.
now think carefully, we need to know how our ui should look like dont code, just think a very good ux flow what the pages should contain
Jun 13
Let me think through this carefully. The UX has to serve three completely different people — the merchant, the affiliate, and the buyer — and the flows should never collide or confuse each other.
The Core UX Principle
Every page should have one job. The biggest mistake platforms like this make is cramming merchant and affiliate features into the same dashboard view. They are different mental models. A merchant thinks in products and revenue. An affiliate thinks in links and commissions. Keep them separated.
Landing Page — The Front Door
This page has to speak to both merchants and affiliates without confusing either. The structure should be:
Hero — one sharp headline that captures the value for both sides simultaneously. Something like "Sell more. Share the reward." Two CTAs side by side: "I'm a Merchant" and "I'm an Affiliate." Not a generic "Sign Up" — force the visitor to self-identify immediately because it sets their entire journey.
How it works — a simple three-step visual, shown in two tabs (one for each role). Merchants: List your product → Set your commission → Watch affiliates promote it. Affiliates: Browse products → Generate your link → Earn on every sale.
Trust signals — the fee breakdown shown transparently. "We take 2%. That's it." This is a strong differentiator against Gumroad's 10% and should be visible before signup.
Sample product page preview — a mock of what a buyer sees when they click an affiliate link. This shows merchants the quality of the storefront they're getting and shows affiliates that they're sharing something that looks credible.
No pricing page, no blog, no lengthy feature list. Get them to signup.
Auth Flow — Registration
After clicking "I'm a Merchant" or "I'm an Affiliate," the role should be pre-selected on the signup form. The form itself should be minimal: name, email, password, and a slug field (their public URL). The slug field should show a live preview of what their URL will look like — splitlink.com/store/your-slug for merchants or splitlink.com/a/your-slug for affiliates. Instant availability check as they type.
After email verification, they land on a dedicated onboarding screen — not the dashboard. This is important. Dumping someone into an empty dashboard after signup is disorienting. The onboarding screen is a single focused page that says "One more step — connect your payment account" with a clear explanation of why (to receive payouts / to receive product revenue) and a prominent "Connect with Stripe" button. Nothing else on this page. No navigation. No distractions. This is the single most critical conversion point in the entire product.
After returning from Stripe's onboarding flow, they see a success state with a checkmark and a single CTA that takes them to their respective dashboard for the first time.
Merchant Dashboard — The Command Center
The top of the dashboard has four number cards in a row: Total Revenue, Total Paid Out to You, Total Commissions Paid to Affiliates, Active Affiliates. These update in real time. Merchants are motivated by seeing these numbers grow.
Below that, a two-tab layout: Products and Transactions.
Products tab is a card grid, not a table. Each card shows the product image, title, price, commission rate as both percentage and dollar amount, number of active affiliate links, total units sold, and status (active/paused). Two actions per card: Edit and Pause/Activate. A prominent "Add Product" button in the top right.
Transactions tab is a clean table with: date, product name, gross amount, your payout, affiliate commission, platform fee, and status. Filterable by date range and status. Clicking a row expands it to show the transfer IDs, buyer email, and which affiliate link drove the sale.
No sidebar navigation overload. Merchants only need Products, Transactions, and Settings. That's it.
Product Creation Form — Maximum Clarity
This is one of the most important pages in the product. It needs to feel effortless but also teach the merchant about commission strategy as they fill it in.
Left side: the form fields. Title, description (with character count), price, commission percentage slider (0-80%), image upload with drag-and-drop, slug (auto-generated from title but editable), currency selector.
Right side: a live fee breakdown panel that updates as they type. This is the earnings simulator in reverse — showing the merchant exactly what they'll receive per sale. As they move the commission slider, both sides of the panel update: "Affiliates earn X per sale" and "You receive Y per sale." This teaches commission strategy passively. A merchant who sees that setting 5% means affiliates earn only \$3 on a \$60 product will intuitively understand why their product might not get promoted. Setting 20% means affiliates earn \$12 — suddenly it's worth sharing.
Below the fee panel: a small note showing how the affiliate URL will look once the product is created. This makes the product feel real before it exists.
Single submit button: "Publish Product." No save as draft in MVP — it either goes live or it doesn't.
Affiliate Dashboard — The Earning Hub
Four number cards at the top: Total Earned, Pending (held for 7 days), Conversion Rate, Active Links. The pending amount with a small info tooltip explaining the hold period — no surprises.
Below that, two tabs: My Links and Discover.
My Links tab is where all their generated links live. Each link card shows: product image and name, their unique URL with a one-click copy button, clicks this week, conversions this week, conversion rate, total earned from this link, and the status of the product (active, paused — with a warning if paused). A small sparkline graph showing clicks over the last 7 days. No date filtering in MVP — just the last 30 days.
Below each link card, a mini earnings simulator: "At your current 3.2% conversion rate, driving 500 more clicks would earn you \$X." This is dynamic based on their actual conversion data, not hypothetical. It's motivating and it's personalized.
Discover tab is the marketplace. Product cards in a grid. Default sort is highest commission dollar amount. Each card shows: product image, merchant name, product title, price, commission percentage AND dollar amount, estimated earnings potential (based on platform-wide average conversion rate — show this honestly as an estimate). A single "Generate My Link" button on hover or tap.
After clicking Generate, a small modal appears — not a new page. The modal shows: their unique link with copy button, a QR code (downloadable), a share button row (Twitter, Instagram caption pre-written, WhatsApp). And right below that, the earnings calculator: "If you drive X clicks/month at Y% conversion, you earn \$Z/month." X and Y are editable fields. This modal is the moment of highest intent — they just committed to promoting this product. Give them everything they need to start immediately.
Buyer Product Page — The Money Page
This is the most important page in the entire product. It has to convert.
Clean, full-width product image at the top (or left on desktop). Right side or below: product title in large text, merchant name in smaller text with a subtle "Verified Merchant" badge. Price prominently displayed. A short description — 2-3 sentences max visible, expandable for more.
One button: "Buy Now — \$X.XX" in a strong, high-contrast color. Nothing else competing with it.
Below the fold (visible on scroll but not distracting): a brief trust section. "Secure checkout powered by Stripe." "7-day return policy" (or whatever the merchant sets). "Sold by [Merchant Name]."
No navigation header. No footer links. No related products. No distractions. This page exists for one reason: the buy button gets clicked.
After payment success, a clean confirmation page: "You're all set. [Product name] is on its way." With the buyer's email confirmation note. No upsell, no account creation prompt. Clean exit.
Settings Pages
Merchant settings: profile (name, slug, email), Stripe account status with a "Manage Payout Account" link that takes them back to Stripe's dashboard, notification preferences (email on every sale vs. daily digest).
Affiliate settings: same structure, plus their wallet/payout details and the hold period explanation with a running total of held vs. released funds.
The Navigation Logic
Merchants and affiliates should have completely separate navigation structures. A user with role: both sees two sections in their nav: "Merchant" and "Affiliate" — clearly labeled, not mixed. Clicking between them feels like switching modes, not getting lost.
The navigation itself should be minimal: on desktop, a left sidebar with 3-4 items maximum. On mobile, a bottom tab bar with icons. No dropdown menus, no nested navigation in MVP.
The Most Important UX Decision
The buyer product page must be completely stateless from the platform's perspective — no login required, no cookies beyond the ref tracking, loads in under 2 seconds, looks great in a WhatsApp link preview. This page is shared millions of times by affiliates. Its load speed and link preview quality directly determine affiliate conversion rates. It deserves more design attention than any other page.
i am thinking for easy onboarding fr merchants from other platforms eg shopify , we allow ai to automatically get their products and auto populate inventory -- [https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront](https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront), , also i am thinking of adding referral reward for creators that invite merchants so they can get 0.1% of each sales from that merchant forever , what other ideas do you have

This is a sharp evolution of the product. Adding **Shopify auto-import via MCP** and a **referral network fee (0.1% forever)** moves you from a "tool" to a "platform" with genuine network effects.

Here’s a deep analysis of your new ideas, followed by **5 additional high-impact ideas** specifically tailored to solve SME/creator pain points in the EU/US market, plus a final **prioritized UX flow recommendation**.

***

### 1. Analysis of Your New Ideas

#### **A. Shopify Auto-Import via Storefront MCP**

*Link: [shopify.dev MCP Server](https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront)*


| Aspect | Analysis |
| :-- | :-- |
| **Why it’s brilliant** | This is your \#1 merchant retention lever. The biggest reason SMEs abandon tools is "I have to re-type my products." Pulling images, prices, descriptions, and inventory in one click removes 90% of onboarding friction. |
| **Technical feasibility** | High. The MCP server abstracts the GraphQL complexity. You just need to: 1) Authenticate via OAuth, 2) Query `products(query: "...")`, 3) Map fields to your schema. ~2–3 days of work. |
| **UX risk** | Don’t auto-publish. Show a **"Preview \& Edit"** screen where merchants can tweak commission rates per product before syncing. Some products (low margin) shouldn’t have high affiliate splits. |
| **Strategic win** | This makes you compatible with the ~20% of SMEs who *already* have Shopify. You become the "affiliate layer" for their existing store, not a replacement. |

#### **B. Referral Reward: 0.1% Forever for Inviting Merchants**

*"Creators get 0.1% of every sale from merchants they invite, forever."*


| Aspect | Analysis |
| :-- | :-- |
| **Psychological impact** | This is **massive**. Most referral programs give a one-time \$50 bonus. "Forever 0.1%" creates a **lifetime asset**. A creator inviting 10 merchants doing \$10k/month each = \$100/month recurring for life. This turns creators into **sales agents**. |
| **Legal/compliance** | In EU/US, this is a "referral fee," not a pyramid scheme (you’re paying for *merchants*, not recruiting other creators). Just ensure Stripe’s terms allow passive income sharing (it does for platforms). |
| **Math sanity** | 0.1% is low enough to not hurt your 2% platform fee, but high enough to matter at scale. At \$1M platform volume, you pay \$1k in referral fees — totally sustainable. |
| **UX addition** | You need a **"Invite Merchants"** page in the affiliate dashboard with a custom link, a tracker showing "Merchants invited: 3 → Expected monthly earnings: \$45," and a payout history filter for "Referral fees." |


***

### 2. 5 Additional High-Impact Ideas for SME/Creator Focus

These are chosen to **close the loop** between merchant inventory, affiliate motivation, and buyer trust — all without overbuilding.

#### **Idea 1: "Commission Negotiation" (AI-Assisted)**

*Let affiliates propose custom commission rates to merchants.*

- **Why:** A creator with 100k followers might say, "I’ll promote your \$100 product, but 15% is too low. Can you do 20%?" Currently, they can’t ask.
- **How it works:**
    - Affiliate clicks "Negotiate Commission" on a product card.
    - AI (Gemini) drafts a message: *"Hi [Merchant], I have 50k Instagram followers in [niche]. I’d love to promote your product at 20% commission. My average conversion is 4%."*
    - Merchant gets a notification, accepts/rejects in 1 click.
    - If accepted, the affiliate’s link **automatically updates** to the new rate.
- **Build cost:** ~1 day (AI prompt + simple notification system).
- **Why it wins:** Gives affiliates **agency**. Merchants get **higher-quality promotions** from serious creators.


#### **Idea 2: "Smart Product Matching" (Onboarding Personalization)**

*When an affiliate signs up, show them products that fit their audience — not a flat list.*

- **Why:** New affiliates churn because they see 500 products and don’t know which to pick.
- **How it works:**
    - On signup, ask: *"What’s your main platform? (Instagram/TikTok/Blog)"* and *"What’s your niche? (Fashion/Tech/Food)"*.
    - Use a simple tag system on products (e.g., `tag: fashion`, `tag: tech`).
    - Show a **"Recommended for You"** grid: *"Based on your niche, these 3 products have the highest commission potential."*
    - Add a badge: *"Top match for your audience"* on each card.
- **Build cost:** ~4 hours (tags + simple filtering).
- **Why it wins:** Reduces decision fatigue. Affiliates generate their **first link faster**.


#### **Idea 3: "One-Click Affiliate Link-in-Bio Page"**

*Give every affiliate a public page at `splitlink.com/a/{slug}` with a curated grid of their promoted products.*

- **Why:** Creators hate managing 20 different links in their Instagram bio. They want **one URL** that shows everything they promote.
- **How it works:**
    - Affiliate clicks "Create Bio Page" in dashboard.
    - They select which products to feature (or auto-show all active links).
    - Page loads with: their profile pic, short bio, and a grid of product cards (image, title, price, "Buy" button with *their* tracked link).
    - They paste `splitlink.com/a/theirname` in their bio.
- **Build cost:** ~1 day (Next.js SSR page + simple grid).
- **Why it wins:** Competes with **Linktree/Beacons** but for *commerce*. Viral loop: every bio page is a mini-marketplace.


#### **Idea 4: "Refund Protection Reserve" (Auto-Hold for High-Risk Merchants)**

*Automatically hold 10% of affiliate commissions for merchants with >5% refund rates.*

- **Why:** You already mentioned holding funds for 7 days. But what if a merchant has *chronic* refund issues (e.g., counterfeit goods)?
- **How it works:**
    - Track merchant refund rate in real time.
    - If >5%, flag as "high risk."
    - For high-risk merchants, auto-hold **10% of affiliate commissions** in a reserve wallet for 30 days.
    - If no refunds in 30 days, release to affiliate.
    - Show a badge: *"This merchant has a high refund rate. Commissions are held for protection."*
- **Build cost:** ~2 days (refund tracking + reserve logic).
- **Why it wins:** Protects affiliates from **bad merchants**. Builds trust in your platform as the " honest mediator."


#### **Idea 5: "Embeddable Buy Button" (For Merchants with Existing Sites)**

*Instead of redirecting buyers to your product page, let merchants paste a `<script>` tag on their Shopify/Woo site to show a "Buy with SplitLink" button.*

- **Why:** Many SMEs don’t want to leave their site. They want affiliate tracking *without* redirecting buyers.
- **How it works:**
    - Merchant clicks "Get Embed Code" on a product.

```
- Gets a snippet: `<script src="splitlink.com/embed.js" data-product="xyz"></script>`
```

    - On their site, a button appears: "Buy Now — \$X" that opens a **modal checkout** (your Stripe Checkout in a popup).
    - Affiliate tracking still works via URL param (`?ref=...`).
- **Build cost:** ~2 days (embed script + modal checkout).
- **Why it wins:** Makes you **invisible infrastructure**. Merchants keep their branding; you get the tracking.

***

### 3. Prioritized UX Flow: What to Build First

Given your backend is 70% done, here’s the **exact order** to ship a demo-ready MVP in 4–6 weeks:


| Phase | Feature | Why First? | Build Time |
| :-- | :-- | :-- | :-- |
| **1** | **Shopify Auto-Import** | solves \#1 merchant onboarding friction. Without this, merchants churn. | 2–3 days |
| **2** | **Buyer Product Page (/p/[slug]) ** | Core loop: affiliate link → buyer page → purchase. No UX = no demo. | 1–2 days |
| **3** | **Affiliate Marketplace + Earnings Simulator** | Affiliates need to see *dollar value* (\$15/sale, not 15%). Critical for retention. | 1 day |
| **4** | **Link-in-Bio Page** | Viral loop. Every affiliate becomes a marketer for your platform. | 1 day |
| **5** | **Commission Negotiation (AI)** | Differentiator. Makes you feel "smart" vs. generic tools. | 1 day |
| **6** | **Referral Reward System (0.1%)** | Network effect. Turns affiliates into sales agents. | 2 days |
| **7** | **Merchant Dashboard (Products + Transactions)** | Core merchant view. Needs to be clean but functional. | 2 days |
| **8** | **Affiliate Dashboard (My Links + Discover)** | Core affiliate view. Needs dynamic earnings simulator. | 2 days |
| **9** | **Embeddable Buy Button** | Post-MVP. Nice for existing stores, but not core to MVP. | 2 days |
| **10** | **Refund Protection Reserve** | Post-MVP. Important for scale, not for hackathon demo. | 2 days |


***

### 4. Final Recommendation: The "Hackathon-Ready" Narrative

Frame your product for judges like this:

> *"We built the **affiliate infrastructure layer** that didn’t exist for SMEs — merchants who have products but no Shopify, affiliates who have audiences but no reliable way to monetize them, and a payment layer that works whether you’re paid in dollars, euros, or USDC.*
>
> *Key features:*
> - **Shopify auto-import** (zero onboarding friction)
> - **7-day commission hold** (protects against refunds)
> - **0.1% forever referral reward** (turns creators into sales agents)
> - **AI commission negotiation** (gives affiliates agency)
> - **Link-in-bio page** (viral marketplace for creators)"*

This narrative hits **innovation** (MCP + AI), **trust** (hold period), **network effects** (referral reward), and **UX** (bio page).

***

### What to Do *Right Now* (Next 24 Hours)

1. **Scaffold Next.js app** with:
    - Auth (NextAuth or custom)
    - Routing: `/merchant`, `/affiliate`, `/p/[slug]`, `/a/[slug]`
    - Basic layout (sidebar for dashboards, clean header for public pages)
2. **Build the Buyer Product Page first** (`/p/[slug]`):
    - SSR to fetch product from your DB
    - Open Graph tags for link previews
    - One "Buy Now" button (Stripe Checkout)
    - Affiliate ref tracking via `client_reference_id`
3. **Add Shopify OAuth flow**:
    - Create a "Import from Shopify" button on merchant dashboard
    - Use MCP server to query products
    - Show preview screen with editable commission rates
4. **Add the Earnings Simulator** on the affiliate marketplace:
    - 30-line React component: "If you drive 50 clicks at 3% conversion = \$X"
    - Make it dynamic based on affiliate’s past conversion rate

That’s your **shippable core**. Everything else (negotiation, bio page, referral reward) layers on top.

You’re at 70% backend. Focus on **closing the loop** with frontend. Ship the demo. Then iterate.

