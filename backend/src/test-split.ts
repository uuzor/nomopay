/**
 * Tests the core payment split flow:
 * - Webhook signature verification
 * - Split calculation (math)
 * - Transaction recorded in DB with correct amounts
 * - Affiliate link generation
 * Note: Stripe Connect transfers are skipped (Connect not yet enabled on this account).
 */
import 'dotenv/config';
import crypto from 'crypto';
import { prisma } from './lib/prisma.js';
import { stripe, PLATFORM_FEE_RATE } from './lib/stripe.js';

const SERVER = 'http://localhost:8080';
let pass = 0; let fail = 0;

function check(label: string, result: boolean) {
  if (result) { console.log(`  ✓ ${label}`); pass++; }
  else { console.log(`  ✗ ${label}`); fail++; }
}

async function run() {
  console.log('\n=== SplitLink Backend Tests ===\n');

  // ── 1. Affiliate link generation ────────────────────────────────────────────
  console.log('1. Affiliate link generation');
  const product = await prisma.product.findUnique({ where: { slug: 'handmade-leather-tote' } });
  const link = await prisma.affiliateLink.findUnique({
    where: { refCode: 'TESTREF1' },
    include: { affiliate: true },
  });
  check('product exists in DB', !!product);
  check('affiliate link exists in DB', !!link);
  check('ref code is 8 chars', link?.refCode?.length === 8);
  check('link points to correct product', link?.productId === product?.id);

  // ── 2. Checkout session creation ────────────────────────────────────────────
  console.log('\n2. Checkout session creation (real Stripe API)');
  const sessionRes = await fetch(`${SERVER}/api/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product!.id, refCode: 'TESTREF1' }),
  });
  const sessionData = await sessionRes.json() as { url?: string; error?: string };
  check('create-session returns 200', sessionRes.status === 200);
  check('returns Stripe Checkout URL', !!sessionData.url?.startsWith('https://checkout.stripe.com'));
  console.log(`  Checkout URL: ${sessionData.url?.slice(0, 60)}...`);

  const sessionId = sessionData.url?.match(/pay\/(cs_test_[^#]+)/)?.[1]?.split('#')[0];
  check('session ID is cs_test_*', !!sessionId?.startsWith('cs_test_'));

  // ── 3. Fee calculation math ──────────────────────────────────────────────────
  console.log('\n3. Fee calculation math');
  const gross = product!.price;                                          // 10000 cents
  const platformFee = Math.round(gross * PLATFORM_FEE_RATE);            // 200 cents
  const affiliateCommission = Math.round(gross * 0.15);                  // 1500 cents
  const merchantPayout = gross - platformFee - affiliateCommission;      // 8300 cents
  check('platform fee is 2%', platformFee === 200);
  check('affiliate commission is 15%', affiliateCommission === 1500);
  check('merchant payout is 83%', merchantPayout === 8300);
  check('splits sum to gross', platformFee + affiliateCommission + merchantPayout === gross);
  console.log(`  $${gross/100} → platform $${platformFee/100} | affiliate $${affiliateCommission/100} | merchant $${merchantPayout/100}`);

  // ── 4. Webhook signature verification + transaction recording ────────────────
  console.log('\n4. Webhook: signature verification + transaction recording');

  // Build a PaymentIntent with the Stripe API (no Connect needed)
  const pi = await stripe.paymentIntents.create({
    amount: gross,
    currency: product!.currency,
    transfer_group: `test_group_${Date.now()}`,
    confirm: true,
    payment_method: 'pm_card_visa',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  });
  check('PaymentIntent created', pi.status === 'succeeded');
  console.log(`  PaymentIntent: ${pi.id} (${pi.status})`);

  // Use a unique session ID to avoid idempotency collision
  const testSessionId = `cs_test_synth_${Date.now()}`;
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2025-02-24.acacia',
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: testSessionId,
        object: 'checkout.session',
        payment_intent: pi.id,
        payment_status: 'paid',
        amount_total: gross,
        currency: product!.currency,
        client_reference_id: `TESTREF1:${product!.id}`,
        customer_details: { email: 'testbuyer@example.com' },
        metadata: {},
      },
    },
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');

  const whRes = await fetch(`${SERVER}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${timestamp},v1=${sig}` },
    body: payload,
  });
  check('webhook returns 200', whRes.status === 200);

  // Test invalid signature rejection
  const badRes = await fetch(`${SERVER}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=999,v1=badsig' },
    body: payload,
  });
  check('invalid signature returns 400', badRes.status === 400);

  // Verify transaction in DB
  await new Promise(r => setTimeout(r, 500));
  const tx = await prisma.transaction.findUnique({ where: { stripeCheckoutSessionId: testSessionId } });
  check('transaction recorded in DB', !!tx);
  check('transaction status is paid', tx?.status === 'paid');
  check('gross amount correct', tx?.grossAmount === gross);
  check('platform fee correct (2%)', tx?.platformFee === platformFee);
  check('affiliate commission correct (15%)', tx?.affiliateCommission === affiliateCommission);
  check('merchant payout correct (83%)', tx?.merchantPayout === merchantPayout);
  check('buyer email recorded', tx?.buyerEmail === 'testbuyer@example.com');
  check('affiliate linked to transaction', tx?.affiliateId !== null);

  // ── 5. Idempotency (duplicate webhook) ─────────────────────────────────────
  console.log('\n5. Idempotency — duplicate webhook should not double-record');
  const ts2 = Math.floor(Date.now() / 1000);
  const sig2 = crypto.createHmac('sha256', secret).update(`${ts2}.${payload}`).digest('hex');
  const dupRes = await fetch(`${SERVER}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${ts2},v1=${sig2}` },
    body: payload,
  });
  check('duplicate webhook returns 200 (idempotent)', dupRes.status === 200);
  const txCount = await prisma.transaction.count({ where: { stripeCheckoutSessionId: testSessionId } });
  check('only 1 transaction row recorded', txCount === 1);

  // ── 6. Analytics endpoint ───────────────────────────────────────────────────
  console.log('\n6. Affiliate analytics');
  const clickRes = await fetch(`${SERVER}/api/analytics/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refCode: 'TESTREF1', country: 'GB' }),
  });
  check('click tracking returns 200', clickRes.status === 200);
  const clickCount = await prisma.click.count({ where: { affiliateLink: { refCode: 'TESTREF1' } } });
  check('click recorded in DB', clickCount >= 1);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Tests: ${pass + fail}  ✓ ${pass}  ✗ ${fail}`);
  if (fail === 0) console.log('✅ ALL TESTS PASSED');
  else console.log(`❌ ${fail} TESTS FAILED`);

  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
