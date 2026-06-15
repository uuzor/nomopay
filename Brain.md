Short answer
Yes — AI-assisted merchant import from Shopify is one of the best directions you can take, especially for the Gemini XPRIZE angle. It turns your product from “create affiliate links manually” into:

“Connect your store, let AI understand your catalog, and instantly launch an affiliate program with recommended commissions, product pages, and creator campaigns.”

The creator-refers-merchant reward idea is also strong, but I would be careful with “0.1% forever.” I would make it lifetime in positioning, but with clear rules: paid from your platform fee, capped by eligibility, clawed back on refunds/fraud, and possibly tiered by merchant volume.

No new code changes were needed for this response, so I did not make another commit or PR. The previous dependency cleanup is already committed, and the repo currently has no uncommitted tracked changes.

1. Shopify onboarding idea: very strong, but use it carefully
Your idea is excellent:

Merchant enters their Shopify store → AI pulls the catalog → SplitLink auto-populates products/inventory → AI recommends commissions and creates affiliate-ready listings.

This directly improves the biggest friction point in your current product: merchants currently need to manually create products one by one. Your MVP plan currently says the merchant creates a product manually with title, description, price, commission, image, and slug.

Why this is powerful for your hackathon submission
For Gemini XPRIZE / Devpost, the key is not only “we use AI.” The key is:

AI reduces business setup time.

AI helps merchants launch faster.

AI turns an existing catalog into an affiliate sales engine.

AI creates measurable revenue operations.

That is much stronger than “AI generates product descriptions.”

Your current project vision is already about helping SMEs sell through affiliate links, instant Stripe-powered splits, and real-time dashboards. Adding AI catalog import makes that vision much more scalable.

2. Important Shopify MCP nuance
The Shopify Storefront MCP server is useful, but I would not treat it as the only import mechanism.

Shopify’s Storefront MCP docs say it connects an AI agent to a specific store’s catalog, shopping cart, and policies. It supports catalog search, product lookup, product details, cart operations, and policy/FAQ search. Shopify lists endpoints like:

https://{shop}.myshopify.com/api/mcp

https://{shop}.myshopify.com/api/ucp/mcp

The docs also say Storefront MCP requests do not require authentication, but warn that some stores may restrict access. Source: Shopify Storefront MCP docs.
https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront

What that means for SplitLink
Use Shopify MCP as an AI catalog discovery layer, not necessarily as the final source of truth for merchant inventory.

A practical approach:

Option A — Fast hackathon version
Let merchant paste their Shopify domain:

mybrand.myshopify.com
Then your AI importer:

calls Shopify Storefront MCP catalog search,

fetches product details,

lets the merchant select products to import,

maps product data into your Product model,

asks Gemini to recommend commission rates and affiliate copy,

creates SplitLink marketplace listings.

This is probably the best hackathon implementation because it is fast, visual, and clearly AI-native.

Option B — Production version
Build a real Shopify app using Admin API OAuth so the merchant authorizes access to:

product catalog,

variants,

inventory,

images,

collections,

fulfillment status,

product updates.

Then use MCP/Gemini for interpretation, enrichment, and recommendation.

My recommendation
For the hackathon:

Build the “Shopify AI Import Wizard” first using Storefront MCP where possible, but design the data model so you can later swap in authenticated Shopify Admin API sync.

This lets you demo something impressive quickly without overbuilding OAuth/admin sync immediately.

3. What the Shopify import wizard should do
I would make onboarding feel like this:

Step 1: Merchant enters store URL
https://mybrand.myshopify.com
or

https://mybrand.com
AI detects whether it can resolve a Shopify storefront.

Step 2: AI scans catalog
Use Shopify Storefront MCP catalog tools to find products, product IDs, variants, prices, descriptions, and images.

Step 3: AI recommends what to launch
Gemini should not import everything blindly. It should rank products by affiliate suitability:

clear value proposition,

visually shareable,

healthy margin,

simple shipping/fulfillment,

strong creator-content potential,

low refund risk,

good average order value.

Step 4: AI suggests commission rates
For each imported product, Gemini recommends:

default affiliate commission,

minimum viable commission,

aggressive launch commission,

expected merchant payout after platform fee.

This fits your existing commission model because products already have commissionRate in the database schema.

Step 5: Merchant approves
The merchant sees:

Product	Price	AI Suggested Commission	Reason	Import?
Linen Weekender Bag	$126	18%	High visual appeal, good AOV	Yes
Gift Card	$50	5%	Lower creator appeal	No
Step 6: SplitLink creates affiliate-ready listings
Each selected Shopify product becomes a SplitLink product with:

title,

description,

price,

image,

slug,

commission rate,

active/paused status.

That maps directly to your existing Product model.

Step 7: AI generates affiliate launch kit
For every imported product, generate:

3 TikTok hooks,

3 Instagram captions,

2 email snippets,

suggested creator niche,

product talking points,

objections and answers,

recommended commission pitch.

This is the moment where Gemini becomes central to the business.

4. The referral reward idea: good, but structure it correctly
Your idea:

Creators invite merchants and get 0.1% of each sale from that merchant forever.

This is strategically smart because it turns creators into your B2B acquisition channel. Instead of paying ads to acquire merchants, you let creators bring in merchants they want to promote.

Why it fits SplitLink
Your product already has two sides:

merchants,

affiliates/creators.

The existing affiliate link system lets creators generate tracked product links. But there is not yet a separate mechanism for a creator referring a merchant to the platform.

Adding a creator-to-merchant referral reward creates a second earning path:

Product commission: creator earns by selling a product.

Merchant referral reward: creator earns a small override on all future sales from merchants they onboard.

This makes creators more likely to recruit merchants into SplitLink.

5. But I would not implement it as “0.1% forever” without guardrails
“Forever” is a great marketing hook, but it creates product, legal, accounting, and fraud questions.

Risks
1. Unit economics risk
If your platform fee is 2%, and you give 0.1% to the merchant referrer, that is 5% of your platform revenue.

Example:

$100 sale

2% platform fee = $2.00

0.1% merchant referral override = $0.10

Referral takes 5% of your platform fee

That is acceptable if it drives merchant acquisition, but you need to model it.

2. Fraud risk
Creators may create fake merchants, self-refer, or collude to extract rewards.

3. Dispute/refund risk
You need the reward to reverse or not finalize until the sale is settled.

4. Legal/tax complexity
Lifetime revenue-share can start to look like a financial obligation if not carefully framed.

5. Marketplace fairness
A creator who invited a merchant might earn on sales generated by other affiliates. That could be okay, but you must explain it transparently.

6. Better version: “Merchant Referral Override”
I would call it:

Merchant Referral Override

or

Creator Partner Bonus

Instead of saying “0.1% of each sale forever” in the product UI, say:

“Earn a small platform-funded bonus on qualifying sales from merchants you bring to SplitLink.”

Suggested structure
Basic version
Creator invites merchant.

Merchant signs up through creator’s invite link.

Creator earns 0.1% of gross sales from that merchant.

Reward is paid from SplitLink’s platform fee, not from the merchant’s payout or other affiliates’ commissions.

Reward applies only when SplitLink earns a platform fee.

Reward reverses on refunds/disputes.

Better version
Use tiers:

Merchant GMV from referred merchant	Creator override
$0–$10k lifetime GMV	0.10%
$10k–$100k lifetime GMV	0.075%
$100k+ lifetime GMV	0.05%
This keeps the incentive strong early but protects your margins as merchants scale.

Hackathon-friendly version
For speed, implement the simple version:

merchantReferralRate = 0.001

paid only from platform fee

only after transaction status is paid

reversed or netted out on refunds

admin-configurable

7. How it would fit your current backend
Right now, your core schema has:

User

Product

AffiliateLink

Transaction

Click

The transaction model already records gross amount, platform fee, merchant payout, affiliate commission, and connected Stripe transfer IDs.

To support creator-refers-merchant, I would add either:

Option A — Simple fields on User
Add to User:

referredByUserId String?
merchantReferralRate Decimal? @db.Decimal(5, 4)
This is fast, but less flexible.

Option B — Dedicated MerchantReferral model
Better:

model MerchantReferral {
  id                String   @id @default(cuid())
  merchantId        String   @unique
  referrerId        String
  rate              Decimal  @db.Decimal(6, 4) // 0.0010 = 0.10%
  status            String   @default("active")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
Then add referral payout fields to Transaction:

merchantReferralId String?
merchantReferralReward Int @default(0)
merchantReferralTransferId String?
This is cleaner because it gives you a real audit trail.

8. How the money flow should work
Your webhook currently calculates:

gross amount,

platform fee,

affiliate commission,

merchant payout.

Then it creates transfers for merchant and affiliate.

With merchant referral rewards, update the math:

gross = sale amount
platformFee = gross * platformFeeRate
affiliateCommission = gross * productCommissionRate
merchantReferralReward = gross * merchantReferralRate
merchantPayout = gross - platformFee - affiliateCommission
platformNetRevenue = platformFee - merchantReferralReward
Important: do not subtract merchant referral reward from the merchant payout unless you explicitly tell merchants. It should come from your platform fee.

Then optionally transfer the referral reward to the creator’s Stripe account.

9. Other ideas I would add
Here are the highest-leverage ideas, ranked.

Idea 1: AI “Affiliate Program in One Click”
For any imported Shopify merchant, Gemini creates a full affiliate program:

products to promote,

commission recommendations,

creator persona recommendations,

marketplace listing copy,

affiliate terms,

launch emails,

social post templates.

This should be your main demo.

Why it matters: it turns SplitLink from a payment tool into a business-building AI agent.

Idea 2: AI commission optimizer
Most merchants will not know what commission to set.

Gemini can recommend commission based on:

product price,

estimated margin,

category,

shipping complexity,

refund likelihood,

creator effort required,

historical conversion data.

Example output:

Recommended commission: 18%

Why:
- Product is visual and giftable.
- $126 AOV supports a meaningful creator payout.
- Similar lifestyle accessories need 15–25% to attract creators.
- Merchant still keeps approximately $100 after platform fee and commission.
This connects directly to your existing product model’s commissionRate.

Idea 3: Creator invite marketplace
Let creators submit brands they want on SplitLink.

Flow:

Creator enters a brand/store URL.

AI scans the brand’s products.

AI generates a personalized pitch.

Creator sends invite.

If merchant joins, creator gets merchant referral override.

Creator gets first access to that merchant’s affiliate links.

This is very strong because it turns affiliates into your merchant acquisition engine.

Idea 4: AI-generated merchant pitch pages
For every merchant referral, generate a personalized landing page:

splitlink.com/invite/maison-kiln/by/alex
It contains:

merchant’s detected products,

estimated affiliate revenue opportunity,

suggested creator campaign,

expected payout math,

“Launch your affiliate program” CTA.

This is more compelling than a generic referral link.

Idea 5: “Creator waitlist for your store”
Before a merchant joins, creators can express demand:

12 creators want to promote your products.
Projected first-month reach: 410k followers.
Launch your SplitLink program to activate them.
This is a great merchant acquisition wedge.

Idea 6: AI product-affiliate matching score
For every product and creator, show a match score:

92% match
Reason:
- Creator audience likes sustainable home goods.
- Product has strong visual appeal.
- Commission payout is above category average.
- Past creator campaigns perform well in this price range.
This helps affiliates choose better products and merchants understand who to recruit.

Idea 7: AI campaign asset generator
For each affiliate link, generate:

TikTok hook,

Instagram caption,

YouTube Shorts script,

email blurb,

landing-page headline,

disclosure-compliant affiliate disclaimer.

This helps creators promote immediately after link creation.

Your current affiliate link API already returns a generated URL for a product/ref code pair. The next step is to attach AI campaign assets to that link.

Idea 8: Smart product bundles
AI can identify products from Shopify that should be promoted together:

Bundle: Linen Weekender Bag + Packing Cubes
Why: Higher AOV, strong travel creator fit, giftable.
Suggested commission: 16%
This helps merchants increase average order value.

Idea 9: Merchant scoring for affiliates
Affiliates need trust.

Add merchant cards with:

payout readiness,

refund rate,

historical conversion rate,

average commission,

product quality score,

shipping/policy summary from Shopify MCP policy search.

Shopify’s Storefront MCP includes policy and FAQ search capabilities, which could support AI-generated trust summaries. Source: Shopify Storefront MCP docs.
https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront

Idea 10: AI “why this product will sell” marketplace cards
Instead of a marketplace that only shows products and commission, show an AI explanation:

Why creators should promote this:
- High gift appeal
- Strong visual unboxing potential
- 22% commission
- Lightweight shipping
- Good fit for home/lifestyle audiences
This can improve affiliate activation.

Idea 11: Auto-generated storefront pages for non-Shopify merchants
For merchants without Shopify, keep the original SplitLink promise: simple product pages and checkout links.

Your product plan already includes generated buyer product pages and merchant store pages.

So the onboarding can branch:

Already have Shopify? Import with AI.
No store yet? Create products manually with AI.
That lets you serve both Shopify merchants and Shopify-less SMEs.

Idea 12: AI sales operations dashboard
Every week, Gemini tells the merchant:

which products need higher commissions,

which affiliates deserve outreach,

which products have clicks but no conversions,

which product page copy should change,

which creator niches to recruit next.

This fits the XPRIZE “AI-native operations” angle very well.

10. Recommended product architecture
I would think about the platform as three loops.

Loop 1: Merchant onboarding loop
Import Shopify store → AI picks best products → AI recommends commissions → merchant approves → products go live.
Loop 2: Creator acquisition loop
Creator finds/imports brand → AI generates invite → merchant joins → creator gets referral override.
Loop 3: Sales optimization loop
Affiliate creates link → AI creates campaign assets → buyer purchases → Stripe splits payout → AI recommends next optimization.
Your current product already supports a large part of loop 3 through affiliate links, checkout, transactions, and analytics.

11. What I would build next, in order
P0 — Shopify AI Import Wizard
Build this first.

Minimum demo:

merchant enters Shopify domain,

backend calls Storefront MCP,

AI summarizes catalog,

merchant selects products,

app creates products in SplitLink,

AI recommends commission and copy.

This is your best hackathon differentiator.

P0 — Creator merchant referral links
Add:

splitlink.com/refer/:creatorSlug
When merchant signs up through this link:

attach merchant to creator,

store referral rate,

show creator their referred merchants,

calculate reward on each sale.

P0 — AI affiliate launch kit
After product import, generate campaign assets for creators.

This gives you a clean demo:

Shopify store imported → affiliate program generated → creator campaigns generated → checkout works.
P1 — Referral reward ledger
Do not only add a number to transactions. Add a ledger.

You will eventually need:

pending reward,

payable reward,

paid reward,

reversed reward,

source transaction,

Stripe transfer ID.

P1 — AI match scoring
After importing products, match them to creator profiles/categories.

P2 — Full Shopify app
Only after the hackathon MVP is working, build a proper Shopify app with OAuth and Admin API sync.

12. My suggested Devpost framing
I would pitch this as:

SplitLink turns any Shopify or non-Shopify merchant into an AI-powered affiliate business in minutes. Gemini imports the merchant’s catalog, selects the best products to promote, recommends commission rates, generates creator campaigns, and helps creators recruit merchants. Stripe handles checkout and automatic payout splitting.

That is much stronger than:

“An affiliate link platform for SMEs.”

Because it has:

AI-native onboarding,

AI-native operations,

real revenue flow,

creator-led distribution,

financial infrastructure,

measurable business traction.

13. My opinion on the 0.1% reward
I like it, with edits.

I would keep
creator invites merchant,

creator earns override,

reward applies to all qualifying future sales,

reward is platform-funded,

reward is visible in creator dashboard.

I would change
Instead of:

“0.1% forever”

Use:

“Earn up to 0.1% of qualifying GMV from merchants you bring to SplitLink.”

Then in terms:

paid from platform fee,

only on settled paid transactions,

no payout on refunded/disputed/fraudulent sales,

subject to account good standing,

platform can adjust future program terms,

maybe capped or tiered for high-volume merchants.

This gives you a strong growth loop without trapping you economically.

14. Database changes I would eventually make
If implementing this, I would add:

MerchantImport
Tracks Shopify import sessions.

model MerchantImport {
  id              String   @id @default(cuid())
  merchantId      String
  source          String   // shopify, csv, manual
  sourceDomain    String?
  status          String   // pending, imported, failed
  rawCatalogJson  Json?
  aiSummaryJson   Json?
  createdAt       DateTime @default(now())
}
ExternalProductSource
Maps imported products to original Shopify products.

model ExternalProductSource {
  id                String   @id @default(cuid())
  productId         String
  source            String
  externalProductId String
  externalVariantId String?
  sourceUrl         String?
  lastSyncedAt      DateTime?
}
MerchantReferral
Tracks creator-refers-merchant relationships.

model MerchantReferral {
  id          String   @id @default(cuid())
  merchantId  String   @unique
  referrerId  String
  rate        Decimal  @db.Decimal(6, 4)
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
ReferralReward
Tracks reward accounting.

model ReferralReward {
  id             String   @id @default(cuid())
  transactionId  String
  merchantId     String
  referrerId     String
  amount         Int
  currency       String
  status         String   // pending, payable, paid, reversed
  stripeTransferId String?
  createdAt      DateTime @default(now())
}
15. Final recommendation
If I were building this for the hackathon, I would focus on one killer flow:

Creator finds a Shopify brand they love
→ AI scans the brand/store
→ AI generates a personalized invite
→ merchant joins
→ AI imports best products
→ AI recommends commissions
→ merchant launches affiliate program
→ creator gets first affiliate links
→ buyer purchases
→ Stripe splits payout
→ creator earns both product commission and merchant referral override
That is a very compelling story because it combines:

Shopify onboarding,

creator-led merchant acquisition,

AI-native business setup,

affiliate sales,

automatic financial splitting,

revenue traction.

It also builds naturally on your current product vision, which is already about merchant product listings, affiliate tracked links, buyer checkout, automatic Stripe splits, and dashboards.