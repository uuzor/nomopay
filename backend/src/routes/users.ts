import { Router } from 'express';
import { z } from 'zod';
import { createClerkClient } from '@clerk/backend';
import { prisma } from '../lib/prisma.js';
import type { Request, Response } from 'express';

const router = Router();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const RegisterSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['merchant', 'affiliate', 'both']),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  referredBySlug: z.string().optional(),
});

// POST /api/users/register — called after Clerk sign-up to create DB record
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { clerkId, email, name, role, slug, referredBySlug } = parsed.data;

  // Verify the clerkId is a real Clerk user
  try {
    await clerk.users.getUser(clerkId);
  } catch {
    res.status(400).json({ error: 'Invalid Clerk user ID' });
    return;
  }

  const slugTaken = await prisma.user.findUnique({ where: { slug } });
  if (slugTaken) {
    res.status(409).json({ error: 'Slug already taken', code: 'SLUG_TAKEN' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) {
    res.status(409).json({ error: 'User already registered' });
    return;
  }

  const user = await prisma.user.create({
    data: { clerkId, email, name, role, slug, referredBySlug: referredBySlug || null },
  });

  res.status(201).json({ user });
});

// GET /api/users/me — returns authenticated user's profile
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authReq = req as import('../middleware/auth.js').AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: authReq.user });
});

// GET /api/users/by-slug/:slug — public, returns name + slug for referral page
router.get('/by-slug/:slug', async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { slug: req.params.slug },
    select: { name: true, slug: true, role: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

export default router;
