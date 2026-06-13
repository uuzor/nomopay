import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL is required');

// Service role client — used server-side only for storage uploads.
// ws is required on Node < 22 which lacks native WebSocket support.
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey ?? '',
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

export const STORAGE_BUCKET = 'product-images';
