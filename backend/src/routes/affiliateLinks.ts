import { Router } from 'express';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireOnboarding } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const generateRefCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const CreateLinkSchema = z.object({
  productId: z.string(),
  customLabel: z.string().max(100).optional(),
});

// GET /api/affiliate-links — list affiliate's links with click/conversion stats
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = typeof req.query.limit === 'string' ? req.query.limit : '20';
  const pageSize = Math.min(parseInt(limit, 10) || 20, 100);

  const links = await prisma.affiliateLink.findMany({
    where: { affiliateId: user.id },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          commissionRate: true,
          currency: true,
          status: true,
          merchant: { select: { name: true } },
        },
      },
      _count: { select: { clicks: true, transactions: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  res.json({ links, nextCursor: links.length === pageSize ? links.at(-1)?.id : null });
});

// GET /api/affiliate-links/:id — single link with detailed analytics
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;

  const link = await prisma.affiliateLink.findUnique({
    where: { id: String(req.params.id) },
    include: {
      product: {
        select: {
          title: true,
          slug: true,
          price: true,
          commissionRate: true,
          currency: true,
        },
      },
      _count: { select: { clicks: true } },
      transactions: {
        select: {
          id: true,
          grossAmount: true,
          affiliateCommission: true,
          currency: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!link) {
    res.status(404).json({ error: 'Link not found' });
    return;
  }
  if (link.affiliateId !== user.id) {
    res.status(403).json({ error: 'Not your link' });
    return;
  }

  const totalEarned = link.transactions
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + t.affiliateCommission, 0);

  const conversionRate =
    link._count.clicks > 0
      ? ((link.transactions.length / link._count.clicks) * 100).toFixed(1)
      : '0.0';

  res.json({ link, totalEarned, conversionRate });
});

// POST /api/affiliate-links — generate a tracked link for a product
router.post(
  '/',
  requireAuth,
  requireOnboarding,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user!;

    const parsed = CreateLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      include: { merchant: { select: { id: true } } },
    });

    if (!product || product.status !== 'active') {
      res.status(404).json({ error: 'Product not found or unavailable' });
      return;
    }

    // Prevent self-referral: merchant cannot be their own affiliate
    if (product.merchantId === user.id) {
      res.status(400).json({ error: 'Cannot create affiliate link for your own product' });
      return;
    }

    // Return existing link if already generated for this product
    const existing = await prisma.affiliateLink.findFirst({
      where: { productId: product.id, affiliateId: user.id },
    });
    if (existing) {
      const url = buildAffiliateUrl(product.slug, existing.refCode);
      res.json({ link: existing, url });
      return;
    }

    let refCode: string;
    let attempts = 0;
    do {
      refCode = generateRefCode();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique ref code');
    } while (await prisma.affiliateLink.findUnique({ where: { refCode } }));

    const link = await prisma.affiliateLink.create({
      data: {
        productId: product.id,
        affiliateId: user.id,
        refCode,
        customLabel: parsed.data.customLabel,
      },
    });

    const url = buildAffiliateUrl(product.slug, refCode);
    res.status(201).json({ link, url });
  }
);

function buildAffiliateUrl(productSlug: string, refCode: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  return `${base}/p/${productSlug}?ref=${refCode}`;
}

export default router;
