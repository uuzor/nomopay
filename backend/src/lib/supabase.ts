import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL is required');

// Service role client — used server-side only for storage uploads
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey ?? '', // falls back gracefully if not yet set
  { auth: { persistSession: false } }
);

export const STORAGE_BUCKET = 'product-images';
