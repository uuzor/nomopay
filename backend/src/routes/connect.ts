import { Router } from 'express';
import type { Request, Response } from 'express';
import { stripe } from '../lib/stripe.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/connect/onboard — initiate Stripe Express onboarding
router.post('/onboard', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  let stripeAccountId = user.stripeAccountId;

  // Create Express account if not already created
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      metadata: { userId: user.id, role: user.role },
    });
    stripeAccountId = account.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId },
    });
  }

  // Generate a fresh Account Link for the onboarding flow
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${frontendUrl}/dashboard/settings?onboarding=refresh`,
    return_url: `${frontendUrl}/dashboard/settings?onboarding=complete`,
    type: 'account_onboarding',
  });

  res.json({ url: accountLink.url });
});

// GET /api/connect/status — check onboarding status and sync with Stripe
router.get('/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;

  if (!user.stripeAccountId) {
    res.json({ onboardingComplete: false, chargesEnabled: false, payoutsEnabled: false });
    return;
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  const onboardingComplete = !!(account.charges_enabled && account.payouts_enabled);

  // Sync status back to DB if it changed
  if (onboardingComplete !== user.stripeOnboardingComplete) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeOnboardingComplete: onboardingComplete },
    });
  }

  res.json({
    onboardingComplete,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    stripeAccountId: user.stripeAccountId,
  });
});

export default router;
