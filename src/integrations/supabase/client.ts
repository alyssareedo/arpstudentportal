// Supabase client. Configure via environment variables in .env:
//   VITE_SUPABASE_URL              - project URL (https://<ref>.supabase.co)
//   VITE_SUPABASE_PUBLISHABLE_KEY  - anon / publishable key
//   VITE_SUPABASE_PROJECT_ID       - project ref (optional, for display only)
//
// VITE_SUPABASE_ANON_KEY is also accepted as an alias for the publishable key.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file. See .env.example and MIGRATION_GUIDE.md.'
  );
}

// Usage:
//   import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  },
});
