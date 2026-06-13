import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { stripe, PLATFORM_FEE_RATE } from '../lib/stripe.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

const CreateSessionSchema = z.object({
  productId: z.string(),
  refCode: z.string().optional(),
});

// POST /api/checkout/create-session
// Called when buyer clicks "Buy Now" — no auth required
router.post('/create-session', async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { productId, refCode } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      merchant: {
        select: { stripeAccountId: true, stripeOnboardingComplete: true },
      },
    },
  });

  if (!product || product.status !== 'active') {
    res.status(404).json({ error: 'Product not found or unavailable' });
    return;
  }

  if (!product.merchant.stripeOnboardingComplete || !product.merchant.stripeAccountId) {
    res.status(400).json({ error: 'Merchant payment account not ready' });
    return;
  }

  // Validate refCode exists if provided
  if (refCode) {
    const affiliateLink = await prisma.affiliateLink.findUnique({ where: { refCode } });
    if (!affiliateLink) {
      // Invalid ref — proceed as direct sale rather than error
      parsed.data.refCode = undefined;
    }
  }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const transferGroup = `product_${product.id}_${Date.now()}`;

  // client_reference_id encodes both refCode and productId for the webhook
  const clientReferenceId = refCode ? `${refCode}:${product.id}` : `direct:${product.id}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.title,
            description: product.description,
            ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
          },
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      transfer_group: transferGroup,
      metadata: {
        productId: product.id,
        merchantId: product.merchantId,
        refCode: refCode ?? 'direct',
        transferGroup,
      },
    },
    client_reference_id: clientReferenceId,
    success_url: `${frontendUrl}/p/${product.slug}?success=1`,
    cancel_url: `${frontendUrl}/p/${product.slug}?cancelled=1`,
    customer_creation: 'always',
  });

  // Log the click — associate checkout session with refCode for attribution
  if (refCode) {
    const affiliateLink = await prisma.affiliateLink.findUnique({ where: { refCode } });
    if (affiliateLink) {
      await prisma.click.create({
        data: {
          affiliateLinkId: affiliateLink.id,
          userAgent: req.headers['user-agent'] ?? null,
          country: (req.headers['cf-ipcountry'] as string) ?? null,
        },
      });
    }
  }

  res.json({ url: session.url });
});

export default router;
