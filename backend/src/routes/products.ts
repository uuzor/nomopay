import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireOnboarding } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { PLATFORM_FEE_RATE } from '../lib/stripe.js';

const router = Router();

const CreateProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  price: z.number().int().min(100), // minimum $1.00 in cents
  currency: z.enum(['usd', 'eur']).default('usd'),
  commissionRate: z.number().min(0).max(80), // 0–80%
  imageUrl: z.string().url().optional(),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const UpdateProductSchema = CreateProductSchema.partial().extend({
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

// GET /api/products — list products (merchant sees their own; affiliates see all active)
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = typeof req.query.limit === 'string' ? req.query.limit : '20';

  const pageSize = Math.min(parseInt(limit, 10) || 20, 100);

  if (user.role === 'affiliate') {
    // Affiliates browse the marketplace — all active products
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        merchant: { select: { name: true, slug: true } },
        _count: { select: { affiliateLinks: true, transactions: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    res.json({ products, nextCursor: products.length === pageSize ? products.at(-1)?.id : null });
    return;
  }

  // Merchants see their own products
  const products = await prisma.product.findMany({
    where: {
      merchantId: user.id,
      ...(status ? { status: status as 'active' | 'paused' | 'archived' } : {}),
    },
    include: {
      _count: { select: { affiliateLinks: true, transactions: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  res.json({ products, nextCursor: products.length === pageSize ? products.at(-1)?.id : null });
});

// GET /api/products/:id — get single product (public details + fee breakdown)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
    include: { merchant: { select: { name: true, slug: true } } },
  });

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const feeBreakdown = computeFeeBreakdown(product.price, Number(product.commissionRate));

  res.json({ product, feeBreakdown });
});

// GET /api/products/by-slug/:slug — get product by slug (used on buyer-facing page)
router.get('/by-slug/:slug', async (req: Request, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { slug: String(req.params.slug) },
    include: { merchant: { select: { name: true, slug: true } } },
  });

  if (!product || product.status !== 'active') {
    res.status(404).json({ error: 'Product not found or unavailable' });
    return;
  }

  res.json({ product });
});

// POST /api/products — create product
router.post(
  '/',
  requireAuth,
  requireOnboarding,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user!;

    if (user.role === 'affiliate') {
      res.status(403).json({ error: 'Affiliates cannot create products' });
      return;
    }

    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const slugTaken = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
    if (slugTaken) {
      res.status(409).json({ error: 'Slug already in use', code: 'SLUG_TAKEN' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        merchantId: user.id,
        commissionRate: parsed.data.commissionRate,
      },
    });

    const feeBreakdown = computeFeeBreakdown(product.price, Number(product.commissionRate));
    res.status(201).json({ product, feeBreakdown });
  }
);

// PATCH /api/products/:id — update product
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;

  const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  if (product.merchantId !== user.id) {
    res.status(403).json({ error: 'Not your product' });
    return;
  }

  const parsed = UpdateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (parsed.data.slug && parsed.data.slug !== product.slug) {
    const slugTaken = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
    if (slugTaken) {
      res.status(409).json({ error: 'Slug already in use', code: 'SLUG_TAKEN' });
      return;
    }
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: parsed.data,
  });

  res.json({ product: updated });
});

// DELETE /api/products/:id — soft-delete (archive)
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;

  const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  if (product.merchantId !== user.id) {
    res.status(403).json({ error: 'Not your product' });
    return;
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { status: 'archived' },
  });

  res.json({ message: 'Product archived' });
});

function computeFeeBreakdown(priceInCents: number, commissionRate: number) {
  const gross = priceInCents;
  const platformFee = Math.round(gross * PLATFORM_FEE_RATE);
  const affiliateCommission = Math.round(gross * (commissionRate / 100));
  const merchantPayout = gross - platformFee - affiliateCommission;

  return {
    gross,
    platformFee,
    affiliateCommission,
    merchantPayout,
    platformFeeRate: PLATFORM_FEE_RATE,
    commissionRate,
  };
}

export default router;
