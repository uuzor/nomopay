import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { supabaseAdmin, STORAGE_BUCKET } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const PresignSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
});

// POST /api/uploads/presign — returns a signed upload URL for product images
// Client uploads directly to Supabase Storage, never through this server
router.post('/presign', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user!;

  const parsed = PresignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const ext = parsed.data.contentType.split('/')[1];
  const path = `${user.id}/${Date.now()}.${ext}`;

  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Storage not configured' });
    return;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    console.error('[uploads] Supabase presign error:', error);
    res.status(500).json({ error: 'Could not generate upload URL' });
    return;
  }

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

  res.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl,
  });
});

export default router;
