/**
 * Creates real Stripe Express test accounts for merchant and affiliate,
 * updates the DB records, then runs the full split test.
 */
import 'dotenv/config';
import crypto from 'crypto';
import { prisma } from './lib/prisma.js';
import { stripe, PLATFORM_FEE_RATE } from './lib/stripe.js';

const SERVER_URL = 'http://localhost:8080';

async function createOrGetTestAccount(label: string, existingId: string | null) {
  if (existingId && existingId !== `acct_${label.toLowerCase()}_test`) {
    // Already has a real account ID
    try {
      await stripe.accounts.retrieve(existingId);
      console.log(`  ✓ ${label} account exists: ${existingId}`);
      return existingId;
    } catch {
      // Account doesn't exist, create new
    }
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: `${label.toLowerCase()}@test.com`,
    capabilities: { transfers: { requested: true } },
    settings: { payouts: { schedule: { interval: 'manual' } } },
  });
  console.log(`  ✓ Created ${label} Express account: ${account.id}`);
  return account.id;
}

async function run() {
  console.log('\n=== SplitLink Full Payment Split Test ===\n');

  const product = await prisma.product.findUnique({
    where: { slug: 'handmade-leather-tote' },
    include: { merchant: true },
  });
  const link = await prisma.affiliateLink.findUnique({
    where: { refCode: 'TESTREF1' },
    include: { affiliate: true },
  });

  if (!product || !link) throw new Error('Run seed.ts first');
  const affiliate = (link as any).affiliate;

  // --- Create real Stripe Express test accounts ---
  console.log('Setting up Stripe Express test accounts...');
  const merchantAccountId = await createOrGetTestAccount('Merchant', product.merchant.stripeAccountId);
  const affiliateAccountId = await createOrGetTestAccount('Affiliate', affiliate.stripeAccountId);

  // Update DB with real account IDs
  await prisma.user.update({ where: { id: product.merchant.id }, data: { stripeAccountId: merchantAccountId } });
  await prisma.user.update({ where: { id: affiliate.id }, data: { stripeAccountId: affiliateAccountId } });
  console.log('  ✓ DB updated with real Stripe account IDs\n');

  // --- Create Stripe Checkout session ---
  console.log('Creating Stripe Checkout session...');
  const sessionRes = await fetch(`${SERVER_URL}/api/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id, refCode: link.refCode }),
  });
  const { url: checkoutUrl } = await sessionRes.json() as { url: string };
  const sessionId = checkoutUrl?.match(/pay\/(cs_test_[^#]+)/)?.[1]?.split('#')[0];
  if (!sessionId) throw new Error('No session ID');
  console.log(`  ✓ Session: ${sessionId}`);

  // Create a PaymentIntent separately so we have a real PI with transfer_group
  const pi = await stripe.paymentIntents.create({
    amount: product.price,
    currency: product.currency,
    transfer_group: `product_${product.id}_test`,
    confirm: true,
    payment_method: 'pm_card_visa',    // Stripe test card
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { productId: product.id, refCode: link.refCode },
  });
  console.log(`  ✓ PaymentIntent: ${pi.id} (${pi.status})\n`);

  // --- Build signed webhook payload ---
  const gross = product.price;
  const platformFee = Math.round(gross * PLATFORM_FEE_RATE);
  const affiliateCommission = Math.round(gross * (Number(product.commissionRate) / 100));
  const merchantPayout = gross - platformFee - affiliateCommission;

  console.log('Fee breakdown:');
  console.log(`  Buyer pays:          $${(gross / 100).toFixed(2)}`);
  console.log(`  Platform fee  (2%): -$${(platformFee / 100).toFixed(2)}`);
  console.log(`  Affiliate    (15%): -$${(affiliateCommission / 100).toFixed(2)}`);
  console.log(`  Merchant receives:   $${(merchantPayout / 100).toFixed(2)}\n`);

  const webhookPayload = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2025-02-24.acacia',
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        payment_intent: pi.id,
        payment_status: 'paid',
        amount_total: gross,
        currency: product.currency,
        client_reference_id: `${link.refCode}:${product.id}`,
        customer_details: { email: 'testbuyer@example.com' },
        metadata: {},
      },
    },
  };

  const body = JSON.stringify(webhookPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  // --- Send webhook ---
  console.log('Firing webhook...');
  const whRes = await fetch(`${SERVER_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': `t=${timestamp},v1=${signature}`,
    },
    body,
  });
  const whBody = await whRes.text();
  console.log(`  Webhook response: ${whRes.status} ${whBody}`);

  if (whRes.status !== 200) {
    console.error('\n❌ Webhook returned error. Backend logs:');
    const logs = await import('fs').then(fs => fs.promises.readFile('/tmp/backend.log', 'utf8').catch(() => ''));
    console.error(logs.slice(-2000));
    process.exit(1);
  }

  // --- Verify transaction ---
  await new Promise(r => setTimeout(r, 800));
  const tx = await prisma.transaction.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
  });

  if (!tx) {
    console.error('\n❌ Transaction not recorded in DB');
    process.exit(1);
  }

  // Verify Stripe transfers actually exist
  const merchantTransfer = tx.merchantTransferId
    ? await stripe.transfers.retrieve(tx.merchantTransferId).catch(() => null)
    : null;
  const affiliateTransfer = tx.affiliateTransferId
    ? await stripe.transfers.retrieve(tx.affiliateTransferId).catch(() => null)
    : null;

  console.log('\n=== Results ===');
  console.log(`Transaction ID:      ${tx.id}`);
  console.log(`Status:              ${tx.status}`);
  console.log(`Gross:               $${(tx.grossAmount / 100).toFixed(2)}`);
  console.log(`Platform fee:        $${(tx.platformFee / 100).toFixed(2)} ${tx.platformFee === platformFee ? '✓' : '❌'}`);
  console.log(`Affiliate commission:$${(tx.affiliateCommission / 100).toFixed(2)} ${tx.affiliateCommission === affiliateCommission ? '✓' : '❌'}`);
  console.log(`Merchant payout:     $${(tx.merchantPayout / 100).toFixed(2)} ${tx.merchantPayout === merchantPayout ? '✓' : '❌'}`);
  console.log(`Merchant transfer:   ${tx.merchantTransferId ?? 'none'} ${merchantTransfer ? `($${(merchantTransfer.amount / 100).toFixed(2)} → ${merchantTransfer.destination}) ✓` : ''}`);
  console.log(`Affiliate transfer:  ${tx.affiliateTransferId ?? 'none'} ${affiliateTransfer ? `($${(affiliateTransfer.amount / 100).toFixed(2)} → ${affiliateTransfer.destination}) ✓` : ''}`);

  const passed = tx.status === 'paid' && tx.platformFee === platformFee &&
    tx.affiliateCommission === affiliateCommission && tx.merchantPayout === merchantPayout;

  console.log(`\n${passed ? '✅ PAYMENT SPLIT TEST PASSED' : '❌ TEST FAILED — see mismatches above'}`);

  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
