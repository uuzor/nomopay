import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    email: string;
    name: string;
    role: string;
    stripeAccountId: string | null;
    stripeOnboardingComplete: boolean;
    slug: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    const { sub: clerkId } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      res.status(401).json({ error: 'User not found — complete registration first' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireOnboarding(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.stripeOnboardingComplete) {
    res.status(403).json({
      error: 'Stripe onboarding required',
      code: 'ONBOARDING_INCOMPLETE',
    });
    return;
  }
  next();
}
