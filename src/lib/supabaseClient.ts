// lib/supabaseClient.ts  (hoặc src/lib/supabaseClient.ts)
'use client';  // Optional, nhưng tốt để rõ ràng

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars for client');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Optional: authFlowType: 'pkce' nếu cần, nhưng default ok
});