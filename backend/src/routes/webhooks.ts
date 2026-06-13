import { Router } from 'express';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, PLATFORM_FEE_RATE } from '../lib/stripe.js';
import { prisma } from '../lib/prisma.js';
import { sendSaleNotification, sendCommissionNotification } from '../lib/email.js';

const router = Router();

// POST /api/webhooks/stripe
// Raw body required for signature verification — do NOT use JSON middleware on this route
router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).json({ error: 'Missing webhook signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch {
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      default:
        // Unhandled event — still return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err);
    // Return 500 only for unexpected errors so Stripe will retry
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
  }

  res.json({ received: true });
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== 'paid') return;

  const clientRefId = session.client_reference_id;
  if (!clientRefId) {
    console.warn('[webhook] checkout.session.completed missing client_reference_id:', session.id);
    return;
  }

  // Idempotency: skip if we already processed this session
  const existing = await prisma.transaction.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (existing) return;

  const [refCode, productId] = clientRefId.split(':');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      merchant: { select: { id: true, email: true, name: true, stripeAccountId: true } },
    },
  });

  if (!product) {
    console.error('[webhook] Product not found for session:', session.id, productId);
    return;
  }

  const gross = session.amount_total ?? 0;
  const platformFee = Math.round(gross * PLATFORM_FEE_RATE);
  const affiliateCommission = Math.round(gross * (Number(product.commissionRate) / 100));
  const merchantPayout = gross - platformFee - affiliateCommission;

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  const transferGroup = (session.payment_intent as Stripe.PaymentIntent | null)?.transfer_group
    ?? `session_${session.id}`;

  let affiliateLink: Awaited<ReturnType<typeof prisma.affiliateLink.findUnique>> | null = null;
  let affiliate: { id: string; email: string; name: string; stripeAccountId: string | null } | null = null;

  if (refCode !== 'direct') {
    affiliateLink = await prisma.affiliateLink.findUnique({
      where: { refCode },
      include: {
        affiliate: { select: { id: true, email: true, name: true, stripeAccountId: true } },
      },
    });
    affiliate = (affiliateLink as any)?.affiliate ?? null;
  }

  // Execute transfers in parallel (both fail-safe via idempotency keys)
  const idempotencyBase = paymentIntentId;
  let merchantTransferId: string | null = null;
  let affiliateTransferId: string | null = null;

  if (product.merchant.stripeAccountId) {
    try {
      const merchantTransfer = await stripe.transfers.create(
        {
          amount: merchantPayout,
          currency: product.currency,
          destination: product.merchant.stripeAccountId,
          transfer_group: transferGroup,
          metadata: { type: 'merchant_payout', paymentIntentId },
        },
        { idempotencyKey: `merchant_${idempotencyBase}` }
      );
      merchantTransferId = merchantTransfer.id;
    } catch (err) {
      // Transfer failure — log for manual resolution (e.g. Connect not enabled, account suspended)
      console.error('[webhook] Merchant transfer failed (manual resolution needed):', paymentIntentId, err);
    }
  }

  if (affiliate?.stripeAccountId && affiliateCommission > 0) {
    try {
      const affiliateTransfer = await stripe.transfers.create(
        {
          amount: affiliateCommission,
          currency: product.currency,
          destination: affiliate.stripeAccountId,
          transfer_group: transferGroup,
          metadata: { type: 'affiliate_commission', paymentIntentId },
        },
        { idempotencyKey: `affiliate_${idempotencyBase}` }
      );
      affiliateTransferId = affiliateTransfer.id;
    } catch (err) {
      // Transfer failure — log for manual resolution
      console.error('[webhook] Affiliate transfer failed (manual resolution needed):', paymentIntentId, err);
    }
  }

  // Record the transaction
  await prisma.transaction.create({
    data: {
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: session.id,
      productId: product.id,
      merchantId: product.merchant.id,
      affiliateId: affiliate?.id ?? null,
      affiliateLinkId: affiliateLink?.id ?? null,
      grossAmount: gross,
      platformFee,
      merchantPayout,
      affiliateCommission,
      currency: product.currency,
      status: 'paid',
      buyerEmail: session.customer_details?.email ?? null,
      merchantTransferId,
      affiliateTransferId,
      transferGroup,
    },
  });

  // Send notifications (fire-and-forget — don't fail the webhook on email error)
  sendSaleNotification({
    merchantEmail: product.merchant.email,
    merchantName: product.merchant.name,
    productTitle: product.title,
    grossAmount: gross,
    merchantPayout,
    currency: product.currency,
    buyerEmail: session.customer_details?.email ?? undefined,
  }).catch((err) => console.error('[webhook] Sale notification failed:', err));

  if (affiliate && affiliateCommission > 0) {
    sendCommissionNotification({
      affiliateEmail: affiliate.email,
      affiliateName: affiliate.name,
      productTitle: product.title,
      commissionAmount: affiliateCommission,
      currency: product.currency,
    }).catch((err) => console.error('[webhook] Commission notification failed:', err));
  }
}

async function handleRefund(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : (charge.payment_intent?.id ?? null);

  if (!paymentIntentId) return;

  const transaction = await prisma.transaction.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!transaction || transaction.status === 'refunded') return;

  // Reverse merchant transfer
  if (transaction.merchantTransferId) {
    try {
      await stripe.transfers.createReversal(transaction.merchantTransferId, {
        metadata: { reason: 'customer_refund', paymentIntentId },
      });
    } catch (err) {
      console.error('[webhook] Merchant transfer reversal failed:', transaction.merchantTransferId, err);
    }
  }

  // Reverse affiliate transfer
  if (transaction.affiliateTransferId) {
    try {
      await stripe.transfers.createReversal(transaction.affiliateTransferId, {
        metadata: { reason: 'customer_refund', paymentIntentId },
      });
    } catch (err) {
      // Affiliate may have already withdrawn — log for manual resolution
      console.error('[webhook] Affiliate transfer reversal failed (manual resolution needed):', transaction.affiliateTransferId, err);
    }
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: 'refunded' },
  });
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { stripeAccountId: account.id },
  });
  if (!user) return;

  // A connected account can be restricted by Stripe after initial onboarding
  // (failed re-verification, suspicious activity, etc.). Keep our DB in sync
  // so we don't try to transfer to a disabled account.
  const onboardingComplete = !!(account.charges_enabled && account.payouts_enabled);

  if (onboardingComplete !== user.stripeOnboardingComplete) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeOnboardingComplete: onboardingComplete },
    });
    console.log(
      `[webhook] account.updated: ${account.id} → onboardingComplete=${onboardingComplete}` +
      ` (charges=${account.charges_enabled}, payouts=${account.payouts_enabled})`
    );
  }
}

export default router;
